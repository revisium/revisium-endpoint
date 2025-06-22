import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import {
  GraphQLEnumType,
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
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  CreatingTableOptionsType,
  ValidTableType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { createScalarFilterTypes } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createScalarFilterTypes';
import { createServiceField } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createServiceField';
import { createWhereInput } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createWhereInput';
import { generateOrderByType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/generateOrderByType';
import { getPageInfoType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/getPageInfoType';
import { getSortOrder } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/getSortOrder';
import { createValidTables } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/createValidTables';
import { getProjectName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getProjectName';
import {
  Converter,
  ConverterContextType,
} from 'src/endpoint-microservice/shared/converter';

const FLAT_KEY = 'Flat';
const CONNECTION_KEY = 'Connection';
const EDGE_KEY = 'Edge';

export interface CacheNode {
  node: GraphQLObjectType<RowModel>;
  dataFlat: GraphQLFieldConfig<any, any>;
}

export interface GraphQLSchemaConverterContext extends ConverterContextType {
  pageInfo: GraphQLObjectType;
  sortOrder: GraphQLEnumType;
  listArgsMap: Record<string, GraphQLInputObjectType>;
  filterTypes: Record<string, GraphQLInputObjectType>;
  whereInputTypeMap: Record<string, GraphQLInputObjectType>;
  nodes: Record<string, CacheNode>;
}

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  private readonly logger = new Logger(GraphQLSchemaConverter.name);

  constructor(
    private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>,
    private readonly resolver: ResolverService,
    private readonly cacheService: CacheService,
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

    const validTables = createValidTables(this.context.tables);

    this.createValidTables(validTables);

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: () => ({
          ...this.createFieldsFromNodes(validTables),
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

  private createValidTables(validTables: Record<string, ValidTableType>) {
    const options = Object.values(validTables).map(
      (validTable) => validTable.options,
    );

    this.cacheService.build(options);
  }

  private createFieldsFromNodes(
    validTables: Record<string, ValidTableType>,
  ): Record<string, any> {
    return Object.values(validTables).reduce((fields, validTable) => {
      const pluralKey = `${validTable.fieldName.plural}`;
      const singularKey = `${validTable.fieldName.singular}`;
      const flatSingularKey = `${validTable.fieldName.singular}${FLAT_KEY}`;
      const flatPluralKey = `${validTable.fieldName.plural}${FLAT_KEY}`;

      fields[singularKey] = this.createItemField(validTable.options);
      fields[pluralKey] = this.createListField(validTable.options);
      fields[flatSingularKey] = this.createItemFlatField(validTable.options);
      fields[flatPluralKey] = this.createListFlatField(validTable.options);

      return fields;
    }, {});
  }

  private createItemFlatField(
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const dataConfig = this.cacheService.get(options.table.id).dataFlat;

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
      type: new GraphQLNonNull(this.cacheService.get(options.table.id).node),
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
    const flatType = this.cacheService.get(options.table.id).dataFlat.type;
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
            this.cacheService.get(options.table.id).node,
          ),
        },
        cursor: { type: new GraphQLNonNull(GraphQLString) },
      },
    });
  }

  private get projectName(): string {
    return getProjectName(this.context.projectName);
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
