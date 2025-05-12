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
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql/type';
import { GraphQLFieldConfig } from 'graphql/type/definition';
import { lexicographicSortSchema, printSchema } from 'graphql/utilities';
import { RowModel } from 'src/endpoint-microservice/core-api/generated/api';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { DEFAULT_FIRST } from 'src/endpoint-microservice/graphql/graphql-schema-converter/constants';
import {
  ContextType,
  DateTimeType,
  getPageInfoType,
  JsonType,
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
const FLAT_KEY = 'Flat';
const ITEMS_POSTFIX = 'Items';

type CreatingTableOptionsType = {
  table: ConverterTable;
  safetyTableId: string;
  pluralSafetyTableId: string;
};

interface CacheNode {
  node: GraphQLObjectType<RowModel>;
  data: GraphQLFieldConfig<any, any>;
}

interface ValidTableType {
  fieldName: { singular: string; plural: string };
  typeNames: { singular: string; plural: string };
  options: CreatingTableOptionsType;
}

interface GraphQLSchemaConverterContext extends ConverterContextType {
  pageInfo: GraphQLObjectType;
  nodes: Record<string, CacheNode>;
  validTables: Record<string, ValidTableType>;
}

interface FieldAndTypeNames {
  fieldName: { singular: string; plural: string };
  typeNames: { singular: string; plural: string };
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
      validTables: {},
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

    this.createValidTables();

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: () => ({
          ...this.createFieldsFromNodes(),
          _service: this.createServiceField(() => {
            if (!cachedSdl) {
              cachedSdl = printSchema(schema);
            }
            return { sdl: cachedSdl };
          }),
        }),
      }),
    });

    return schema;
  }

  private createServiceField(
    resolver: () => { sdl: string },
  ): GraphQLFieldConfig<any, any> {
    return {
      type: ServiceType,
      resolve: resolver,
    };
  }

  private createValidTables() {
    const validTables = this.context.tables.filter(
      (table) => !isEmptyObject(table.schema),
    );

    const validTableIds = validTables.map((table) => table.id);

    this.context.validTables = validTables.reduce<
      Record<string, ValidTableType>
    >((acc, table) => {
      const { fieldName, typeNames } = this.generateFieldAndTypeNames(
        table.id,
        validTableIds,
      );

      const options: CreatingTableOptionsType = {
        table,
        safetyTableId: typeNames.singular,
        pluralSafetyTableId: typeNames.plural,
      };

      acc[table.id] = {
        fieldName,
        typeNames,
        options,
      };
      return acc;
    }, {});
  }

  private createFieldsFromNodes(): Record<string, any> {
    return Object.values(this.context.validTables).reduce(
      (fields, validTable) => {
        fields[validTable.fieldName.singular] = this.createItemField(
          validTable.options,
        );
        fields[validTable.fieldName.plural] = this.createListField(
          validTable.options,
        );

        fields[`${validTable.fieldName.singular}${FLAT_KEY}`] =
          this.createItemFlatField(validTable.options);

        return fields;
      },
      {},
    );
  }

  private generateFieldAndTypeNames(
    tableId: string,
    allTableIds: string[],
  ): FieldAndTypeNames {
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

  private getItemFlatResolver(table: ConverterTable) {
    const revisionId = this.context.revisionId;

    return async (_: unknown, { id }: { id: string }, ctx: ContextType) => {
      const { data: response, error } = await this.proxyCoreApi.api.row(
        revisionId,
        table.id,
        id,
        { headers: ctx.headers },
      );
      if (error) throw this.toGraphQLError(error);
      return response.data;
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

  private createItemFlatField(options: CreatingTableOptionsType) {
    const dataConfig = this.getCachedNodeType(options.table.id).data;

    return {
      type: dataConfig.type,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: dataConfig.resolve ?? this.getItemFlatResolver(options.table),
    };
  }

  private createItemField(options: CreatingTableOptionsType) {
    return {
      type: new GraphQLNonNull(this.getCachedNodeType(options.table.id).node),
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: this.getItemResolver(options.table),
    };
  }

  private createListField(options: CreatingTableOptionsType) {
    const ConnectionType = this.getListConnection(options);
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
  ): GraphQLObjectType {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.safetyTableId}Connection`,
      fields: {
        edges: {
          type: new GraphQLNonNull(
            new GraphQLList(new GraphQLNonNull(this.getEdgeType(options))),
          ),
        },
        pageInfo: { type: new GraphQLNonNull(this.context.pageInfo) },
        totalCount: { type: new GraphQLNonNull(GraphQLInt) },
      },
    });
  }

  private getListArgs(name: string): GraphQLInputObjectType {
    return new GraphQLInputObjectType({
      name: `${this.projectName}Get${name}Input`,
      fields: {
        first: { type: GraphQLFloat },
        after: { type: GraphQLString },
      },
    });
  }

  private getEdgeType(options: CreatingTableOptionsType): GraphQLObjectType {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.safetyTableId}Edge`,
      fields: {
        node: {
          type: new GraphQLNonNull(
            this.getCachedNodeType(options.table.id).node,
          ),
        },
        cursor: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
  }

  private buildNodeCache(tableId: string): void {
    const validTable = this.context.validTables[tableId];

    const { data, node } = this.getNodeType(validTable.options);

    this.context.nodes[tableId] = {
      node,
      data,
    };
  }

  private getCachedNodeType(tableId: string) {
    if (!this.context.nodes[tableId]) {
      this.buildNodeCache(tableId);
    }

    return this.context.nodes[tableId];
  }

  private getNodeType(options: CreatingTableOptionsType) {
    const data = this.getSchemaConfig(
      options.table.schema,
      DATA_KEY,
      `${this.projectName}${options.safetyTableId}`,
    );

    const node = new GraphQLObjectType<RowModel>({
      name: `${this.projectName}${options.safetyTableId}Node`,
      fields: () => ({
        versionId: { type: new GraphQLNonNull(GraphQLString) },
        createdId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(DateTimeType) },
        updatedAt: { type: new GraphQLNonNull(DateTimeType) },
        [DATA_KEY]: data,
        json: { type: JsonType, resolve: (parent) => parent.data },
      }),
    });

    return {
      data,
      node,
    };
  }

  private mapSchemaTypeToGraphQL(
    typeName: string,
    schema: JsonSchema,
    postfix: string = '',
  ) {
    if ('$ref' in schema) {
      throw new InternalServerErrorException(
        `endpointId: ${this.context.endpointId}, unsupported $ref in schema: ${JSON.stringify(schema)}`,
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
            this.mapSchemaTypeToGraphQL(
              `${typeName}${postfix}`,
              schema.items,
              ITEMS_POSTFIX,
            ),
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

    const type = this.mapSchemaTypeToGraphQL(typeName, schema);

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
        // type: new GraphQLNonNull(this.context.nodes[schema.foreignKey].node),
        type: new GraphQLNonNull(
          this.getCachedNodeType(schema.foreignKey).node,
        ),
        resolve: this.getFieldResolver(schema.foreignKey, field),
      };
    }

    return null;
  }

  private tryGettingForeignKeyArrayFieldConfig(
    schema: JsonSchema,
    field: string,
  ): GraphQLFieldConfig<any, any> | null {
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
              this.getCachedNodeType(schema.items.foreignKey).node,
            ),
          ),
        ),
        resolve: this.getFieldArrayItemResolver(schema.items.foreignKey, field),
      };
    }

    return null;
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

  private get projectName(): string {
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
