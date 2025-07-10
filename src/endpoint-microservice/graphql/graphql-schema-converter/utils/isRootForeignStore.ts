import { isArrayStore } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isArrayStore';
import { isStringForeignStore } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isStringForeignStore';
import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';

export const isRootForeignStore = (store: JsonSchemaStore) =>
  isStringForeignStore(store) ||
  (isArrayStore(store) && isStringForeignStore(store.items));
