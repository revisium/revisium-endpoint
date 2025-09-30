import { isArraySchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isArraySchema';
import { isStringForeignSchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isStringForeignSchema';
import { JsonSchema } from '@revisium/schema-toolkit/types';

export const isRootForeignSchema = (schema: JsonSchema) =>
  isStringForeignSchema(schema) ||
  (isArraySchema(schema) && isStringForeignSchema(schema.items));
