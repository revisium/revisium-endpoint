import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { GraphQLError } from 'graphql/error';
import {
  GraphQLBoolean,
  GraphQLEnumType,
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
import { ClsService } from 'nestjs-cls';
import { RowModel } from 'src/endpoint-microservice/core-api/generated/api';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { GraphqlCachedRowsClsStore } from 'src/endpoint-microservice/graphql/graphql-cls.types';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  CreatingTableOptionsType,
  ValidTableType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { createScalarFilterTypes } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createScalarFilterTypes';
import { createServiceField } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createServiceField';
import { createWhereInput } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createWhereInput';
import { DateTimeType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/dateTimeType';
import { generateOrderByType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/generateOrderByType';
import { getPageInfoType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/getPageInfoType';
import { getSortOrder } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/getSortOrder';
import { JsonType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/jsonType';
import { createValidTables } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/createValidTables';
import { getProjectName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getProjectName';
import { isEmptyObject } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isEmptyObject';
import { isValidName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isValidName';
import {
  Converter,
  ConverterContextType,
} from 'src/endpoint-microservice/shared/converter';
import {
  JsonObjectSchema,
  JsonSchema,
} from 'src/endpoint-microservice/shared/schema';
import {
  capitalize,
  hasDuplicateKeyCaseInsensitive,
} from 'src/endpoint-microservice/shared/utils/stringUtils';

const DATA_KEY = 'data';
const FLAT_KEY = 'Flat';
const CONNECTION_KEY = 'Connection';
const EDGE_KEY = 'Edge';
const ITEMS_POSTFIX = 'Items';

export interface CacheNode {
  node: GraphQLObjectType<RowModel>;
  data: GraphQLFieldConfig<any, any>;
  dataFlat: GraphQLFieldConfig<any, any>;
}

export interface GraphQLSchemaConverterContext extends ConverterContextType {
  pageInfo: GraphQLObjectType;
  sortOrder: GraphQLEnumType;
  listArgsMap: Record<string, GraphQLInputObjectType>;
  filterTypes: Record<string, GraphQLInputObjectType>;
  whereInputTypeMap: Record<string, GraphQLInputObjectType>;
  nodes: Record<string, CacheNode>;
  validTables: Record<string, ValidTableType>;
}

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  private readonly logger = new Logger(GraphQLSchemaConverter.name);

  constructor(
    private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>,
    private readonly proxyCoreApi: ProxyCoreApiService,
    private readonly cls: ClsService<GraphqlCachedRowsClsStore>,
    private readonly resolver: ResolverService,
  ) {}

  public async convert(context: ConverterContextType): Promise<GraphQLSchema> {
    const graphQLSchemaConverterContext: GraphQLSchemaConverterContext = {
      ...context,
      pageInfo: getPageInfoType(getProjectName(context.projectName)),
      sortOrder: getSortOrder(getProjectName(context.projectName)),
      listArgsMap: {},
      filterTypes: createScalarFilterTypes(getProjectName(context.projectName)),
      whereInputTypeMap: {},
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
          _service: createServiceField(() => {
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

  private createValidTables() {
    this.context.validTables = createValidTables(this.context.tables);
  }

  private createFieldsFromNodes(): Record<string, any> {
    return Object.values(this.context.validTables).reduce(
      (fields, validTable) => {
        const pluralKey = `${validTable.fieldName.plural}`;
        const singularKey = `${validTable.fieldName.singular}`;
        const flatSingularKey = `${validTable.fieldName.singular}${FLAT_KEY}`;
        const flatPluralKey = `${validTable.fieldName.plural}${FLAT_KEY}`;

        fields[singularKey] = this.createItemField(validTable.options);
        fields[pluralKey] = this.createListField(validTable.options);
        fields[flatSingularKey] = this.createItemFlatField(validTable.options);
        fields[flatPluralKey] = this.createListFlatField(validTable.options);

        return fields;
      },
      {},
    );
  }

  private createItemFlatField(
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const dataConfig = this.getCachedNodeType(options.table.id).dataFlat;

    return {
      type: dataConfig.type,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve:
        dataConfig.resolve ?? this.resolver.getItemFlatResolver(options.table),
    };
  }

  private createItemField(
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    return {
      type: new GraphQLNonNull(this.getCachedNodeType(options.table.id).node),
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: this.resolver.getItemResolver(options.table),
    };
  }

  private createListField(
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const ConnectionType = this.getListConnection(options);
    return {
      type: new GraphQLNonNull(ConnectionType),
      args: { data: { type: this.getListArgs(options.pluralSafetyTableId) } },
      resolve: this.resolver.getListResolver(options.table),
    };
  }

  private createListFlatField(
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const ConnectionType = this.getFlatConnection(options);

    return {
      type: new GraphQLNonNull(ConnectionType),
      args: {
        data: { type: this.getListArgs(options.pluralSafetyTableId) },
      },
      resolve: this.resolver.getListFlatResolver(options.table),
    };
  }

  private getFlatConnection(
    options: CreatingTableOptionsType,
  ): GraphQLObjectType {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.safetyTableId}${FLAT_KEY}${CONNECTION_KEY}`,
      fields: {
        edges: {
          type: new GraphQLNonNull(
            new GraphQLList(new GraphQLNonNull(this.getFlatEdgeType(options))),
          ),
        },
        pageInfo: { type: new GraphQLNonNull(this.context.pageInfo) },
        totalCount: { type: new GraphQLNonNull(GraphQLInt) },
      },
    });
  }

  private getFlatEdgeType(
    options: CreatingTableOptionsType,
  ): GraphQLObjectType {
    const flatType = this.getCachedNodeType(options.table.id).dataFlat.type;
    return new GraphQLObjectType({
      name: `${this.projectName}${options.safetyTableId}${FLAT_KEY}${EDGE_KEY}`,
      fields: {
        node: { type: flatType },
        cursor: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
  }

  private getListConnection(
    options: CreatingTableOptionsType,
  ): GraphQLObjectType {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.safetyTableId}${CONNECTION_KEY}`,
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
    const typeName = `${this.projectName}Get${name}Input`;

    if (this.context.listArgsMap[typeName]) {
      return this.context.listArgsMap[typeName];
    }

    const listArgs = new GraphQLInputObjectType({
      name: `${this.projectName}Get${name}Input`,
      fields: {
        first: { type: GraphQLInt },
        after: { type: GraphQLString },
        orderBy: {
          type: generateOrderByType(
            `${this.projectName}Get${name}`,
            this.context.sortOrder,
          ),
        },
        where: {
          type: createWhereInput(
            this.projectName,
            name,
            this.context.filterTypes,
            this.context.whereInputTypeMap,
          ),
        },
      },
    });

    this.context.listArgsMap[typeName] = listArgs;

    return listArgs;
  }

  private getEdgeType(options: CreatingTableOptionsType): GraphQLObjectType {
    return new GraphQLObjectType({
      name: `${this.projectName}${options.safetyTableId}${EDGE_KEY}`,
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
    const dataFlat = this.getDataFlatType(validTable.options);

    this.context.nodes[tableId] = {
      node,
      data,
      dataFlat,
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
        publishedAt: { type: new GraphQLNonNull(DateTimeType) },
        [DATA_KEY]: data,
        json: { type: JsonType, resolve: (parent) => parent.data },
      }),
    });

    return {
      data,
      node,
    };
  }

  private getDataFlatType(options: CreatingTableOptionsType) {
    return this.getSchemaConfig(
      options.table.schema,
      DATA_KEY,
      `${this.projectName}${options.safetyTableId}${FLAT_KEY}`,
      true,
    );
  }

  private mapSchemaTypeToGraphQL(
    typeName: string,
    schema: JsonSchema,
    postfix: string = '',
    isFlat: boolean = false,
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
          this.getObjectSchema(`${typeName}${postfix}`, schema, isFlat),
        );
      case 'array':
        return new GraphQLNonNull(
          new GraphQLList(
            this.mapSchemaTypeToGraphQL(
              `${typeName}${postfix}`,
              schema.items,
              ITEMS_POSTFIX,
              isFlat,
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
    isFlat: boolean = false,
  ): GraphQLObjectType {
    const validEntries = Object.entries(schema.properties).filter(
      ([_, propertySchema]) => !isEmptyObject(propertySchema),
    );

    const ids = validEntries.map(([key]) => key);

    return new GraphQLObjectType({
      name,
      fields: () =>
        validEntries.reduce(
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
              isFlat,
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
    isFlat: boolean = false,
  ): GraphQLFieldConfig<any, any> {
    const foreignKeyConfig = this.tryGettingForeignKeyFieldConfig(
      schema,
      field,
      isFlat,
    );

    if (foreignKeyConfig) {
      return foreignKeyConfig;
    }

    const foreignKeyArrayConfig = this.tryGettingForeignKeyArrayFieldConfig(
      schema,
      field,
      isFlat,
    );

    if (foreignKeyArrayConfig) {
      return foreignKeyArrayConfig;
    }

    const type = this.mapSchemaTypeToGraphQL(typeName, schema, '', isFlat);

    const config: GraphQLFieldConfig<any, any> = {
      type,
    };

    if (schema.deprecated && schema.description) {
      config.deprecationReason = schema.description;
    } else if (schema.description) {
      config.description = schema.description;
    }

    return config;
  }

  private tryGettingForeignKeyFieldConfig(
    schema: JsonSchema,
    field: string,
    isFlat: boolean = false,
  ): GraphQLFieldConfig<any, any> | null {
    const isForeignKey =
      !('$ref' in schema) && schema.type === 'string' && schema.foreignKey;

    if (isForeignKey) {
      const config: GraphQLFieldConfig<any, any> = {
        type: isFlat
          ? this.getCachedNodeType(schema.foreignKey).dataFlat.type
          : new GraphQLNonNull(this.getCachedNodeType(schema.foreignKey).node),
        resolve: this.resolver.getFieldResolver(
          schema.foreignKey,
          field,
          isFlat,
        ),
      };

      if (schema.deprecated && schema.description) {
        config.deprecationReason = schema.description;
      } else if (schema.description) {
        config.description = schema.description;
      }

      return config;
    }

    return null;
  }

  private tryGettingForeignKeyArrayFieldConfig(
    schema: JsonSchema,
    field: string,
    isFlat: boolean = false,
  ): GraphQLFieldConfig<any, any> | null {
    if (
      !('$ref' in schema) &&
      schema.type === 'array' &&
      !('$ref' in schema.items) &&
      schema.items.type === 'string' &&
      schema.items.foreignKey
    ) {
      const config: GraphQLFieldConfig<any, any> = {
        type: new GraphQLNonNull(
          new GraphQLList(
            isFlat
              ? this.getCachedNodeType(schema.items.foreignKey).dataFlat.type
              : new GraphQLNonNull(
                  this.getCachedNodeType(schema.items.foreignKey).node,
                ),
          ),
        ),
        resolve: this.resolver.getFieldArrayItemResolver(
          schema.items.foreignKey,
          field,
          isFlat,
        ),
      };

      if (schema.deprecated && schema.description) {
        config.deprecationReason = schema.description;
      } else if (schema.description) {
        config.description = schema.description;
      }

      return config;
    }

    return null;
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
