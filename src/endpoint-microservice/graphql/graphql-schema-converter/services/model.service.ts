import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { DateTimeType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/dateTimeType';
import { JsonType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/jsonType';
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
    this.createNotRootForeignKey(options);
    this.createRootForeignKey(options);
  }

  public getNodeType(options: CreatingTableOptionsType) {
    const node = new GraphQLObjectType<RowModel>({
      name: `${this.projectName}${options.safetyTableId}Node`,
      fields: () => ({
        versionId: { type: new GraphQLNonNull(GraphQLString) },
        createdId: { type: new GraphQLNonNull(GraphQLString) },
        id: { type: new GraphQLNonNull(GraphQLString) },
        createdAt: { type: new GraphQLNonNull(DateTimeType) },
        updatedAt: { type: new GraphQLNonNull(DateTimeType) },
        publishedAt: { type: new GraphQLNonNull(DateTimeType) },
        [DATA_KEY]: this.getSchemaConfig(
          options.table.schema,
          DATA_KEY,
          `${this.projectName}${options.safetyTableId}`,
        ),
        json: { type: JsonType, resolve: (parent) => parent.data },
      }),
    });

    return {
      node,
    };
  }

  public getDataFlatType(options: CreatingTableOptionsType) {
    return this.getSchemaConfig(
      options.table.schema,
      DATA_KEY,
      `${this.projectName}${options.safetyTableId}${FLAT_KEY}`,
      true,
    );
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

      return config;
    }

    return null;
  }

  private tryGettingForeignKeyArrayFieldConfig(
    schema: JsonSchema,
    field: string,
    isFlat: boolean = false,
  ): GraphQLFieldConfig<any, any> | null {
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

      return config;
    }

    return null;
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
    const { node } = this.getNodeType(option);
    const dataFlat = this.getDataFlatType(option);

    this.cacheService.add(option.table.id, {
      node,
      dataFlat,
    });
  }

  private get projectName(): string {
    return getProjectName(this.context.projectName);
  }

  private get context() {
    return this.contextService.context;
  }
}
