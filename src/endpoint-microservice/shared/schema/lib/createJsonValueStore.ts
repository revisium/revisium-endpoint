import {
  JsonArrayStore,
  JsonObjectStore,
  JsonSchemaStore,
  JsonSchemaStorePrimitives,
  JsonArrayValueStore,
  JsonBooleanValueStore,
  JsonNumberValueStore,
  JsonObjectValueStore,
  JsonStringValueStore,
  JsonValueStore,
  JsonValueStorePrimitives,
  JsonArray,
  JsonObject,
  JsonPrimitives,
  JsonValue,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export const createJsonValueStore = (
  schema: JsonSchemaStore,
  rowId: string,
  rawValue: JsonValue,
): JsonValueStore => {
  if (schema.type === JsonSchemaTypeName.Object) {
    return createJsonObjectValueStore(schema, rowId, rawValue as JsonObject);
  } else if (schema.type === JsonSchemaTypeName.Array) {
    return createJsonArrayValueStore(schema, rowId, rawValue as JsonArray);
  } else {
    return createPrimitiveValueStore(schema, rowId, rawValue as JsonPrimitives);
  }
};

export const createJsonObjectValueStore = (
  schema: JsonObjectStore,
  rowId: string,
  rawValue: JsonObject,
): JsonObjectValueStore => {
  const value = Object.entries(rawValue).reduce<Record<string, JsonValueStore>>(
    (reduceValue, [key, itemValue]) => {
      const itemSchema = schema.getProperty(key);

      if (itemSchema === undefined || itemValue === undefined) {
        throw new Error('Invalid item');
      }

      reduceValue[key] = createJsonValueStore(itemSchema, rowId, itemValue);

      return reduceValue;
    },
    {},
  );

  return new JsonObjectValueStore(schema, rowId, value);
};

export const createJsonArrayValueStore = (
  schema: JsonArrayStore,
  rowId: string,
  rawValue: JsonArray,
): JsonArrayValueStore => {
  const value = rawValue.map((value) =>
    createJsonValueStore(schema.items, rowId, value),
  );

  return new JsonArrayValueStore(schema, rowId, value);
};

export const createPrimitiveValueStore = (
  schema: JsonSchemaStorePrimitives,
  rowId: string,
  rawValue: JsonPrimitives,
): JsonValueStorePrimitives => {
  if (schema.type === JsonSchemaTypeName.String) {
    return new JsonStringValueStore(schema, rowId, rawValue as string | null);
  } else if (schema.type === JsonSchemaTypeName.Number) {
    return new JsonNumberValueStore(schema, rowId, rawValue as number | null);
  } else if (schema.type === JsonSchemaTypeName.Boolean) {
    return new JsonBooleanValueStore(schema, rowId, rawValue as boolean | null);
  } else {
    throw new Error('this type is not allowed');
  }
};
