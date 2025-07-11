import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { NamingService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/naming.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  FieldRefType,
  FieldType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';

@Injectable()
export class QueriesService {
  constructor(
    private readonly contextService: ContextService,
    private readonly cacheService: CacheService,
    private readonly resolver: ResolverService,
    private readonly namingService: NamingService,
  ) {}

  public createItemFlatField(
    flatSingularKey: string,
    options: CreatingTableOptionsType,
  ) {
    const flatRoot = this.cacheService.getFlatRoot(options.table.id);

    this.contextService.schema.query.addField({
      ...flatRoot,
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
    const root = this.cacheService.getRoot(options.table.id);

    this.contextService.schema.query.addField({
      type: FieldType.ref,
      name: singularKey,
      value: root.name,
      args: {
        type: FieldType.string,
        name: 'id',
        required: true,
      },
      resolver: this.resolver.getItemResolver(options.table),
    });
  }

  public createListField(pluralKey: string, options: CreatingTableOptionsType) {
    this.createListConnection(pluralKey, options);
    this.createListArgs(options.pluralSafetyTableId);
  }

  public createListFlatField(
    flatPluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.getFlatConnection(flatPluralKey, options);
    this.createListArgs(options.pluralSafetyTableId);
  }

  private getFlatConnection(
    flatPluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    const connectionName = this.namingService.getTypeName(
      options.safetyTableId,
      'flatConnection',
    );
    const edgeName = this.namingService.getTypeName(
      options.safetyTableId,
      'flatEdge',
    );
    const flatRoot = this.cacheService.getFlatRoot(options.table.id);

    this.contextService.schema.addType(edgeName).addFields([
      {
        type: FieldType.string,
        name: 'cursor',
      },
      {
        ...flatRoot,
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
        value: this.namingService.getSystemTypeName('pageInfo'),
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
        value: this.namingService.getGetInputTypeName(
          options.pluralSafetyTableId,
        ),
      },
      resolver: this.resolver.getListFlatResolver(options.table),
    });
  }

  private createListConnection(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    const name = this.namingService.getTypeName(
      options.safetyTableId,
      'connection',
    );

    const edgeName = this.namingService.getTypeName(
      options.safetyTableId,
      'edge',
    );

    this.contextService.schema.addType(edgeName).addFields([
      {
        type: FieldType.string,
        name: 'cursor',
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.type,
        name: 'node',
        value: this.namingService.getTypeName(options.safetyTableId, 'node'),
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
        value: this.namingService.getSystemTypeName('pageInfo'),
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
        value: this.namingService.getGetInputTypeName(
          options.pluralSafetyTableId,
        ),
      },
      resolver: this.resolver.getListResolver(options.table),
    });
  }

  private createListArgs(name: string) {
    const getInputName = this.namingService.getGetInputTypeName(name);

    if (this.contextService.schema.inputs.has(getInputName)) {
      return;
    }

    const orderByEnumName = this.namingService.getOrderByFieldEnumName(name);
    this.contextService.schema
      .addEnum(orderByEnumName)
      .addValues(['createdAt', 'updatedAt', 'publishedAt', 'id']);

    const orderByFieldInputName =
      this.namingService.getOrderByInputTypeName(name);
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
        value: this.namingService.getSystemTypeName('sortOrder'),
        required: true,
      },
    ]);

    const whereName = this.namingService.getWhereInputTypeName(name);
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
        value: this.namingService.getSystemFilterTypeName('string'),
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'createdId',
        value: this.namingService.getSystemFilterTypeName('string'),
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'id',
        value: this.namingService.getSystemFilterTypeName('string'),
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'readonly',
        value: this.namingService.getSystemFilterTypeName('bool'),
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'createdAt',
        value: this.namingService.getSystemFilterTypeName('dateTime'),
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'publishedAt',
        value: this.namingService.getSystemFilterTypeName('dateTime'),
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'updatedAt',
        value: this.namingService.getSystemFilterTypeName('dateTime'),
      },
      {
        type: FieldType.ref,
        refType: FieldRefType.input,
        name: 'data',
        value: this.namingService.getSystemFilterTypeName('json'),
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

  private get context() {
    return this.contextService.context;
  }
}
