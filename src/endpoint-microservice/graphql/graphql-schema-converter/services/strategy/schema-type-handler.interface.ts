import { JsonSchemaStore } from '@revisium/schema-toolkit/model';
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
