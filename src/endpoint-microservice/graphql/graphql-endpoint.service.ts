import { ApolloServer } from '@apollo/server';
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

  private readonly endpointMap = new Map<
    string,
    {
      middleware: RequestHandler;
      apollo: ApolloServer;
      endpointId: string;
      table?: string;
    }
  >();

  private startedEndpointIds: string[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
    private readonly graphqlMetricsPlugin: GraphqlMetricsPlugin,
  ) {}

  public getEndpoint(
    organizationId: string,
    projectName: string,
    branchName: string,
    postfix: string,
  ) {
    const url = this.buildUrl(organizationId, projectName, branchName, postfix);
    return this.endpointMap.get(url);
  }

  public existEndpoint(endpointId: string): boolean {
    return this.startedEndpointIds.includes(endpointId);
  }

  public async stopEndpoint(endpointId: string): Promise<void> {
    if (!this.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} is not started`);
    }

    const [url, entry] =
      [...this.endpointMap.entries()].find(
        ([, value]) => value.endpointId === endpointId,
      ) ?? [];

    if (entry) {
      await entry.apollo.stop();
      this.endpointMap.delete(url);
      this.startedEndpointIds = this.startedEndpointIds.filter(
        (id) => id !== endpointId,
      );
      this.logger.log(`stopped endpoint name=${url} endpointId=${endpointId}`);
    }
  }

  public async runEndpoint(endpointId: string): Promise<void> {
    if (this.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} already started`);
    }

    const dbEndpoint = await this.fetchDbEndpoint(endpointId);
    const {
      revision: { branch, ...revision },
    } = dbEndpoint;

    const url = this.getEndpointRouteKey(revision, branch.project, branch.name);

    const { apollo, table } = await this.createApolloServerWithSchema({
      projectId: branch.projectId,
      projectName: branch.project.name,
      endpointId,
      isDraft: revision.isDraft,
      revisionId: revision.id,
    });

    this.endpointMap.set(url, {
      middleware: this.createMiddleware(apollo),
      apollo,
      table,
      endpointId,
    });

    this.startedEndpointIds.push(endpointId);
    this.logger.log(`started endpoint name=${url} endpointId=${endpointId}`);
  }

  private async createApolloServerWithSchema(options: {
    projectId: string;
    projectName: string;
    endpointId: string;
    isDraft: boolean;
    revisionId: string;
  }): Promise<{ apollo: ApolloServer; table: string }> {
    const { schema, defaultTable } =
      await this.getSchemaAndDefaultTable(options);
    const apollo = await this.buildApolloServer(schema);
    return { apollo, table: defaultTable };
  }

  private async getSchemaAndDefaultTable(options: {
    projectId: string;
    projectName: string;
    endpointId: string;
    isDraft: boolean;
    revisionId: string;
  }): Promise<{ schema: GraphQLSchema; defaultTable: string }> {
    const schema = await this.queryBus.execute<
      GetGraphqlSchemaQuery,
      GraphQLSchema
    >(new GetGraphqlSchemaQuery(options));

    const fields = Object.keys(schema.getQueryType().getFields()).filter(
      (name) => name !== '_service',
    );

    const defaultTable = fields[2] ?? 'Table';
    return { schema, defaultTable };
  }

  private async buildApolloServer(
    schema: GraphQLSchema,
  ): Promise<ApolloServer> {
    const apollo = new ApolloServer({
      schema,
      introspection: true,
      plugins: [this.graphqlMetricsPlugin],
      formatError: (error) => {
        if (error.extensions?.stacktrace) {
          error.extensions.stacktrace = [];
        }
        return error;
      },
    });

    await apollo.start();
    return apollo;
  }

  private createMiddleware(apollo: ApolloServer): RequestHandler {
    return expressMiddleware(apollo, {
      context: async ({ req }) => ({
        headers: parseHeaders(req.headers),
      }),
    });
  }

  private getEndpointRouteKey(
    revision: { id: string; isHead: boolean; isDraft: boolean },
    project: { name: string; organizationId: string },
    branchName: string,
  ): string {
    const postfix = this.getRevisionPostfix(revision);
    return this.buildUrl(
      project.organizationId,
      project.name,
      branchName,
      postfix,
    );
  }

  private getRevisionPostfix(revision: {
    id: string;
    isHead: boolean;
    isDraft: boolean;
  }): string | undefined {
    if (revision.isHead) return 'head';
    if (revision.isDraft) return 'draft';
    return revision.id;
  }

  private buildUrl(
    organizationId: string,
    projectName: string,
    branchName: string,
    postfix: string,
  ): string {
    return `${organizationId}/${projectName}/${branchName}/${postfix}`;
  }

  private fetchDbEndpoint(endpointId: string) {
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
