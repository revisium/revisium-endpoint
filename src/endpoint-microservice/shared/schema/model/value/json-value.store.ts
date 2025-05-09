import {
  JsonArrayValueStore,
  JsonBooleanValueStore,
  JsonNumberValueStore,
  JsonObjectValueStore,
  JsonStringValueStore,
} from 'src/endpoint-microservice/shared/schema';

export type JsonValueStorePrimitives =
  | JsonStringValueStore
  | JsonNumberValueStore
  | JsonBooleanValueStore;

export type JsonValueStoreParent = JsonObjectValueStore | JsonArrayValueStore;

export type JsonValueStore = JsonValueStoreParent | JsonValueStorePrimitives;
