import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import {
  FieldType,
  TypeModelField,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { BaseSchemaTypeHandler } from './base-schema-type-handler';
import { SchemaProcessingContext } from './schema-processing-context.interface';
import { FieldResult } from './schema-type-handler.interface';

export class StringTypeHandler extends BaseSchemaTypeHandler {
  public canHandle(schema: JsonSchemaStore): boolean {
    return schema.type === 'string';
  }

  public handle(context: SchemaProcessingContext): FieldResult {
    const field: TypeModelField = {
      name: context.fieldName,
      type: context.inList ? FieldType.stringList : FieldType.string,
    };

    return this.createSimpleFieldResult(field);
  }
}
