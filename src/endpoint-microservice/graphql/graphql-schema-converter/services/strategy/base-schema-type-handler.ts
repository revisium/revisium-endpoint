import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import { TypeModelField } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import {
  SchemaTypeHandler,
  FieldResult,
} from './schema-type-handler.interface';
import { SchemaTypeHandlerContext } from './schema-type-handler-context.interface';
import { SchemaProcessingContext } from './schema-processing-context.interface';

export abstract class BaseSchemaTypeHandler implements SchemaTypeHandler {
  constructor(protected readonly handlerContext: SchemaTypeHandlerContext) {}

  abstract canHandle(schema: JsonSchemaStore): boolean;
  abstract handle(context: SchemaProcessingContext): FieldResult;

  protected createSimpleFieldResult(field: TypeModelField): FieldResult {
    return {
      field,
    };
  }

  protected createThunkFieldResult(
    field: TypeModelField,
    fieldThunk: () => TypeModelField,
  ): FieldResult {
    return {
      field,
      fieldThunk,
    };
  }
}
