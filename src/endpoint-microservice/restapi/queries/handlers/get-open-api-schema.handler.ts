import { HttpException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';
import { JsonSchema } from 'src/endpoint-microservice/shared/types/json-schema';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';

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
      info: {
        version: `${revisionId}`,
        title: '',
      },
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

    for (const schemaRow of schemas) {
      openApiJson.paths[`/${schemaRow.id}`] = {
        get: {
          security: [
            {
              'access-token': [],
            },
          ],
          tags: [schemaRow.id],
          parameters: [
            {
              name: 'first',
              in: 'query',
              required: true,
              schema: {
                type: 'integer',
                minimum: 1,
                default: 100,
              },
            },
            {
              name: 'after',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['edges', 'pageInfo', 'totalCount'],
                    properties: {
                      edges: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['cursor', 'node'],
                          properties: {
                            cursor: { type: 'string' },
                            node: {
                              type: 'object',
                              required: [
                                'id',
                                'versionId',
                                'createdAt',
                                'readonly',
                              ],
                              properties: {
                                id: { type: 'string' },
                                versionId: { type: 'string' },
                                createdAt: { type: 'string' },
                                readonly: { type: 'boolean' },
                              },
                            },
                          },
                        },
                      },
                      pageInfo: {
                        type: 'object',
                        required: [
                          'startCursor',
                          'endCursor',
                          'hasNextPage',
                          'hasPreviousPage',
                        ],
                        properties: {
                          startCursor: { type: 'string' },
                          endCursor: { type: 'string' },
                          hasNextPage: { type: 'boolean' },
                          hasPreviousPage: { type: 'boolean' },
                        },
                      },
                      totalCount: { type: 'number', minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      };

      openApiJson.paths[`/${schemaRow.id}/{id}`] = {
        get: {
          security: [
            {
              'access-token': [],
            },
          ],
          tags: [schemaRow.id],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    $ref: `#/components/schemas/${schemaRow.id}`,
                  },
                },
              },
            },
          },
        },
        ...(isDraftRevision
          ? {
              post: {
                security: [
                  {
                    'access-token': [],
                  },
                ],
                tags: [schemaRow.id],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: {
                      type: 'string',
                    },
                  },
                ],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        $ref: `#/components/schemas/${schemaRow.id}`,
                      },
                    },
                  },
                },
                responses: {
                  '200': {
                    content: {
                      'application/json': {
                        schema: {
                          $ref: `#/components/schemas/${schemaRow.id}`,
                        },
                      },
                    },
                  },
                },
              },
              put: {
                security: [
                  {
                    'access-token': [],
                  },
                ],
                tags: [schemaRow.id],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: {
                      type: 'string',
                    },
                  },
                ],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        $ref: `#/components/schemas/${schemaRow.id}`,
                      },
                    },
                  },
                },
                responses: {
                  '200': {
                    content: {
                      'application/json': {
                        schema: {
                          $ref: `#/components/schemas/${schemaRow.id}`,
                        },
                      },
                    },
                  },
                },
              },
              delete: {
                security: [
                  {
                    'access-token': [],
                  },
                ],
                tags: [schemaRow.id],
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
                responses: {
                  '200': {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'boolean',
                        },
                      },
                    },
                  },
                },
              },
            }
          : {}),
      };

      const { data, error } = await this.internalCoreApi.tableForeignKeysBy({
        revisionId,
        tableId: schemaRow.id,
        first: 100,
      });

      if (error) {
        throw new HttpException(error, error.statusCode);
      }

      const tableForeignKeysBy = data.edges.map((edge) => edge.node);

      for (const tableForeignKeyBy of tableForeignKeysBy) {
        openApiJson.paths[
          `/${schemaRow.id}/{id}/foreign-keys-by/${tableForeignKeyBy.id}`
        ] = {
          get: {
            security: [
              {
                'access-token': [],
              },
            ],
            tags: [schemaRow.id],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: {
                  type: 'string',
                },
              },
              {
                name: 'first',
                in: 'query',
                required: true,
                schema: {
                  type: 'integer',
                  minimum: 1,
                  default: 100,
                },
              },
              {
                name: 'after',
                in: 'query',
                required: false,
                schema: {
                  type: 'string',
                },
              },
            ],
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['edges', 'pageInfo', 'totalCount'],
                      properties: {
                        edges: {
                          type: 'array',
                          items: {
                            type: 'object',
                            required: ['cursor', 'node'],
                            properties: {
                              cursor: { type: 'string' },
                              node: {
                                type: 'object',
                                required: [
                                  'id',
                                  'versionId',
                                  'createdAt',
                                  'readonly',
                                ],
                                properties: {
                                  id: { type: 'string' },
                                  versionId: { type: 'string' },
                                  createdAt: { type: 'string' },
                                  readonly: { type: 'boolean' },
                                },
                              },
                            },
                          },
                        },
                        pageInfo: {
                          type: 'object',
                          required: [
                            'startCursor',
                            'endCursor',
                            'hasNextPage',
                            'hasPreviousPage',
                          ],
                          properties: {
                            startCursor: { type: 'string' },
                            endCursor: { type: 'string' },
                            hasNextPage: { type: 'boolean' },
                            hasPreviousPage: { type: 'boolean' },
                          },
                        },
                        totalCount: { type: 'number', minimum: 0 },
                      },
                    },
                  },
                },
              },
            },
          },
        };
      }

      openApiJson.components.schemas[schemaRow.id] =
        schemaRow.data as JsonSchema;
    }

    return openApiJson;
  }

  private async getIsDraftRevision(revisionId: string) {
    const { data, error } = await this.internalCoreApi.revision(revisionId);

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.isDraft;
  }

  private async getSchemas(revisionId: string) {
    // TODO schema, 1000
    const { error, data } = await this.internalCoreApi.rows({
      revisionId,
      tableId: SystemTables.Schema,
      first: 1000,
    });

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    const nodes = data.edges.map((edge) => edge.node);

    nodes.sort((a, b) => a.id.localeCompare(b.id));

    return nodes;
  }
}
