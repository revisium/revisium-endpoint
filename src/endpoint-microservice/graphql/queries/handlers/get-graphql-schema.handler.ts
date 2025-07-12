import { HttpException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GraphQLSchema } from 'graphql/type';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { GraphQLSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';
import { GetGraphqlSchemaQuery } from 'src/endpoint-microservice/graphql/queries/impl';
import { GraphQLOptionsService } from 'src/endpoint-microservice/graphql/services/graphql-options.service';
import { JsonSchema } from 'src/endpoint-microservice/shared/schema';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';

const HARDCODED_LIMIT_FOR_TABLES = 1000;

@QueryHandler(GetGraphqlSchemaQuery)
export class GetGraphqlSchemaHandler
  implements IQueryHandler<GetGraphqlSchemaQuery>
{
  public constructor(
    private readonly internalCoreApi: InternalCoreApiService,
    private readonly converter: GraphQLSchemaConverter,
    private readonly optionsService: GraphQLOptionsService,
  ) {}

  public async execute({
    data,
  }: GetGraphqlSchemaQuery): Promise<GraphQLSchema> {
    const tables = await this.getSchemas(data.revisionId);

    return this.converter.convert({
      projectId: data.projectId,
      projectName: data.projectName,
      endpointId: data.endpointId,
      isDraft: data.isDraft,
      revisionId: data.revisionId,
      tables: tables.map((table) => ({
        id: table.id,
        versionId: table.versionId,
        schema: table.data,
      })),
      options: this.optionsService.getOptions(),
    });
  }

  private async getSchemas(revisionId: string) {
    const { data, error } = await this.internalCoreApi.api.rows(
      revisionId,
      SystemTables.Schema,
      {
        first: HARDCODED_LIMIT_FOR_TABLES,
      },
    );

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.edges.map((edge) => ({
      id: edge.node.id,
      versionId: edge.node.versionId,
      data: edge.node.data as JsonSchema,
    }));
  }
}
