import { isArrayStore } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isArrayStore';
import { isStringForeignStore } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isStringForeignStore';
import { JsonSchemaStore } from '@revisium/schema-toolkit/model';

export const isRootForeignStore = (store: JsonSchemaStore) =>
  isStringForeignStore(store) ||
  (isArrayStore(store) && isStringForeignStore(store.items));
