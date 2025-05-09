import {
  JsonArrayStore,
  JsonBooleanStore,
  JsonNumberStore,
  JsonObjectStore,
  JsonStringStore,
} from 'src/endpoint-microservice/shared/schema';

export type JsonSchemaStorePrimitives =
  | JsonStringStore
  | JsonNumberStore
  | JsonBooleanStore;

export type JsonSchemaStore =
  | JsonObjectStore
  | JsonArrayStore
  | JsonSchemaStorePrimitives;
