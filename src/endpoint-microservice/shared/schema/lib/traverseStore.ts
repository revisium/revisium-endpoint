import {
  JsonSchemaStore,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export const traverseStore = (
  store: JsonSchemaStore,
  callback: (node: JsonSchemaStore) => void,
) => {
  callback(store);

  if (store.type === JsonSchemaTypeName.Object) {
    Object.values(store.properties).forEach((item) => {
      traverseStore(item, callback);
    });
  } else if (store.type === JsonSchemaTypeName.Array) {
    traverseStore(store.items, callback);
  }
};
