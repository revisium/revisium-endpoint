import {
  JsonArraySchema,
  JsonSchema,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export const isArraySchema = (
  schema: JsonSchema,
): schema is JsonArraySchema => {
  return !('$ref' in schema) && schema.type === JsonSchemaTypeName.Array;
};
