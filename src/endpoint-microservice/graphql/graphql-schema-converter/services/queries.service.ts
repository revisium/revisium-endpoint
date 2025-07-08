import { Injectable } from '@nestjs/common';
import { GraphQLNonNull } from 'graphql/type';
import { GraphQLFieldConfig } from 'graphql/type/definition';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  FieldRefType,
  FieldType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
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
  ) {
    const nodeType = this.cacheService.get(options.table.id).dataFlatRoot;

    this.contextService.schema.query.addField({
      ...nodeType,
      name: flatSingularKey,
      args: {
        type: FieldType.string,
        name: 'id',
        required: true,
      },
      resolver: this.resolver.getItemFlatResolver(options.table),
    });
  }

  public createItemField(
    singularKey: string,
    options: CreatingTableOptionsType,
  ) {
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
      resolver: this.resolver.getItemResolver(options.table),
    });
  }

  public createListField(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    this.createListConnection(pluralKey, options);
    this.createListArgs(options.pluralSafetyTableId);

    return {
      type: new GraphQLNonNull(this.cacheService.get(options.table.id).node),
    };
  }

  public createListFlatField(
    flatPluralKey: string,
    options: CreatingTableOptionsType,
  ): GraphQLFieldConfig<any, any> {
    this.getFlatConnection(flatPluralKey, options);
    this.createListArgs(options.pluralSafetyTableId);

    return {
      type: this.cacheService.get(options.table.id).dataFlat.type,
    };
  }

  private getFlatConnection(
    flatPluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    const connectionName = `${this.projectName}${options.safetyTableId}${FLAT_KEY}${CONNECTION_KEY}`;
    const edgeName = `${this.projectName}${options.safetyTableId}${FLAT_KEY}${EDGE_KEY}`;
    const nodeType = this.cacheService.get(options.table.id).dataFlatRoot;

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
      resolver: this.resolver.getListFlatResolver(options.table),
    });
  }

  private createListConnection(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ) {
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
      resolver: this.resolver.getListResolver(options.table),
    });
  }

  private createListArgs(name: string) {
    const getInputName = `${this.projectName}Get${name}Input`;

    if (this.context.schema.inputs.has(getInputName)) {
      return;
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
  }

  private get projectName(): string {
    return getProjectName(this.context.projectName);
  }

  private get context() {
    return this.contextService.context;
  }
}
