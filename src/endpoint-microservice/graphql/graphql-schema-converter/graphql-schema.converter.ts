import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { GraphQLError } from 'graphql/error';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLSchema,
  GraphQLString,
} from 'graphql/type';
import { lexicographicSortSchema, printSchema } from 'graphql/utilities';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { DEFAULT_FIRST } from 'src/endpoint-microservice/graphql/graphql-schema-converter/constants';
import {
  InputType,
  ServiceType,
  ContextType,
  PageInfo,
  DateTimeType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import {
  getSafetyName,
  isEmptyObject,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils';
import {
  ConverterContextType,
  Converter,
  ConverterTable,
} from 'src/endpoint-microservice/shared/converter';
import {
  JsonObjectSchema,
  JsonSchema,
} from 'src/endpoint-microservice/shared/types/schema.types';

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  private readonly logger = new Logger(GraphQLSchemaConverter.name);

  constructor(
    private readonly asyncLocalStorage: AsyncLocalStorage<ConverterContextType>,
    private readonly proxyCoreApi: ProxyCoreApiService,
  ) {}

  public async convert(context: ConverterContextType): Promise<GraphQLSchema> {
    return this.asyncLocalStorage.run(context, async () => {
      const schema = await this.createSchema();
      return lexicographicSortSchema(schema);
    });
  }

  private async createSchema(): Promise<GraphQLSchema> {
    let cachedSdl: string = undefined;

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          ...(await this.getQueryFields()),
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

  private async getQueryFields(): Promise<
    GraphQLObjectTypeConfig<any, any>['fields']
  > {
    const mapper: GraphQLObjectTypeConfig<any, any>['fields'] = {};

    for (const rowSchema of this.context.tables) {
      if (isEmptyObject(rowSchema.schema)) {
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
              revisionId: this.context.revisionId,
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

  private getTableConnection(data: ConverterTable, safetyTableId: string) {
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

  private getEdgeType(data: ConverterTable, safetyTableId: string) {
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

  private getNodeType(data: ConverterTable, safetyTableId: string) {
    return new GraphQLObjectType({
      name: safetyTableId,
      fields: () => ({
        versionId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(DateTimeType) },
        data: {
          type: this.getRootSchema(`Data${safetyTableId}`, data.schema),
        },
      }),
    });
  }

  private getRootSchema(name: string, schema: JsonSchema) {
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

  private getArrayItems(name: string, schema: JsonSchema) {
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
    schema: JsonObjectSchema,
  ): GraphQLObjectType {
    const fields = {};

    Object.entries(schema.properties)
      .filter((property) => !isEmptyObject(property[1]))
      .forEach(([key, itemSchema]) => {
        const safetyKey = getSafetyName(key, 'INVALID_FIELD_NAME');

        if (itemSchema.type === 'string') {
          fields[safetyKey] = { type: new GraphQLNonNull(GraphQLString) };
        } else if (itemSchema.type === 'number') {
          fields[safetyKey] = { type: new GraphQLNonNull(GraphQLFloat) };
        } else if (itemSchema.type === 'boolean') {
          fields[safetyKey] = { type: new GraphQLNonNull(GraphQLBoolean) };
        } else if (itemSchema.type === 'object') {
          fields[safetyKey] = {
            type: new GraphQLNonNull(
              this.getObjectSchema(`${name}_${safetyKey}`, itemSchema),
            ),
          };
        } else if (itemSchema.type === 'array') {
          fields[safetyKey] = {
            type: new GraphQLNonNull(
              new GraphQLList(
                this.getArrayItems(`${name}_${safetyKey}`, itemSchema.items),
              ),
            ),
          };
        }
      });

    return new GraphQLObjectType({
      name,
      fields: () => fields,
    });
  }

  private get context(): ConverterContextType {
    const context = this.asyncLocalStorage.getStore();

    if (!context) {
      throw new InternalServerErrorException(
        'GraphQLSchemaConverterContext not found. It appears that an attempt was made to access a context outside of AsyncLocalStorage.run.',
      );
    }

    return context;
  }
}
