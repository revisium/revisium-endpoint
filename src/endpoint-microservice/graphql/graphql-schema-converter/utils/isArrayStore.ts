import {
  JsonArrayStore,
  JsonSchemaStore,
} from '@revisium/schema-toolkit/model';

export const isArrayStore = (
  store: JsonSchemaStore,
): store is JsonArrayStore => {
  return store instanceof JsonArrayStore;
};
