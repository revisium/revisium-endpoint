import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import { isArrayStore } from '../../utils/isArrayStore';
import { isStringForeignStore } from '../../utils/isStringForeignStore';
import { FieldRefType, FieldType, TypeModelField } from '../schema';
import { BaseSchemaTypeHandler } from './base-schema-type-handler';
import { SchemaProcessingContext } from './schema-processing-context.interface';
import { FieldResult } from './schema-type-handler.interface';

export class ForeignKeyArrayHandler extends BaseSchemaTypeHandler {
  public canHandle(schema: JsonSchemaStore): boolean {
    return isArrayStore(schema) && isStringForeignStore(schema.items);
  }

  public handle(context: SchemaProcessingContext): FieldResult {
    this.validateArraySchema(context.schema);

    const foreignKey = this.extractForeignKey(context.schema);
    const field = this.createForeignKeyArrayField(context, foreignKey);
    const fieldThunk = () => this.createFieldThunk(context, foreignKey);

    return this.createThunkFieldResult(field, fieldThunk);
  }

  private validateArraySchema(schema: JsonSchemaStore): void {
    if (!isArrayStore(schema)) {
      throw new Error('Schema must be an array store');
    }
  }

  private extractForeignKey(schema: JsonSchemaStore): string {
    if (!isArrayStore(schema)) {
      throw new Error('Schema must be an array store');
    }
    const items = schema.items;

    if (!isStringForeignStore(items)) {
      throw new Error('Array items must be a string foreign store');
    }
    return items.foreignKey;
  }

  private createForeignKeyArrayField(
    context: SchemaProcessingContext,
    foreignKey: string,
  ): TypeModelField {
    return {
      name: context.fieldName,
      type: FieldType.refList,
      refType: FieldRefType.type,
      value: this.handlerContext.namingService.getForeignKeyTypeName(
        foreignKey,
        context.isFlat,
      ),
    };
  }

  private createFieldThunk(
    context: SchemaProcessingContext,
    foreignKey: string,
  ): TypeModelField {
    const baseFieldType = this.getFieldTypeDefinition(context, foreignKey);

    return {
      ...baseFieldType,
      name: context.fieldName,
      resolver: this.handlerContext.resolverService.getFieldArrayItemResolver(
        foreignKey,
        context.resolverFieldName || context.fieldName,
        context.isFlat,
      ),
    };
  }

  private getFieldTypeDefinition(
    context: SchemaProcessingContext,
    foreignKey: string,
  ): TypeModelField {
    return context.isFlat
      ? this.convertToListField(
          this.handlerContext.cacheService.get(foreignKey).dataFlatRoot,
        )
      : {
          name: '',
          type: FieldType.refList,
          refType: FieldRefType.type,
          value: this.handlerContext.cacheService.get(foreignKey).nodeType.name,
        };
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
}
