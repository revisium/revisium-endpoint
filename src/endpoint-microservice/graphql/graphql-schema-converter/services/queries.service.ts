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

  public createItemField(
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

  public createListField(
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    const ConnectionType = this.getListConnection(options);
    return {
      type: new GraphQLNonNull(ConnectionType),
      args: { data: { type: this.getListArgs(options.pluralSafetyTableId) } },
      resolve: this.resolver.getListResolver(options.table),
    };
  }

  public createListFlatField(
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

  private get context() {
    return this.contextService.context;
  }
}
