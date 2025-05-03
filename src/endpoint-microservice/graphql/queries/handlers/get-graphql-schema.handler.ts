import { HttpException, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GraphQLError } from 'graphql/error';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql/type';
import { printSchema } from 'graphql/utilities';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { GetGraphqlSchemaQuery } from 'src/endpoint-microservice/graphql/queries/impl';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';
import {
  JsonSchemaObjectType,
  JsonSchemaType,
} from 'src/endpoint-microservice/shared/types/json-schema-type';

export type GetJsonSchemasReturnType = {
  id: string;
  versionId: string;
  data: JsonSchemaType;
}[];

type InputType = { data?: { first?: number; after?: string } };
type ContextType = { headers: Record<string, string> };

const DateTimeType = new GraphQLScalarType({
  name: 'DataTime',
});

const PageInfo = new GraphQLObjectType({
  name: 'PageInfo',
  fields: {
    startCursor: { type: GraphQLString },
    endCursor: { type: GraphQLString },
    hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

const ServiceType = new GraphQLObjectType({
  name: '_Service',
  fields: {
    sdl: { type: GraphQLString },
  },
});

const DEFAULT_FIRST = 100;

@QueryHandler(GetGraphqlSchemaQuery)
export class GetGraphqlSchemaHandler
  implements IQueryHandler<GetGraphqlSchemaQuery>
{
  private readonly logger = new Logger(GetGraphqlSchemaHandler.name);

  public constructor(
    private readonly internalCoreApi: InternalCoreApiService,
    private readonly proxyCoreApi: ProxyCoreApiService,
  ) {}

  public async execute({
    data,
  }: GetGraphqlSchemaQuery): Promise<GraphQLSchema> {
    let cachedSdl: string = undefined;

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          ...(await this.getQueryFields(data)),
          _service: {
            type: ServiceType,
            resolve: () => {
              if (!cachedSdl) {
                cachedSdl = printSchema(schema);
              }

              return { sdl: cachedSdl };
            },
          },
        },
      }),
    });

    return schema;
  }

  private getNodeType(
    data: GetJsonSchemasReturnType[number],
    safetyTableId: string,
  ) {
    return new GraphQLObjectType({
      name: safetyTableId,
      fields: () => ({
        versionId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(DateTimeType) },
        data: {
          type: this.getRootSchema(`Data${safetyTableId}`, data.data),
        },
      }),
    });
  }

  private getEdgeType(
    data: GetJsonSchemasReturnType[number],
    safetyTableId: string,
  ) {
    return new GraphQLObjectType({
      name: `${safetyTableId}Edge`,
      fields: {
        node: {
          type: new GraphQLNonNull(this.getNodeType(data, safetyTableId)),
        },
        cursor: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
  }

  private getTableConnection(
    data: GetJsonSchemasReturnType[number],
    safetyTableId: string,
  ) {
    return new GraphQLObjectType({
      name: `${safetyTableId}Connection`,
      fields: {
        edges: {
          type: new GraphQLNonNull(
            new GraphQLList(
              new GraphQLNonNull(this.getEdgeType(data, safetyTableId)),
            ),
          ),
        },
        pageInfo: { type: new GraphQLNonNull(PageInfo) },
        totalCount: { type: new GraphQLNonNull(GraphQLFloat) },
      },
    });
  }

  private getTableInput(name: string) {
    return new GraphQLInputObjectType({
      name: `Get${name}Input`,
      fields: {
        first: { type: GraphQLFloat },
        after: { type: GraphQLString },
      },
    });
  }

  private async getQueryFields({
    revisionId,
  }: GetGraphqlSchemaQuery['data']): Promise<
    GraphQLObjectTypeConfig<any, any>['fields']
  > {
    const mapper: GraphQLObjectTypeConfig<any, any>['fields'] = {};

    for (const rowSchema of await this.getSchemas(revisionId)) {
      if (isEmptyObject(rowSchema.data)) {
        continue;
      }

      const safetyTableId = getSafetyName(rowSchema.id, 'INVALID_TABLE_NAME');

      mapper[safetyTableId] = {
        type: new GraphQLNonNull(
          this.getTableConnection(rowSchema, safetyTableId),
        ),
        args: {
          data: { type: this.getTableInput(safetyTableId) },
        },
        resolve: async (_, { data }: InputType, context: ContextType) => {
          const { data: dataResponse, error } = await this.proxyCoreApi.rows(
            {
              revisionId,
              tableId: rowSchema.id,
              first: data?.first || DEFAULT_FIRST,
              after: data?.after,
            },
            { headers: context.headers },
          );

          if (error) {
            this.logger.error(error);

            throw new GraphQLError(error.message, {
              extensions: { code: error.error, originalError: error },
            });
          }

          return dataResponse;
        },
      };
    }

    return mapper;
  }

  private getRootSchema(name: string, schema: JsonSchemaType) {
    switch (schema.type) {
      case 'object':
        return new GraphQLNonNull(this.getObjectSchema(name, schema));
      case 'array':
        return new GraphQLNonNull(
          new GraphQLList(this.getArrayItems(name, schema.items)),
        );
      case 'string':
        return new GraphQLNonNull(GraphQLString);
      case 'number':
        return new GraphQLNonNull(GraphQLFloat);
      case 'boolean':
        return new GraphQLNonNull(GraphQLBoolean);
      default:
        throw new Error('Invalid type');
    }
  }

  private getArrayItems(name: string, schema: JsonSchemaType) {
    switch (schema.type) {
      case 'string':
        return new GraphQLNonNull(GraphQLString);
      case 'number':
        return new GraphQLNonNull(GraphQLFloat);
      case 'boolean':
        return new GraphQLNonNull(GraphQLBoolean);
      case 'object':
        return new GraphQLNonNull(
          this.getObjectSchema(`${name}_Items`, schema),
        );
      case 'array':
        return new GraphQLNonNull(
          new GraphQLList(this.getArrayItems(`${name}_Items`, schema.items)),
        );
      default:
        throw new Error('Invalid type');
    }
  }

  private getObjectSchema(
    name: string,
    schema: JsonSchemaObjectType,
  ): GraphQLObjectType {
    const fields = {};

    Object.entries(schema.properties)
      .filter((property) => !isEmptyObject(property[1]))
      .forEach(([key, itemSchema]) => {
        if (getSafetyName(key, 'field') !== key) {
          // TODO
        } else {
          if (itemSchema.type === 'string') {
            fields[key] = { type: new GraphQLNonNull(GraphQLString) };
          } else if (itemSchema.type === 'number') {
            fields[key] = { type: new GraphQLNonNull(GraphQLFloat) };
          } else if (itemSchema.type === 'boolean') {
            fields[key] = { type: new GraphQLNonNull(GraphQLBoolean) };
          } else if (itemSchema.type === 'object') {
            fields[key] = {
              type: new GraphQLNonNull(
                this.getObjectSchema(`${name}_${key}`, itemSchema),
              ),
            };
          } else if (itemSchema.type === 'array') {
            fields[key] = {
              type: new GraphQLNonNull(
                new GraphQLList(
                  this.getArrayItems(`${name}_${key}`, itemSchema.items),
                ),
              ),
            };
          }
        }
      });

    return new GraphQLObjectType({
      name,
      fields: () => fields,
    });
  }

  private async getSchemas(revisionId: string) {
    // TODO schema, 1000
    const { data, error } = await this.internalCoreApi.rows({
      revisionId,
      tableId: SystemTables.Schema,
      first: 1000,
    });

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.edges.map((edge) => edge.node) as GetJsonSchemasReturnType;
  }
}

const isEmptyObject = (schema: JsonSchemaType): boolean => {
  if (schema.type === 'object' && !Object.keys(schema.properties).length) {
    return true;
  }

  if (schema.type === 'array') {
    return isEmptyObject(schema.items);
  }

  return false;
};

const startName = /[_a-zA-Z]/;
const containName = /^[_a-zA-Z0-9]+$/;

const getSafetyName = (name: string, prefix: string): string => {
  if (!startName.test(name[0])) {
    return getSafetyName(`${prefix}_${name}`, prefix);
  }

  if (!containName.test(name)) {
    return getSafetyName(name.replace(/[^_a-zA-Z0-9]/g, '_'), prefix);
  }

  return name;
};
