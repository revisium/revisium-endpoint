import {
  JsonArrayStore,
  JsonObjectStore,
  JsonSchemaStore,
} from 'src/endpoint-microservice/shared/schema';

export const isEmptyStore = (store: JsonSchemaStore): boolean => {
  if (store instanceof JsonObjectStore) {
    const countProperties = Object.keys(store.properties).length;

    if (countProperties === 0) {
      return true;
    } else {
      return Object.values(store.properties).every((property) =>
        isEmptyStore(property),
      );
    }
  }

  if (store instanceof JsonArrayStore) {
    return isEmptyStore(store.items);
  }

  return false;
};
