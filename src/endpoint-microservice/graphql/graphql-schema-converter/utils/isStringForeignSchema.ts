import {
  JsonSchema,
  JsonSchemaTypeName,
  JsonStringSchema,
} from 'src/endpoint-microservice/shared/schema';

export const isStringForeignSchema = (
  schema: JsonSchema,
): schema is JsonStringSchema & { foreignKey: string } => {
  return (
    !('$ref' in schema) &&
    schema.type === JsonSchemaTypeName.String &&
    schema.foreignKey !== undefined
  );
};
