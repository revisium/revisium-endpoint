import { HttpException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import {
  resolveRefs,
  JsonSchema,
} from 'src/endpoint-microservice/shared/schema';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';
import {
  createCRUDPaths,
  createGetByIdPath,
  createGetListPath,
  getIdPathParam,
  getPaginatedResponseSchema,
  getPaginationParams,
} from './open-api-shema.utils';

const HARDCODED_LIMIT_FOR_TABLES = 1000;

@QueryHandler(GetOpenApiSchemaQuery)
export class GetOpenApiSchemaHandler
  implements IQueryHandler<GetOpenApiSchemaQuery>
{
  public constructor(
    private readonly internalCoreApi: InternalCoreApiService,
  ) {}

  public execute({ data }: GetOpenApiSchemaQuery): Promise<OpenApiSchema> {
    return this.getOpenApiSchema(data.revisionId);
  }

  private async getOpenApiSchema(revisionId: string) {
    const schemas = await this.getSchemas(revisionId);
    const isDraftRevision = await this.getIsDraftRevision(revisionId);

    const openApiJson: OpenApiSchema = {
      openapi: '3.0.2',
      info: { version: revisionId, title: '' },
      servers: [],
      paths: {},
      components: {
        securitySchemes: {
          'access-token': {
            scheme: 'bearer',
            bearerFormat: 'JWT',
            type: 'http',
          },
        },
        schemas: {},
      },
    };

    if (!openApiJson.paths) {
      openApiJson.paths = {};
    }

    for (const schemaRow of schemas) {
      const schemaId = schemaRow.id;

      openApiJson.paths[`/${schemaId}`] = createGetListPath(schemaId);

      openApiJson.paths[`/${schemaId}/{id}`] = {
        ...createGetByIdPath(schemaId),
        ...(isDraftRevision ? createCRUDPaths(schemaId) : {}),
      };

      const foreignKeys = await this.getForeignKeys(revisionId, schemaId);

      for (const fk of foreignKeys) {
        openApiJson.paths[`/${schemaId}/{id}/foreign-keys-by/${fk.id}`] = {
          get: {
            security: [{ 'access-token': [] }],
            tags: [schemaId],
            parameters: [getIdPathParam(), ...getPaginationParams()],
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: getPaginatedResponseSchema(),
                  },
                },
              },
            },
          },
        };
      }
      if (!openApiJson.components) {
        openApiJson.components = { schemas: {} };
      }
      if (!openApiJson.components.schemas) {
        openApiJson.components.schemas = {};
      }
      openApiJson.components.schemas[schemaRow.id] = resolveRefs(
        schemaRow.data as JsonSchema,
      );
    }

    return openApiJson;
  }

  private async getIsDraftRevision(revisionId: string) {
    const { data, error } = await this.internalCoreApi.api.revision(revisionId);

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.isDraft;
  }

  private async getSchemas(revisionId: string) {
    const { error, data } = await this.internalCoreApi.api.rows(
      revisionId,
      SystemTables.Schema,
      {
        first: HARDCODED_LIMIT_FOR_TABLES,
      },
    );

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.edges
      .map((e) => e.node)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async getForeignKeys(revisionId: string, tableId: string) {
    const { data, error } = await this.internalCoreApi.api.tableForeignKeysBy({
      revisionId,
      tableId,
      first: 100,
    });

    if (error) throw new HttpException(error, error.statusCode);
    return data.edges.map((e) => e.node);
  }
}
