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
import { GraphQLFieldConfig } from 'graphql/type/definition';
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

const DATA_KEY = 'data';

type CreatingTableOptionsType = {
  table: ConverterTable;
  safetyTableId: string;
  pluralSafetyTableId: string;
};

interface CacheNode {
  table: ConverterTable;
  node: GraphQLObjectType;
  fieldName: { singular: string; plural: string };
  typeNames: { singular: string; plural: string };
}

interface GraphQLSchemaConverterContext extends ConverterContextType {
  pageInfo: GraphQLObjectType;
  nodes: Record<string, CacheNode>;
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
      nodes: {},
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

  private createQueryFields(): Record<string, any> {
    const tables = this.context.tables.filter(
      (table) => !isEmptyObject(table.schema),
    );
    const tableIds = tables.map((table) => table.id);

    this.context.nodes = tables.reduce<Record<string, CacheNode>>(
      (nodes, table) => {
        const { fieldName, typeNames } = this.generateFieldAndTypeNames(
          table.id,
          tableIds,
        );

        const options: CreatingTableOptionsType = {
          table,
          safetyTableId: typeNames.singular,
          pluralSafetyTableId: typeNames.plural,
        };

        const node = this.getNodeType(options);

        nodes[table.id] = {
          table,
          node,
          fieldName,
          typeNames,
        };

        return nodes;
      },
      {},
    );

    return Object.values(this.context.nodes).reduce(
      (fields, { table, node, fieldName, typeNames }) => {
        const options: CreatingTableOptionsType = {
          table,
          safetyTableId: typeNames.singular,
          pluralSafetyTableId: typeNames.plural,
        };

        fields[fieldName.singular] = this.createItemField(options, node);
        fields[fieldName.plural] = this.createListField(options, node);
        return fields;
      },
      {},
    );
  }

  private generateFieldAndTypeNames(
    tableId: string,
    allTableIds: string[],
  ): {
    fieldName: { singular: string; plural: string };
    typeNames: { singular: string; plural: string };
  } {
    const hasDuplicate = hasDuplicateKeyCaseInsensitive(allTableIds, tableId);

    const safeName = hasDuplicate
      ? getSafetyName(tableId, 'INVALID_TABLE_NAME')
      : getSafetyName(tableId.toLowerCase(), 'INVALID_TABLE_NAME');

    const singularFieldName = safeName;
    const pluralFieldName = pluralize(safeName);

    const singularTypeName = hasDuplicate ? safeName : capitalize(safeName);
    const pluralTypeName = pluralize(singularTypeName);

    return {
      fieldName: {
        singular: singularFieldName,
        plural: pluralFieldName,
      },
      typeNames: {
        singular: singularTypeName,
        plural: pluralTypeName,
      },
    };
  }

  private getItemResolver(table: ConverterTable) {
    const revisionId = this.context.revisionId;

    return async (_: unknown, { id }: { id: string }, ctx: ContextType) => {
      const { data: response, error } = await this.proxyCoreApi.api.row(
        revisionId,
        table.id,
        id,
        { headers: ctx.headers },
      );
      if (error) throw this.toGraphQLError(error);
      return response;
    };
  }

  private createItemField(
    options: CreatingTableOptionsType,
    node: GraphQLObjectType,
  ) {
    return {
      type: new GraphQLNonNull(node),
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: this.getItemResolver(options.table),
    };
  }

  private createListField(
    options: CreatingTableOptionsType,
    node: GraphQLObjectType,
  ) {
    const ConnectionType = this.getListConnection(options, node);
    return {
      type: new GraphQLNonNull(ConnectionType),
      args: { data: { type: this.getListArgs(options.pluralSafetyTableId) } },
      resolve: this.getListResolver(options.table),
    };
  }

  private getListResolver(table: ConverterTable) {
    const revisionId = this.context.revisionId;

    return async (
      _: unknown,
      { data }: { data: { first?: number; after?: string } },
      ctx: ContextType,
    ) => {
      const { data: response, error } = await this.proxyCoreApi.api.rows(
        {
          revisionId,
          tableId: table.id,
          first: data?.first || DEFAULT_FIRST,
          after: data?.after ?? undefined,
        },
        { headers: ctx.headers },
      );
      if (error) throw this.toGraphQLError(error);
      return response;
    };
  }

