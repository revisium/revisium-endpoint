import { Injectable } from '@nestjs/common';
import {
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql/type';
import { GraphQLFieldConfig } from 'graphql/type/definition';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  FieldRefType,
  FieldType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { createWhereInput } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createWhereInput';
import { generateOrderByType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/generateOrderByType';
import { getProjectName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getProjectName';

const FLAT_KEY = 'Flat';
const CONNECTION_KEY = 'Connection';
const EDGE_KEY = 'Edge';

@Injectable()
export class QueriesService {
  constructor(
    private readonly contextService: ContextService,
    private readonly cacheService: CacheService,
    private readonly resolver: ResolverService,
  ) {}

  public createItemFlatField(
    flatSingularKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const nodeType = this.cacheService.get(options.table.id).dataFlatRoot;

    if (!nodeType) {
      throw new Error('implement id');
    }

    this.contextService.schema.query.addField({
      ...nodeType,
      name: flatSingularKey,
      args: {
        type: FieldType.string,
        name: 'id',
        required: true,
      },
    });

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

  public createItemField(
    singularKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const nodeType = this.cacheService.get(options.table.id).nodeType;

    this.contextService.schema.query.addField({
      type: FieldType.ref,
      name: singularKey,
      value: nodeType.name,
      args: {
        type: FieldType.string,
        name: 'id',
        required: true,
      },
    });

    return {
      type: new GraphQLNonNull(this.cacheService.get(options.table.id).node),
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: this.resolver.getItemResolver(options.table),
    };
  }

  public createListField(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const ConnectionType = this.getListConnection(pluralKey, options);
    return {
      type: new GraphQLNonNull(ConnectionType),
      args: { data: { type: this.getListArgs(options.pluralSafetyTableId) } },
      resolve: this.resolver.getListResolver(options.table),
    };
  }

  public createListFlatField(
    flatPluralKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const ConnectionType = this.getFlatConnection(flatPluralKey, options);

    return {
      type: new GraphQLNonNull(ConnectionType),
      args: {
        data: { type: this.getListArgs(options.pluralSafetyTableId) },
      },
      resolve: this.resolver.getListFlatResolver(options.table),
    };
  }

  private getFlatConnection(
    flatPluralKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLObjectType {
    const connectionName = `${this.projectName}${options.safetyTableId}${FLAT_KEY}${CONNECTION_KEY}`;
    const edgeName = `${this.projectName}${options.safetyTableId}${FLAT_KEY}${EDGE_KEY}`;
    const nodeType = this.cacheService.get(options.table.id).dataFlatRoot;

    if (!nodeType) {
      throw new Error('implement id');
    }

    this.contextService.schema.addType(edgeName).addFields([
      {
        type: FieldType.string,
        name: 'cursor',
      },
      {
        ...nodeType,
        name: 'node',
      },
    ]);

    this.contextService.schema.addType(connectionName).addFields([
      {
        type: FieldType.refList,
        refType: FieldRefType.type,
        name: 'edges',
        value: edgeName,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.type,
        name: 'pageInfo',
        value: `${this.projectName}PageInfo`,
      },
      {
        type: FieldType.int,
        name: 'totalCount',
      },
    ]);

    this.contextService.schema.query.addField({
      type: FieldType.ref,
      name: flatPluralKey,
      value: connectionName,
      args: {
        type: FieldType.ref,
        name: 'data',
        value: `${this.projectName}Get${options.pluralSafetyTableId}Input`,
      },
    });

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
    pluralKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLObjectType {
    const name = `${this.projectName}${options.safetyTableId}${CONNECTION_KEY}`;

    const edgeName = `${this.projectName}${options.safetyTableId}${EDGE_KEY}`;

    this.contextService.schema.addType(edgeName).addFields([
      {
        type: FieldType.string,
        name: 'cursor',
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.type,
        name: 'node',
        value: `${this.projectName}${options.safetyTableId}Node`,
      },
    ]);

    this.contextService.schema.addType(name).addFields([
      {
        type: FieldType.refList,
        refType: FieldRefType.type,
        name: 'edges',
        value: edgeName,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.type,
        name: 'pageInfo',
        value: `${this.projectName}PageInfo`,
      },
      {
        type: FieldType.int,
        name: 'totalCount',
      },
    ]);

    this.contextService.schema.query.addField({
      type: FieldType.ref,
      name: pluralKey,
      value: name,
      args: {
        type: FieldType.ref,
        name: 'data',
        value: `${this.projectName}Get${options.pluralSafetyTableId}Input`,
      },
    });

    return new GraphQLObjectType({
      name,
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

    const orderByEnumName = `${this.projectName}Get${name}OrderByField`;
    this.contextService.schema
      .addEnum(orderByEnumName)
      .addValues(['createdAt', 'updatedAt', 'publishedAt', 'id']);

    const orderByFieldInputName = `${this.projectName}Get${name}OrderByInput`;
    this.contextService.schema.addInput(orderByFieldInputName).addFields([
      {
        type: FieldType.ref,
        refType: FieldRefType.enum,
        name: 'field',
        value: orderByEnumName,
        required: true,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.enum,
        name: 'direction',
        value: `${this.projectName}SortOrder`,
        required: true,
      },
    ]);

    const whereName = `${this.projectName}${name}WhereInput`;
    this.contextService.schema.addInput(whereName).addFields([
      {
        type: FieldType.refList,
        refType: FieldRefType.input,
        name: 'AND',
        value: whereName,
      },
      {
        type: FieldType.refList,
        refType: FieldRefType.input,
        name: 'NOT',
        value: whereName,
      },
      {
        type: FieldType.refList,
        refType: FieldRefType.input,
        name: 'OR',
        value: whereName,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'versionId',
        value: `${this.projectName}StringFilter`,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'createdId',
        value: `${this.projectName}StringFilter`,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'id',
        value: `${this.projectName}StringFilter`,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'readonly',
        value: `${this.projectName}BoolFilter`,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'createdAt',
        value: `${this.projectName}DateTimeFilter`,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'publishedAt',
        value: `${this.projectName}DateTimeFilter`,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'updatedAt',
        value: `${this.projectName}DateTimeFilter`,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'data',
        value: `${this.projectName}JsonFilter`,
      },
    ]);

    const getInputName = `${this.projectName}Get${name}Input`;
    this.contextService.schema.addInput(getInputName).addFields([
      { type: FieldType.int, name: 'first' },
      { type: FieldType.string, name: 'after' },
      {
        type: FieldType.refList,
        refType: FieldRefType.input,
        name: 'orderBy',
        value: orderByFieldInputName,
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'where',
        value: whereName,
      },
    ]);

    const listArgs = new GraphQLInputObjectType({
      name: getInputName,
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

  private get context() {
    return this.contextService.context;
  }
}
