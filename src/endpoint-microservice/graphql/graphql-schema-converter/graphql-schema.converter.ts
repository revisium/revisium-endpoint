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
  GraphQLSchema,
  GraphQLString,
} from 'graphql/type';
import { lexicographicSortSchema, printSchema } from 'graphql/utilities';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { DEFAULT_FIRST } from 'src/endpoint-microservice/graphql/graphql-schema-converter/constants';
import {
  ContextType,
  DateTimeType,
  PageInfo,
  ServiceType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import {
  getSafetyName,
  isEmptyObject,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils';
import {
  Converter,
  ConverterContextType,
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
          ...this.createQueryFields(),
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

  private createQueryFields() {
    return this.context.tables
      .filter((table) => !isEmptyObject(table.schema))
      .reduce(
        (fields, table) => {
          const safeName = getSafetyName(table.id, 'INVALID_TABLE_NAME');
          fields[`${safeName}`] = this.createListField(table, safeName);
          return fields;
        },
        {} as Record<string, any>,
      );
  }

  private createListField(table: ConverterTable, name: string) {
    const ConnectionType = this.getTableConnection(table, name);
    return {
      type: new GraphQLNonNull(ConnectionType),
      args: { data: { type: this.getTableInput(name) } },
      resolve: this.getListResolver(table),
    };
  }

  private getListResolver(table: ConverterTable) {
    return async (_: any, { data }: any, ctx: ContextType) => {
      const { data: response, error } = await this.proxyCoreApi.rows(
        {
          revisionId: this.context.revisionId,
          tableId: table.id,
          first: data?.first || DEFAULT_FIRST,
          after: data?.after,
        },
        { headers: ctx.headers },
      );
      if (error) throw this.toGraphQLError(error);
      return response;
    };
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

  private getRootSchema(
    name: string,
    schema: JsonSchema,
    postfix: string = '',
  ) {
    switch (schema.type) {
      case 'string':
        return new GraphQLNonNull(GraphQLString);
      case 'number':
        return new GraphQLNonNull(GraphQLFloat);
      case 'boolean':
        return new GraphQLNonNull(GraphQLBoolean);
      case 'object':
        return new GraphQLNonNull(
          this.getObjectSchema(`${name}${postfix}`, schema),
        );
      case 'array':
        return new GraphQLNonNull(
          new GraphQLList(
            this.getRootSchema(`${name}${postfix}`, schema.items, '_Items'),
          ),
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
                this.getRootSchema(
                  `${name}_${safetyKey}`,
                  itemSchema.items,
                  '_Items',
                ),
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

  private toGraphQLError(err: any): GraphQLError {
    this.logger.error(err);
    return new GraphQLError(err.message, {
      extensions: { code: err.error, originalError: err },
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