  private getListConnection(
    options: CreatingTableOptionsType,
    node: GraphQLObjectType,
  ) {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.pluralSafetyTableId}Connection`,
      fields: {
        edges: {
          type: new GraphQLNonNull(
            new GraphQLList(
              new GraphQLNonNull(this.getEdgeType(options, node)),
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
    options: CreatingTableOptionsType,
    node: GraphQLObjectType,
  ) {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.pluralSafetyTableId}Edge`,
      fields: {
        node: {
          type: new GraphQLNonNull(node),
        },
        cursor: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
  }

  private getNodeType(options: CreatingTableOptionsType) {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.pluralSafetyTableId}Node`,
      fields: () => ({
        versionId: { type: new GraphQLNonNull(GraphQLString) },
        createdId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(DateTimeType) },
        updatedAt: { type: new GraphQLNonNull(DateTimeType) },
        [DATA_KEY]: this.getSchemaConfig(
          options.table.schema,
          DATA_KEY,
          `${this.projectName}${options.safetyTableId}`,
        ),
      }),
    });
  }

  private getSchema(
    typeName: string,
    schema: JsonSchema,
    postfix: string = '',
  ) {
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
          this.getObjectSchema(`${typeName}${postfix}`, schema),
        );
      case 'array':
        return new GraphQLNonNull(
          new GraphQLList(
            this.getSchema(`${typeName}${postfix}`, schema.items, 'Items'),
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

            fields[key] = this.getSchemaConfig(
              itemSchema,
              key,
              `${name}${capitalizedSafetyKey}`,
            );
            return fields;
          },
          {} as Record<string, any>,
        ),
    });
  }

  private getSchemaConfig(
    schema: JsonSchema,
    field: string,
    typeName: string,
  ): GraphQLFieldConfig<any, any> {
    const foreignKeyConfig = this.tryGettingForeignKeyFieldConfig(
      schema,
      field,
    );

    if (foreignKeyConfig) {
      return foreignKeyConfig;
    }

    const foreignKeyArrayConfig = this.tryGettingForeignKeyArrayFieldConfig(
      schema,
      field,
    );

    if (foreignKeyArrayConfig) {
      return foreignKeyArrayConfig;
    }

    const type = this.getSchema(typeName, schema);

    return {
      type,
    };
  }

  private tryGettingForeignKeyFieldConfig(
    schema: JsonSchema,
    field: string,
  ): GraphQLFieldConfig<any, any> | null {
    const isForeignKey =
      !('$ref' in schema) && schema.type === 'string' && schema.foreignKey;

    if (isForeignKey) {
      return {
        type: new GraphQLNonNull(this.context.nodes[schema.foreignKey].node),
        resolve: this.getFieldResolver(schema.foreignKey, field),
      };
    }

    return null;
  }

  private tryGettingForeignKeyArrayFieldConfig(
    schema: JsonSchema,
    field: string,
  ): GraphQLFieldConfig<any, any> {
    if (
      !('$ref' in schema) &&
      schema.type === 'array' &&
      !('$ref' in schema.items) &&
      schema.items.type === 'string' &&
      schema.items.foreignKey
    ) {
      return {
        type: new GraphQLNonNull(
          new GraphQLList(
            new GraphQLNonNull(
              this.context.nodes[schema.items.foreignKey].node,
            ),
          ),
        ),
        resolve: this.getFieldArrayItemResolver(schema.items.foreignKey, field),
      };
    }
  }

  private getFieldResolver(foreignTableId: string, field: string) {
    const revisionId = this.context.revisionId;

    return async (parent: Record<string, string>, _, context: ContextType) => {
      const { data: response, error } = await this.proxyCoreApi.api.row(
        revisionId,
        foreignTableId,
        parent[field],
        {
          headers: context.headers,
        },
      );
      if (error) throw this.toGraphQLError(error);
      return response;
    };
  }

  private getFieldArrayItemResolver(foreignTableId: string, field: string) {
    const revisionId = this.context.revisionId;

    return async (
      parent: Record<string, string[]>,
      _,
      context: ContextType,
    ) => {
      const ids = parent[field];
      if (!ids?.length) return [];

      const promises = ids.map(async (id) => {
        const { data: response, error } = await this.proxyCoreApi.api.row(
          revisionId,
          foreignTableId,
          id,
          {
            headers: context.headers,
          },
        );
        if (error) throw this.toGraphQLError(error);
        return response;
      });

      return Promise.all(promises);
    };
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
