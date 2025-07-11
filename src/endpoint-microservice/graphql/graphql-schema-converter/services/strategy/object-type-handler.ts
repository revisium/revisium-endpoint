import { createPropertyContext } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/schema-processing-context.utils';
import {
  JsonSchemaStore,
  JsonObjectStore,
} from 'src/endpoint-microservice/shared/schema';
import {
  FieldType,
  FieldRefType,
  TypeModelField,
  TypeModel,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { BaseSchemaTypeHandler } from './base-schema-type-handler';
import { SchemaProcessingContext } from './schema-processing-context.interface';
import { FieldResult } from './schema-type-handler.interface';
import { isEmptyStore } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isEmptyStore';
import { isValidName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isValidName';
import {
  hasDuplicateKeyCaseInsensitive,
  capitalize,
} from 'src/endpoint-microservice/shared/utils/stringUtils';
import { SystemSchemaIds } from 'src/endpoint-microservice/shared/schema-ids.consts';

export class ObjectTypeHandler extends BaseSchemaTypeHandler {
  public canHandle(schema: JsonSchemaStore): boolean {
    return schema.type === 'object';
  }

  public handle(context: SchemaProcessingContext): FieldResult {
    const objectSchema = this.validateAndGetObjectSchema(context.schema);
    const objectTypeName = this.getObjectTypeName(context);
    const validEntries = this.getValidPropertyEntries(objectSchema);
    const propertyKeys = validEntries.map(([key]) => key);

    const field = this.createObjectField(context, objectTypeName);
    const typeRef = this.registerObjectType(objectTypeName);
    this.processObjectProperties(
      context,
      validEntries,
      propertyKeys,
      objectTypeName,
      typeRef,
    );

    return this.createSimpleFieldResult(field);
  }

  private validateAndGetObjectSchema(schema: JsonSchemaStore): JsonObjectStore {
    if (!(schema instanceof JsonObjectStore)) {
      throw new Error('Schema must be a JsonObjectStore');
    }
    return schema;
  }

  private getObjectTypeName(context: SchemaProcessingContext): string {
    const baseTypeName = this.handlerContext.namingService.getTypeName(
      context.safetyTableId,
      context.isFlat ? 'flat' : 'base',
    );

    return this.handlerContext.namingService.getTypeNameWithPostfix(
      baseTypeName,
      context.postfix || '',
    );
  }

  private getValidPropertyEntries(
    objectSchema: JsonObjectStore,
  ): [string, JsonSchemaStore][] {
    return Object.entries(objectSchema.properties).filter(
      ([_, propertySchema]) => !isEmptyStore(propertySchema),
    );
  }

  private createObjectField(
    context: SchemaProcessingContext,
    objectTypeName: string,
  ): TypeModelField {
    return {
      name: context.fieldName,
      type: context.inList ? FieldType.refList : FieldType.ref,
      refType: FieldRefType.type,
      value: objectTypeName,
    };
  }

  private registerObjectType(objectTypeName: string) {
    return this.handlerContext.contextService.schema.addType(objectTypeName);
  }

  private processObjectProperties(
    context: SchemaProcessingContext,
    validEntries: [string, JsonSchemaStore][],
    propertyKeys: string[],
    objectTypeName: string,
    typeRef: TypeModel,
  ): void {
    validEntries.forEach(([key, itemSchema]) => {
      if (!isValidName(key)) {
        return;
      }

      this.processObjectProperty(
        context,
        key,
        itemSchema,
        propertyKeys,
        objectTypeName,
        typeRef,
      );
    });
  }

  private processObjectProperty(
    context: SchemaProcessingContext,
    key: string,
    itemSchema: JsonSchemaStore,
    propertyKeys: string[],
    objectTypeName: string,
    typeRef: TypeModel,
  ): void {
    const capitalizedSafetyKey = this.getSafePropertyKey(propertyKeys, key);

    this.processPropertySchema(
      context,
      key,
      itemSchema,
      capitalizedSafetyKey,
      objectTypeName,
    );
    this.handleEntityResolution(context, key, itemSchema, typeRef);
  }

  private getSafePropertyKey(propertyKeys: string[], key: string): string {
    return hasDuplicateKeyCaseInsensitive(propertyKeys, key)
      ? key
      : capitalize(key);
  }

  private processPropertySchema(
    context: SchemaProcessingContext,
    key: string,
    itemSchema: JsonSchemaStore,
    capitalizedSafetyKey: string,
    objectTypeName: string,
  ): void {
    this.handlerContext.modelService.processSchemaField(
      createPropertyContext(
        context,
        itemSchema,
        key,
        objectTypeName,
        capitalizedSafetyKey,
      ),
    );
  }

  private handleEntityResolution(
    context: SchemaProcessingContext,
    key: string,
    itemSchema: JsonSchemaStore,
    typeRef: TypeModel,
  ): void {
    if (this.isIdRefInRootObject(itemSchema, context)) {
      typeRef.entity = {
        keys: [key],
        resolve:
          this.handlerContext.resolverService.getItemFlatReferenceResolver(
            context.table,
          ),
      };
    }
  }

  private isIdRefInRootObject(
    itemSchema: JsonSchemaStore,
    context: SchemaProcessingContext,
  ): boolean {
    return itemSchema.$ref === SystemSchemaIds.RowId && !context.parentType;
  }
}
