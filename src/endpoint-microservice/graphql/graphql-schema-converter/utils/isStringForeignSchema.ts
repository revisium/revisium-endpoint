import {
  JsonSchema,
  JsonSchemaTypeName,
  JsonStringSchema,
} from '@revisium/schema-toolkit/types';

export const isStringForeignSchema = (
  schema: JsonSchema,
): schema is JsonStringSchema & { foreignKey: string } => {
  return (
    !('$ref' in schema) &&
    schema.type === JsonSchemaTypeName.String &&
    schema.foreignKey !== undefined
  );
};
