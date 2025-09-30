import {
  JsonArraySchema,
  JsonSchema,
  JsonSchemaTypeName,
} from '@revisium/schema-toolkit/types';

export const isArraySchema = (
  schema: JsonSchema,
): schema is JsonArraySchema => {
  return !('$ref' in schema) && schema.type === JsonSchemaTypeName.Array;
};
