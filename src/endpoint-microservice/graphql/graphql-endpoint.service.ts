import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { RequestHandler } from 'express';
import { GraphQLSchema } from 'graphql/type';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { GetGraphqlSchemaQuery } from 'src/endpoint-microservice/graphql/queries/impl';
import { GraphqlMetricsPlugin } from 'src/endpoint-microservice/metrics/graphql/graphql-metrics.plugin';
import { parseHeaders } from 'src/endpoint-microservice/shared/utils/parseHeaders';

interface SchemaGenerationContext {
  projectId: string;
  projectName: string;
  endpointId: string;
  isDraft: boolean;
  revisionId: string;
}

interface RevisionContext {
  revision: {
    id: string;
    isHead: boolean;
    isDraft: boolean;
  };
  project: {
    name: string;
    organizationId: string;
  };
  branchName: string;
}

interface RouteKey {
  organizationId: string;
  projectName: string;
  branchName: string;
  postfix: string;
}

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
    private readonly queryBus: QueryBus,
    private readonly graphqlMetricsPlugin: GraphqlMetricsPlugin,
    private readonly internalCoreApi: InternalCoreApiService,
  ) {}

  public getEndpoint(routeKey: RouteKey) {
    const url = this.buildUrl(routeKey);
    return this.endpointMap.get(url);
  }

  public existEndpoint(endpointId: string): boolean {
    return this.startedEndpointIds.includes(endpointId);
  }

  public async stopEndpoint(endpointId: string): Promise<void> {
    if (!this.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} is not started`);
    }

    const [url, endpoint] =
      [...this.endpointMap.entries()].find(
        ([, value]) => value.endpointId === endpointId,
      ) ?? [];

    if (endpoint) {
      await endpoint.apollo.stop();
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

    const { revision, project, branch } =
      await this.fetchDbEndpoint(endpointId);

    const url = this.getEndpointRouteKey({
      revision,
      project,
      branchName: branch.name,
    });

    const { apollo, table } = await this.createApolloServerWithSchema({
      projectId: project.id,
      projectName: project.name,
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

  private async createApolloServerWithSchema(
    context: SchemaGenerationContext,
  ): Promise<{ apollo: ApolloServer; table: string }> {
    const { schema, defaultTable } =
      await this.getSchemaAndDefaultTable(context);
    const apollo = await this.buildApolloServer(schema);
    return { apollo, table: defaultTable };
  }

  private async getSchemaAndDefaultTable(
    context: SchemaGenerationContext,
  ): Promise<{ schema: GraphQLSchema; defaultTable: string }> {
    const schema = await this.queryBus.execute<
      GetGraphqlSchemaQuery,
      GraphQLSchema
    >(new GetGraphqlSchemaQuery(context));

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

  private getEndpointRouteKey(context: RevisionContext): string {
    const postfix = this.getRevisionPostfix(context.revision);
    return this.buildUrl({
      organizationId: context.project.organizationId,
      projectName: context.project.name,
      branchName: context.branchName,
      postfix,
    });
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

  private buildUrl({
    organizationId,
    projectName,
    branchName,
    postfix,
  }: RouteKey): string {
    return `${organizationId}/${projectName}/${branchName}/${postfix}`;
  }

  private async fetchDbEndpoint(endpointId: string) {
    const { data, error } =
      await this.internalCoreApi.api.endpointRelatives(endpointId);

    if (error) {
      this.logger.error(endpointId);
      throw new InternalServerErrorException(error, error.statusCode);
    }

    return data;
  }

  async shutdown() {
    this.logger.log('Shutting down all GraphQL endpoints...');

    const shutdownPromises = Array.from(this.endpointMap.values()).map(
      async (endpoint) => {
        try {
          await endpoint.apollo.stop();
          this.logger.log(
            `Stopped Apollo Server for endpoint ${endpoint.endpointId}`,
          );
        } catch (error) {
          this.logger.error(
            `Error stopping Apollo Server for endpoint ${endpoint.endpointId}:`,
            error,
          );
        }
      },
    );

    await Promise.all(shutdownPromises);

    this.logger.log('All GraphQL endpoints shut down');
  }
}
