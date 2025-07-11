import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import { TypeModelField } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { SchemaProcessingContext } from './schema-processing-context.interface';

export interface FieldResult {
  field: TypeModelField;
  fieldThunk?: () => TypeModelField;
}

export interface SchemaTypeHandler {
  canHandle(schema: JsonSchemaStore): boolean;
  handle(context: SchemaProcessingContext): FieldResult;
}
