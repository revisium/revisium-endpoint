import { JsonSchemaStore } from '@revisium/schema-toolkit/model';
import { isStringForeignStore } from '../../utils/isStringForeignStore';
import { FieldRefType, FieldType, TypeModelField } from '../schema';
import { BaseSchemaTypeHandler } from './base-schema-type-handler';
import { SchemaProcessingContext } from './schema-processing-context.interface';
import { FieldResult } from './schema-type-handler.interface';

export class ForeignKeyHandler extends BaseSchemaTypeHandler {
  public canHandle(schema: JsonSchemaStore): boolean {
    return isStringForeignStore(schema);
  }

  public handle(context: SchemaProcessingContext): FieldResult {
    const foreignKey = this.extractForeignKey(context.schema);
    const field = this.createForeignKeyField(context, foreignKey);
    const fieldThunk = () => this.createFieldThunk(context, foreignKey);

    return this.createThunkFieldResult(field, fieldThunk);
  }

  private extractForeignKey(schema: JsonSchemaStore): string {
    if (!isStringForeignStore(schema)) {
      throw new Error('Schema is not a valid foreign key store');
    }
    return schema.foreignKey;
  }

  private createForeignKeyField(
    context: SchemaProcessingContext,
    foreignKey: string,
  ): TypeModelField {
    return {
      name: context.fieldName,
      type: FieldType.ref,
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
      resolver: this.handlerContext.resolverService.getFieldResolver(
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
      ? this.handlerContext.cacheService.getFlatRoot(foreignKey)
      : {
          name: '',
          type: FieldType.ref,
          refType: FieldRefType.type,
          value: this.handlerContext.cacheService.getRoot(foreignKey).name,
        };
  }
}
