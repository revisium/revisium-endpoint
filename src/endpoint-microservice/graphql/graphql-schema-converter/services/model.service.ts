import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { NamingService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/naming.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  FieldRefType,
  FieldType,
  TypeModelField,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { SortDirection } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/sortDirection';
import { isArraySchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isArraySchema';
import { isEmptyObject } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isEmptyObject';
import { isRootForeignSchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isRootForeignSchema';
import { isStringForeignSchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isStringForeignSchema';
import { isValidName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isValidName';
import {
  JsonObjectSchema,
  JsonSchema,
} from 'src/endpoint-microservice/shared/schema';
import {
  capitalize,
  hasDuplicateKeyCaseInsensitive,
} from 'src/endpoint-microservice/shared/utils/stringUtils';

const DATA_KEY = 'data';
const ITEMS_POSTFIX = 'Items';

@Injectable()
export class ModelService {
  constructor(
    private readonly contextService: ContextService,
    private readonly resolver: ResolverService,
    private readonly cacheService: CacheService,
    private readonly namingService: NamingService,
  ) {}

  public create(options: CreatingTableOptionsType[]) {
    this.createCommon();
    this.createNotRootForeignKey(options);
    this.createRootForeignKey(options);
  }

  public getNodeType(options: CreatingTableOptionsType) {
    const name = this.namingService.getTypeName(options.safetyTableId, 'node');

    const nodeType = this.contextService.schema.addType(name).addFields([
      { name: 'versionId', type: FieldType.string },
      { name: 'createdId', type: FieldType.string },
      { name: 'id', type: FieldType.string },
      {
        name: 'createdAt',
        type: FieldType.ref,
        refType: FieldRefType.scalar,
        value: 'DateTime',
      },
      {
        name: 'updatedAt',
        type: FieldType.ref,
        refType: FieldRefType.scalar,
        value: 'DateTime',
      },
      {
        name: 'publishedAt',
        type: FieldType.ref,
        refType: FieldRefType.scalar,
        value: 'DateTime',
      },
      {
        name: 'json',
        type: FieldType.ref,
        refType: FieldRefType.scalar,
        value: 'JSON',
        resolver: (parent) => parent.data,
      },
    ]);

    nodeType.entity = {
      keys: ['id'],
      resolve: this.resolver.getItemReferenceResolver(options.table),
    };

    this.getSchemaConfig(
      options,
      options.table.schema,
      DATA_KEY,
      this.namingService.getTypeName(options.safetyTableId, 'base'),
      false,
      DATA_KEY,
      name,
    );

    return {
      nodeType,
    };
  }

  public getDataFlatType(
    options: CreatingTableOptionsType,
    flatType: string,
    parentType: string,
  ) {
    return this.getSchemaConfig(
      options,
      options.table.schema,
      DATA_KEY,
      flatType,
      true,
      'userFlat',
      parentType,
    );
  }

  private getSchemaConfig(
    options: CreatingTableOptionsType,
    schema: JsonSchema,
    field: string,
    typeName: string,
    isFlat: boolean,
    fieldNameInParentObject: string,
    parentType: string,
  ): { field: TypeModelField } {
    const foreignKeyConfig = this.tryGettingForeignKeyFieldConfig(
      schema,
      field,
      isFlat,
      fieldNameInParentObject,
      parentType,
    );

    if (foreignKeyConfig) {
      return { field: foreignKeyConfig.field };
    }

    const foreignKeyArrayConfig = this.tryGettingForeignKeyArrayFieldConfig(
      schema,
      field,
      isFlat,
      fieldNameInParentObject,
      parentType,
    );

    if (foreignKeyArrayConfig) {
      return {
        field: foreignKeyArrayConfig.field,
      };
    }

    const type = this.mapSchemaTypeToGraphQL(
      options,
      typeName,
      schema,
      '',
      isFlat,
      fieldNameInParentObject,
      parentType,
      false,
    );

    if (schema.deprecated && schema.description) {
      type.field.deprecationReason = schema.description;
    } else if (schema.description) {
      type.field.description = schema.description;
    }

    return { field: type.field };
  }

  private tryGettingForeignKeyFieldConfig(
    schema: JsonSchema,
    field: string,
    isFlat: boolean,
    fieldNameInParentObject: string,
    parentType: string,
  ): { field: TypeModelField } | null {
    const isForeignKey = isStringForeignSchema(schema);

    if (isForeignKey) {
      const foreignKey = schema.foreignKey;
      const fieldThunk = () => {
        const fieldType: TypeModelField = {
          ...(isFlat
            ? this.cacheService.get(foreignKey).dataFlatRoot
            : {
                type: FieldType.ref,
                refType: FieldRefType.type,
                value: this.cacheService.get(foreignKey).nodeType.name,
              }),
          name: fieldNameInParentObject,
          resolver: this.resolver.getFieldResolver(foreignKey, field, isFlat),
        };

        if (schema.deprecated && schema.description) {
          fieldType.deprecationReason = schema.description;
        } else if (schema.description) {
          fieldType.description = schema.description;
        }

        return fieldType;
      };

      if (parentType && fieldNameInParentObject) {
        this.contextService.schema
          .getType(parentType)
          .addFieldThunk(fieldNameInParentObject, fieldThunk);
      }

      return {
        field: {
          name: fieldNameInParentObject,
          type: FieldType.ref,
          refType: FieldRefType.type,
          value: this.namingService.getForeignKeyTypeName(foreignKey, isFlat),
        },
      };
    }

    return null;
  }

  private convertToListField(model: TypeModelField): TypeModelField {
    const nextModel: TypeModelField = { ...model };

    if (model.type === FieldType.string) {
      nextModel.type = FieldType.stringList;
    } else if (model.type === FieldType.int) {
      nextModel.type = FieldType.intList;
    } else if (model.type === FieldType.float) {
      nextModel.type = FieldType.floatList;
    } else if (model.type === FieldType.boolean) {
      nextModel.type = FieldType.booleanList;
    } else if (model.type === FieldType.ref) {
      nextModel.type = FieldType.refList;
    }

    return nextModel;
  }

  private tryGettingForeignKeyArrayFieldConfig(
    schema: JsonSchema,
    field: string,
    isFlat: boolean,
    fieldNameInParentObject: string,
    parentType: string,
  ): { field: TypeModelField } | null {
    if (isArraySchema(schema) && isStringForeignSchema(schema.items)) {
      const items = schema.items;
      const foreignKey = items.foreignKey;
      const fieldThunk = () => {
        const fieldType: TypeModelField = {
          ...(isFlat
            ? {
                ...this.convertToListField(
                  this.cacheService.get(foreignKey).dataFlatRoot,
                ),
              }
            : {
                type: FieldType.refList,
                refType: FieldRefType.type,
                value: this.cacheService.get(foreignKey).nodeType.name,
              }),
          name: fieldNameInParentObject,
          resolver: this.resolver.getFieldArrayItemResolver(
            foreignKey,
            field,
            isFlat,
          ),
        };

        if (schema.deprecated && schema.description) {
          fieldType.deprecationReason = schema.description;
        } else if (schema.description) {
          fieldType.description = schema.description;
        }

        return fieldType;
      };

      if (parentType && fieldNameInParentObject) {
        this.contextService.schema
          .getType(parentType)
          .addFieldThunk(fieldNameInParentObject, fieldThunk);
      }

      return {
        field: {
          name: fieldNameInParentObject,
          type: FieldType.refList,
          refType: FieldRefType.type,
          value: this.namingService.getForeignKeyTypeName(foreignKey, isFlat),
        },
      };
    }

    return null;
  }

  private mapSchemaTypeToGraphQL(
    options: CreatingTableOptionsType,
    typeName: string,
    schema: JsonSchema,
    postfix: string,
    isFlat: boolean,
    fieldNameInParentObject: string,
    parentType: string,
    inList: boolean,
  ): { field: TypeModelField } {
    if ('$ref' in schema) {
      throw new InternalServerErrorException(
        `endpointId: ${this.context.endpointId}, unsupported $ref in schema: ${JSON.stringify(schema)}`,
      );
    }

    switch (schema.type) {
      case 'string': {
        const field: TypeModelField = {
          name: fieldNameInParentObject,
          type: inList ? FieldType.stringList : FieldType.string,
        };

        if (parentType && fieldNameInParentObject) {
          this.contextService.schema.getType(parentType).addField(field);
        }

        return { field };
      }
      case 'number': {
        const field: TypeModelField = {
          name: fieldNameInParentObject,
          type: inList ? FieldType.floatList : FieldType.float,
        };

        if (parentType && fieldNameInParentObject) {
          this.contextService.schema.getType(parentType).addField(field);
        }

        return { field };
      }
      case 'boolean': {
        const field: TypeModelField = {
          name: fieldNameInParentObject,
          type: inList ? FieldType.booleanList : FieldType.boolean,
        };

        if (parentType && fieldNameInParentObject) {
          this.contextService.schema.getType(parentType).addField(field);
        }
        return { field };
      }
      case 'object': {
        const objectConfig = this.getObjectSchema(
          options,
          this.namingService.getTypeNameWithPostfix(typeName, postfix),
          schema,
          isFlat,
          fieldNameInParentObject,
          parentType,
          inList,
        );

        return {
          field: objectConfig.field,
        };
      }
      case 'array': {
        const arrayConfig = this.mapSchemaTypeToGraphQL(
          options,
          this.namingService.getTypeNameWithPostfix(typeName, postfix),
          schema.items,
          ITEMS_POSTFIX,
          isFlat,
          fieldNameInParentObject,
          parentType,
          true,
        );
        return {
          field: arrayConfig.field,
        };
      }
      default:
        throw new InternalServerErrorException(
          `endpointId: ${this.context.endpointId}, unknown schema: ${JSON.stringify(schema)}`,
        );
    }
  }

  private getObjectSchema(
    options: CreatingTableOptionsType,
    name: string,
    schema: JsonObjectSchema,
    isFlat: boolean,
    fieldNameInParentObject: string,
    parentType: string,
    inList: boolean,
  ): { field: TypeModelField } {
    const validEntries = Object.entries(schema.properties).filter(
      ([_, propertySchema]) => !isEmptyObject(propertySchema),
    );

    const ids = validEntries.map(([key]) => key);

    const field: TypeModelField = {
      name: fieldNameInParentObject,
      type: inList ? FieldType.refList : FieldType.ref,
      refType: FieldRefType.type,
      value: name,
    };

    if (parentType && fieldNameInParentObject) {
      this.contextService.schema.getType(parentType).addField(field);
    }
    this.contextService.schema.addType(name);

    validEntries.forEach(([key, itemSchema]) => {
      if (!isValidName(key)) {
        return;
      }

      const capitalizedSafetyKey = hasDuplicateKeyCaseInsensitive(ids, key)
        ? key
        : capitalize(key);

      this.getSchemaConfig(
        options,
        itemSchema,
        key,
        this.namingService.getTypeNameWithPostfix(name, capitalizedSafetyKey),
        isFlat,
        key,
        name,
      );
    });

    return {
      field,
    };
  }

  private createNotRootForeignKey(options: CreatingTableOptionsType[]) {
    for (const option of options) {
      const schema = option.table.schema;

      if (isRootForeignSchema(schema)) {
        continue;
      }

      this.createNodeCache(option);
    }
  }

  private createRootForeignKey(options: CreatingTableOptionsType[]) {
    for (const option of options) {
      const schema = option.table.schema;

      if (isRootForeignSchema(schema)) {
        this.createNodeCache(option);
      }
    }
  }

  private createNodeCache(option: CreatingTableOptionsType): void {
    const flatType = this.namingService.getTypeName(
      option.safetyTableId,
      'flat',
    );

    const { nodeType } = this.getNodeType(option);
    const dataFlat = this.getDataFlatType(option, flatType, '');

    this.cacheService.add(option.table.id, {
      nodeType,
      dataFlatRoot: dataFlat.field,
    });
  }

  private get context() {
    return this.contextService.context;
  }

  private createCommon() {
    this.addScalars();
    this.addPageInfo();
    this.addSortOrder();
    this.addFilters();
  }

  private addScalars() {
    this.contextService.schema.addScalar('JSON', JSONResolver);
    this.contextService.schema.addScalar('DateTime', DateTimeResolver);
  }

  private addPageInfo() {
    this.contextService.schema
      .addType(this.namingService.getSystemTypeName('pageInfo'))
      .addField({
        name: 'startCursor',
        type: FieldType.string,
        nullable: true,
      })
      .addField({
        name: 'endCursor',
        type: FieldType.string,
        nullable: true,
      })
      .addField({
        name: 'hasNextPage',
        type: FieldType.boolean,
      })
      .addField({
        name: 'hasPreviousPage',
        type: FieldType.boolean,
      });
  }

  private addSortOrder() {
    this.contextService.schema
      .addEnum(this.namingService.getSystemTypeName('sortOrder'))
      .addValues([SortDirection.ASC, SortDirection.DESC]);
  }

  private addFilters() {
    this.addStringFilter();
    this.addBooleanFilter();
    this.addDateTimeFilter();
    this.addJsonFilter();
  }

  private addStringFilter() {
    const mode = this.contextService.schema
      .addEnum(this.namingService.getSystemFilterModeEnumName('string'))
      .addValues(['default', 'insensitive']);

    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('string'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.string,
        },
        {
          name: 'in',
          type: FieldType.stringList,
        },
        {
          name: 'notIn',
          type: FieldType.stringList,
        },
        {
          name: 'lt',
          type: FieldType.string,
        },
        {
          name: 'lte',
          type: FieldType.string,
        },
        {
          name: 'gt',
          type: FieldType.string,
        },
        {
          name: 'gte',
          type: FieldType.string,
        },
        {
          name: 'contains',
          type: FieldType.string,
        },
        {
          name: 'startsWith',
          type: FieldType.string,
        },
        {
          name: 'endsWith',
          type: FieldType.string,
        },
        {
          name: 'mode',
          type: FieldType.ref,
          refType: FieldRefType.enum,
          value: mode.name,
        },
        {
          name: 'not',
          type: FieldType.string,
        },
      ]);
  }

  private addBooleanFilter() {
    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('bool'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.boolean,
        },
        {
          name: 'not',
          type: FieldType.boolean,
        },
      ]);
  }

  private addDateTimeFilter() {
    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('dateTime'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.string,
        },
        {
          name: 'in',
          type: FieldType.stringList,
        },
        {
          name: 'notIn',
          type: FieldType.stringList,
        },
        {
          name: 'lt',
          type: FieldType.string,
        },
        {
          name: 'lte',
          type: FieldType.string,
        },
        {
          name: 'gt',
          type: FieldType.string,
        },
        {
          name: 'gte',
          type: FieldType.string,
        },
      ]);
  }

  private addJsonFilter() {
    const mode = this.contextService.schema
      .addEnum(this.namingService.getSystemFilterModeEnumName('json'))
      .addValues(['default', 'insensitive']);

    const jsonScalar = this.contextService.schema.getScalar('JSON');

    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('json'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'path',
          type: FieldType.stringList,
        },
        {
          name: 'mode',
          type: FieldType.ref,
          refType: FieldRefType.enum,
          value: mode.name,
        },
        {
          name: 'string_contains',
          type: FieldType.string,
        },
        {
          name: 'string_starts_with',
          type: FieldType.string,
        },
        {
          name: 'string_ends_with',
          type: FieldType.string,
        },
        {
          name: 'array_contains',
          type: FieldType.refList,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'array_starts_with',
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'array_ends_with',
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'lt',
          type: FieldType.float,
        },
        {
          name: 'lte',
          type: FieldType.float,
        },
        {
          name: 'gt',
          type: FieldType.float,
        },
        {
          name: 'gte',
          type: FieldType.float,
        },
      ]);
  }
}
