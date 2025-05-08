import {
  JsonArraySchema,
  JsonBooleanSchema,
  JsonNumberSchema,
  JsonObjectSchema,
  JsonSchema,
  JsonStringSchema,
} from 'src/endpoint-microservice/shared/types/schema.types';
import {
  JsonPatchAdd,
  JsonPatchMove,
  JsonPatchRemove,
  JsonPatchReplace,
} from 'src/endpoint-microservice/shared/types/json-patch.types';

export const getReplacePatch = ({
  path,
  value,
}: {
  path: string;
  value: JsonSchema;
}): JsonPatchReplace => ({
  op: 'replace',
  path,
  value,
});

export const getRemovePatch = ({
  path,
}: {
  path: string;
}): JsonPatchRemove => ({
  op: 'remove',
  path,
});

export const getAddPatch = ({
  path,
  value,
}: {
  path: string;
  value: JsonSchema;
}): JsonPatchAdd => ({
  op: 'add',
  path,
  value,
});

export const getMovePatch = ({
  from,
  path,
}: {
  from: string;
  path: string;
}): JsonPatchMove => ({
  op: 'move',
  from,
  path,
});

export const getStringSchema = ({
  defaultValue = '',
  foreignKey,
}: {
  defaultValue?: string;
  foreignKey?: string;
} = {}): JsonStringSchema => {
  const schema: JsonStringSchema = {
    type: 'string',
    default: defaultValue,
  };

  if (foreignKey) {
    schema.foreignKey = foreignKey;
  }

  return schema;
};

export const getNumberSchema = (
  defaultValue: number = 0,
): JsonNumberSchema => ({
  type: 'number',
  default: defaultValue,
});

export const getBooleanSchema = (
  defaultValue: boolean = false,
): JsonBooleanSchema => ({
  type: 'boolean',
  default: defaultValue,
});

export const getObjectSchema = (
  properties: Record<string, JsonSchema>,
): JsonObjectSchema => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties).sort(),
  properties,
});

export const getArraySchema = (items: JsonSchema): JsonArraySchema => ({
  type: 'array',
  items,
});
