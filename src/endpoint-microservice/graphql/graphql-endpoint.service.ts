import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@apollo/server/express4';
import { Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { RequestHandler } from 'express';
import { GraphQLSchema } from 'graphql/type';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { GetGraphqlSchemaQuery } from 'src/endpoint-microservice/graphql/queries/impl';
import { GraphqlMetricsPlugin } from 'src/endpoint-microservice/metrics/graphql/graphql-metrics.plugin';
import { parseHeaders } from 'src/endpoint-microservice/shared/utils/parseHeaders';

@Injectable()
export class GraphqlEndpointService {
  private readonly logger = new Logger(GraphqlEndpointService.name);

  private map = new Map<
    string,
    { middleware: RequestHandler; apollo: ApolloServer; endpointId: string }
  >();
  private startedEndpointIds: string[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly graphqlMetricsPlugin: GraphqlMetricsPlugin,
  ) {}

  public getEndpointMiddleware(
    organizationId: string,
    projectName: string,
    branchName: string,
    postfix: string,
  ) {
    const item = this.map.get(
      this.getUrl(organizationId, projectName, branchName, postfix),
    );
    return item?.middleware;
  }

  public existEndpoint(endpointId: string) {
    return this.startedEndpointIds.includes(endpointId);
  }

  public async stopEndpoint(endpointId: string) {
    if (!this.startedEndpointIds.includes(endpointId)) {
      throw new Error(`${endpointId} is not started`);
    }

    // TODO
    const [url, item] = [...this.map.entries()].find(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, mapValue]) => mapValue.endpointId === endpointId,
    );

    if (item) {
      await item.apollo.stop();
      this.map.delete(url);
    }

    this.startedEndpointIds = this.startedEndpointIds.filter(
      (id) => id !== endpointId,
    );

    this.logger.log(`stopped endpoint name=${url} endpointId=${endpointId}`);
  }

  public async runEndpoint(endpointId: string) {
    if (this.startedEndpointIds.includes(endpointId)) {
      throw new Error(`${endpointId} already started`);
    }

    const dbEndpoint = await this.getDbEndpoint(endpointId);
    const {
      revision: { branch, ...revision },
    } = dbEndpoint;

    const url = this.getUrl(
      branch.project.organizationId,
      branch.project.name,
      branch.name,
      this.getPostfix(revision),
    );
    const apollo = await this._run(revision.id);

    this.startedEndpointIds.push(endpointId);
    this.map.set(url, {
      middleware: expressMiddleware(apollo, {
        context: async ({ req }) => {
          return { headers: parseHeaders(req.headers) };
        },
      }),
      apollo,
      endpointId,
    });

    this.logger.log(`started endpoint name=${url} endpointId=${endpointId}`);
  }

  private async _run(revisionId: string) {
    const graphqlSchema = await this.queryBus.execute<
      GetGraphqlSchemaQuery,
      GraphQLSchema
    >(
      new GetGraphqlSchemaQuery({
        revisionId,
      }),
    );

    const tables: string[] = Object.keys(
      graphqlSchema.getQueryType().getFields(),
    ).filter((field) => field !== '_service');

    const table = tables[0] || 'Table';

    const server = new ApolloServer({
      schema: graphqlSchema,
      introspection: true,
      formatError: (error) => {
        if (error.extensions?.stacktrace) {
          error.extensions.stacktrace = [];
        }
        return error;
      },
      plugins: [
        this.graphqlMetricsPlugin,
        ApolloServerPluginLandingPageLocalDefault({
          document: `query ExampleQuery {
  ${table} {
    edges {
      node {
        id
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasPreviousPage
      hasNextPage
    }
    totalCount
  }
}
        `,
        }),
      ],
    });

    await server.start();
    return server;
  }

  private getPostfix(revision: {
    id: string;
    isHead: boolean;
    isDraft: boolean;
  }): string | undefined {
    if (revision.isHead) {
      return 'head';
    }

    if (revision.isDraft) {
      return 'draft';
    }

    return revision.id;
  }

  private getUrl(
    organizationId: string,
    projectName: string,
    branchName: string,
    postfix: string,
  ): string {
    return `${organizationId}/${projectName}/${branchName}/${postfix}`;
  }

  private getDbEndpoint(endpointId: string) {
    return this.prisma.endpoint.findUniqueOrThrow({
      where: { id: endpointId },
      include: {
        revision: {
          include: {
            branch: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });
  }
}
