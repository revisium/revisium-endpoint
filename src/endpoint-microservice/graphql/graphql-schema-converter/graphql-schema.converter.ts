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
  getPageInfoType,
  ServiceType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import {
  getProjectName,
  getSafetyName,
  isEmptyObject,
  isValidName,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils';
import {
  Converter,
  ConverterContextType,
  ConverterTable,
} from 'src/endpoint-microservice/shared/converter';
import {
  JsonObjectSchema,
  JsonSchema,
} from 'src/endpoint-microservice/shared/schema';
import {
  capitalize,
  hasDuplicateKeyCaseInsensitive,
  pluralize,
} from 'src/endpoint-microservice/shared/utils/stringUtils';

interface GraphQLSchemaConverterContext extends ConverterContextType {
  pageInfo: GraphQLObjectType;
}

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  private readonly logger = new Logger(GraphQLSchemaConverter.name);

  constructor(
    private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>,
    private readonly proxyCoreApi: ProxyCoreApiService,
  ) {}

  public async convert(context: ConverterContextType): Promise<GraphQLSchema> {
    const graphQLSchemaConverterContext: GraphQLSchemaConverterContext = {
      ...context,
      pageInfo: getPageInfoType(getProjectName(context.projectName)),
    };

    return this.asyncLocalStorage.run(
      graphQLSchemaConverterContext,
      async () => {
        const schema = await this.createSchema();
        return lexicographicSortSchema(schema);
      },
    );
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
    const ids = this.context.tables.map((table) => table.id);

    return this.context.tables
      .filter((table) => !isEmptyObject(table.schema))
      .reduce(
        (fields, table) => {
          const safeName = hasDuplicateKeyCaseInsensitive(ids, table.id)
            ? getSafetyName(table.id, 'INVALID_TABLE_NAME')
            : getSafetyName(table.id.toLowerCase(), 'INVALID_TABLE_NAME');

          const pluralName = pluralize(safeName);

          const capitalizedSafeName = hasDuplicateKeyCaseInsensitive(
            ids,
            table.id,
          )
            ? safeName
            : capitalize(safeName);

          const pluralCapitalizedSafeName = pluralize(capitalizedSafeName);

          fields[pluralName] = this.createListField(
            table,
            capitalizedSafeName,
            pluralCapitalizedSafeName,
          );
          return fields;
        },
        {} as Record<string, any>,
      );
  }

  private createListField(
    table: ConverterTable,
    safetyTableId: string,
    pluralSafetyTableId: string,
  ) {
    const ConnectionType = this.getListConnection(
      table,
      safetyTableId,
      pluralSafetyTableId,
    );
    return {
      type: new GraphQLNonNull(ConnectionType),
      args: { data: { type: this.getListArgs(pluralSafetyTableId) } },
      resolve: this.getListResolver(table),
    };
  }

  private getListResolver(table: ConverterTable) {
    const revisionId = this.context.revisionId;

    return async (
      _: unknown,
      { data }: { data: { first?: number; after?: string } },
      ctx: ContextType,
    ) => {
      const { data: response, error } = await this.proxyCoreApi.rows(
        {
          revisionId,
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

  private getListConnection(
    data: ConverterTable,
    safetyTableId: string,
    pluralSafetyTableId: string,
  ) {
    return new GraphQLObjectType({
      name: `${this.projectName}${pluralSafetyTableId}Connection`,
      fields: {
        edges: {
          type: new GraphQLNonNull(
            new GraphQLList(
              new GraphQLNonNull(
                this.getEdgeType(data, safetyTableId, pluralSafetyTableId),
              ),
            ),
          ),
        },
        pageInfo: { type: new GraphQLNonNull(this.context.pageInfo) },
        totalCount: { type: new GraphQLNonNull(GraphQLFloat) },
      },
    });
  }

  private getListArgs(name: string) {
    return new GraphQLInputObjectType({
      name: `${this.projectName}Get${name}Input`,
      fields: {
        first: { type: GraphQLFloat },
        after: { type: GraphQLString },
      },
    });
  }

  private getEdgeType(
    data: ConverterTable,
    safetyTableId: string,
    pluralSafetyTableId: string,
  ) {
    return new GraphQLObjectType({
      name: `${this.projectName}${pluralSafetyTableId}Edge`,
      fields: {
        node: {
          type: new GraphQLNonNull(
            this.getNodeType(data, safetyTableId, pluralSafetyTableId),
          ),
        },
        cursor: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
  }

  private getNodeType(
    data: ConverterTable,
    safetyTableId: string,
    pluralSafetyTableId: string,
  ) {
    return new GraphQLObjectType({
      name: `${this.projectName}${pluralSafetyTableId}Node`,
      fields: () => ({
        versionId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(DateTimeType) },
        data: {
          type: this.getSchema(
            `${this.projectName}${safetyTableId}`,
            data.schema,
          ),
        },
      }),
    });
  }

  private getSchema(name: string, schema: JsonSchema, postfix: string = '') {
    if ('$ref' in schema) {
      throw new InternalServerErrorException(
        `endpointId: ${this.context.endpointId}, unssuported $ref in schema: ${JSON.stringify(schema)}`,
      );
    }

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
            this.getSchema(`${name}${postfix}`, schema.items, 'Items'),
          ),
        );
      default:
        throw new InternalServerErrorException(
          `endpointId: ${this.context.endpointId}, unknown schema: ${JSON.stringify(schema)}`,
        );
    }
  }

  private getObjectSchema(
    name: string,
    schema: JsonObjectSchema,
  ): GraphQLObjectType {
    const ids = Object.keys(schema.properties);

    return new GraphQLObjectType({
      name,
      fields: () =>
        Object.entries(schema.properties).reduce(
          (fields, [key, itemSchema]) => {
            if (!isValidName(key)) {
              return fields;
            }

            const capitalizedSafetyKey = hasDuplicateKeyCaseInsensitive(
              ids,
              key,
            )
              ? key
              : capitalize(key);
            const type = this.getSchema(
              `${name}${capitalizedSafetyKey}`,
              itemSchema,
            );
            fields[key] = { type };
            return fields;
          },
          {} as Record<string, any>,
        ),
    });
  }

  private get projectName() {
    return getProjectName(this.context.projectName);
  }

  private toGraphQLError(err: any): GraphQLError {
    this.logger.error(err);
    return new GraphQLError(err.message, {
      extensions: { code: err.error, originalError: err },
    });
  }

  private get context(): GraphQLSchemaConverterContext {
    const context = this.asyncLocalStorage.getStore();

    if (!context) {
      throw new InternalServerErrorException(
        'GraphQLSchemaConverterContext not found. It appears that an attempt was made to access a context outside of AsyncLocalStorage.run.',
      );
    }

    return context;
  }
}
