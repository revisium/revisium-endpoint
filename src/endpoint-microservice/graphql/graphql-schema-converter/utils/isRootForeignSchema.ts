import { isArraySchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isArraySchema';
import { isStringForeignSchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isStringForeignSchema';
import { JsonSchema } from 'src/endpoint-microservice/shared/schema';

export const isRootForeignSchema = (schema: JsonSchema) =>
  isStringForeignSchema(schema) ||
  (isArraySchema(schema) && isStringForeignSchema(schema.items));
