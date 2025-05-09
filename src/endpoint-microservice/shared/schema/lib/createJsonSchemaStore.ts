import {
  JsonArrayStore,
  JsonBooleanStore,
  JsonNumberStore,
  JsonStringStore,
  JsonObjectStore,
  JsonSchemaStore,
  JsonSchemaStorePrimitives,
  JsonObjectSchema,
  JsonSchema,
  JsonSchemaPrimitives,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export type RefsType = Record<string, JsonSchema>;

export const createJsonSchemaStore = (
  schema: JsonSchema,
  refs: RefsType = {},
): JsonSchemaStore => {
  if ('$ref' in schema) {
    const refSchema: JsonSchema | undefined = refs[schema.$ref];

    if (!refSchema) {
      throw new Error(`Not found schema for $ref="${schema.$ref}"`);
    }

    const refStore = createJsonSchemaStore(refSchema, refs);
    refStore.$ref = schema.$ref;
    return refStore;
  } else if (schema.type === JsonSchemaTypeName.Object) {
    return createJsonObjectSchemaStore(schema, refs);
  } else if (schema.type === JsonSchemaTypeName.Array) {
    return new JsonArrayStore(createJsonSchemaStore(schema.items, refs));
  } else {
    return createPrimitiveStoreBySchema(schema);
  }
};

export const createJsonObjectSchemaStore = (
  value: JsonObjectSchema,
  refs: RefsType,
): JsonObjectStore => {
  const store = new JsonObjectStore();

  for (const requiredField of value.required) {
    if (!value.properties[requiredField]) {
      throw new Error(
        `Not found required field "${requiredField}" in "properties"`,
      );
    }
  }

  Object.entries(value.properties).forEach(([name, item]) => {
    store.addPropertyWithStore(name, createJsonSchemaStore(item, refs));
  });

  return store;
};

export const createPrimitiveStoreBySchema = (
  schema: JsonSchemaPrimitives,
): JsonSchemaStorePrimitives => {
  if (schema.type === JsonSchemaTypeName.String) {
    const stringStore = new JsonStringStore();
    stringStore.foreignKey = schema.foreignKey;
    return stringStore;
  } else if (schema.type === JsonSchemaTypeName.Number) {
    return new JsonNumberStore();
  } else if (schema.type === JsonSchemaTypeName.Boolean) {
    return new JsonBooleanStore();
  } else {
    throw new Error('this type is not allowed');
  }
};
