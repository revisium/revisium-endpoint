import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql/type';
import { GraphQLFieldConfig } from 'graphql/type/definition';
import { RowModel } from 'src/endpoint-microservice/core-api/generated/api';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  FieldRefType,
  FieldType,
  TypeModelField,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { DateTimeType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/dateTimeType';
import { JsonType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/jsonType';
import { SortDirection } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/sortDirection';
import { getProjectName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getProjectName';
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
const FLAT_KEY = 'Flat';
const ITEMS_POSTFIX = 'Items';

@Injectable()
export class ModelService {
  constructor(
    private readonly contextService: ContextService,
    private readonly resolver: ResolverService,
    private readonly cacheService: CacheService,
  ) {}

  public create(options: CreatingTableOptionsType[]) {
    this.createCommon();
    this.createNotRootForeignKey(options);
    this.createRootForeignKey(options);
  }

  public getNodeType(options: CreatingTableOptionsType) {
    const name = `${this.projectName}${options.safetyTableId}Node`;

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
      },
    ]);

    const data = this.getSchemaConfig(
      options,
      options.table.schema,
      DATA_KEY,
      `${this.projectName}${options.safetyTableId}`,
      false,
      DATA_KEY,
      name,
    );

    const node = new GraphQLObjectType<RowModel>({
      name,
      fields: () => ({
        versionId: { type: new GraphQLNonNull(GraphQLString) },
        createdId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(DateTimeType) },
        updatedAt: { type: new GraphQLNonNull(DateTimeType) },
        publishedAt: { type: new GraphQLNonNull(DateTimeType) },
        [DATA_KEY]: data.config,
        json: { type: JsonType, resolve: (parent) => parent.data },
      }),
    });

    return {
      node,
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
  ): { config: GraphQLFieldConfig<any, any>; field?: TypeModelField } {
    const foreignKeyConfig = this.tryGettingForeignKeyFieldConfig(
      schema,
      field,
      isFlat,
    );

    if (foreignKeyConfig) {
      return { config: foreignKeyConfig.config };
    }

    const foreignKeyArrayConfig = this.tryGettingForeignKeyArrayFieldConfig(
      schema,
      field,
      isFlat,
    );

    if (foreignKeyArrayConfig) {
      return { config: foreignKeyArrayConfig.config };
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

    const config: GraphQLFieldConfig<any, any> = {
      type: type.config,
    };

    if (schema.deprecated && schema.description) {
      config.deprecationReason = schema.description;
    } else if (schema.description) {
      config.description = schema.description;
    }

    return { config, field: type.field };
  }

  private tryGettingForeignKeyFieldConfig(
    schema: JsonSchema,
    field: string,
    isFlat: boolean = false,
  ): { config: GraphQLFieldConfig<any, any> } | null {
    const isForeignKey = isStringForeignSchema(schema);

    if (isForeignKey) {
      const config: GraphQLFieldConfig<any, any> = {
        type: isFlat
          ? this.cacheService.get(schema.foreignKey).dataFlat.type
          : new GraphQLNonNull(this.cacheService.get(schema.foreignKey).node),
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

      return { config };
    }

    return null;
  }

  private tryGettingForeignKeyArrayFieldConfig(
    schema: JsonSchema,
    field: string,
    isFlat: boolean = false,
  ): { config: GraphQLFieldConfig<any, any> } | null {
    if (isArraySchema(schema) && isStringForeignSchema(schema.items)) {
      const config: GraphQLFieldConfig<any, any> = {
        type: new GraphQLNonNull(
          new GraphQLList(
            isFlat
              ? this.cacheService.get(schema.items.foreignKey).dataFlat.type
              : new GraphQLNonNull(
                  this.cacheService.get(schema.items.foreignKey).node,
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

      return { config };
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
  ): { config: GraphQLNonNull<any>; field: TypeModelField } {
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

        return { config: new GraphQLNonNull(GraphQLString), field };
      }
      case 'number': {
        const field: TypeModelField = {
          name: fieldNameInParentObject,
          type: inList ? FieldType.floatList : FieldType.float,
        };

        if (parentType && fieldNameInParentObject) {
          this.contextService.schema.getType(parentType).addField(field);
        }

        return { config: new GraphQLNonNull(GraphQLFloat), field };
      }
      case 'boolean': {
        const field: TypeModelField = {
          name: fieldNameInParentObject,
          type: inList ? FieldType.booleanList : FieldType.boolean,
        };

        if (parentType && fieldNameInParentObject) {
          this.contextService.schema.getType(parentType).addField(field);
        }
        return { config: new GraphQLNonNull(GraphQLBoolean), field };
      }
      case 'object': {
        const objectConfig = this.getObjectSchema(
          options,
          `${typeName}${postfix}`,
          schema,
          isFlat,
          fieldNameInParentObject,
          parentType,
          inList,
        );

        return {
          config: new GraphQLNonNull(objectConfig.config),
          field: objectConfig.field,
        };
      }
      case 'array': {
        const arrayConfig = this.mapSchemaTypeToGraphQL(
          options,
          `${typeName}${postfix}`,
          schema.items,
          ITEMS_POSTFIX,
          isFlat,
          fieldNameInParentObject,
          parentType,
          true,
        );
        return {
          config: new GraphQLNonNull(new GraphQLList(arrayConfig.config)),
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
  ): { config: GraphQLObjectType; field: TypeModelField } {
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

    const type = new GraphQLObjectType({
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

            const config = this.getSchemaConfig(
              options,
              itemSchema,
              key,
              `${name}${capitalizedSafetyKey}`,
              isFlat,
              key,
              name,
            );

            fields[key] = config.config;
            return fields;
          },
          {} as Record<string, any>,
        ),
    });

    return {
      config: type,
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
    const flatType = `${this.projectName}${option.safetyTableId}${FLAT_KEY}`;

    const { node, nodeType } = this.getNodeType(option);
    const dataFlat = this.getDataFlatType(option, flatType, '');

    this.cacheService.add(option.table.id, {
      node,
      nodeType,
      dataFlat: dataFlat.config,
      dataFlatRoot: dataFlat.field,
    });
  }

  private get projectName(): string {
    return getProjectName(this.context.projectName);
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
      .addType(`${this.projectName}PageInfo`)
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
      .addEnum(`${this.projectName}SortOrder`)
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
      .addEnum(`${this.projectName}FilterStringMode`)
      .addValues(['default', 'insensitive']);

    this.contextService.schema
      .addInput(`${this.projectName}StringFilter`)
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
      .addInput(`${this.projectName}BoolFilter`)
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
      .addInput(`${this.projectName}DateTimeFilter`)
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
      .addEnum(`${this.projectName}FilterJsonMode`)
      .addValues(['default', 'insensitive']);

    const jsonScalar = this.contextService.schema.getScalar('JSON');

    this.contextService.schema
      .addInput(`${this.projectName}JsonFilter`)
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
