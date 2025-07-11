import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import {
  FieldType,
  TypeModelField,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { BaseSchemaTypeHandler } from './base-schema-type-handler';
import { SchemaProcessingContext } from './schema-processing-context.interface';
import { FieldResult } from './schema-type-handler.interface';

export class NumberTypeHandler extends BaseSchemaTypeHandler {
  public canHandle(schema: JsonSchemaStore): boolean {
    return schema.type === 'number';
  }

  public handle(context: SchemaProcessingContext): FieldResult {
    const field: TypeModelField = {
      name: context.fieldName,
      type: context.inList ? FieldType.floatList : FieldType.float,
    };

    return this.createSimpleFieldResult(field);
  }
}
