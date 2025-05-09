import {
  JsonValueStore,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export const traverseValue = (
  store: JsonValueStore,
  callback: (node: JsonValueStore) => void,
) => {
  callback(store);

  if (store.type === JsonSchemaTypeName.Object) {
    Object.values(store.value).forEach((item) => {
      traverseValue(item, callback);
    });
  } else if (store.type === JsonSchemaTypeName.Array) {
    store.value.forEach((itemValue) => {
      traverseValue(itemValue, callback);
    });
  }
};
