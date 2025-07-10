import {
  JsonArrayStore,
  JsonSchemaStore,
} from 'src/endpoint-microservice/shared/schema';

export const isArrayStore = (
  store: JsonSchemaStore,
): store is JsonArrayStore => {
  return store instanceof JsonArrayStore;
};
