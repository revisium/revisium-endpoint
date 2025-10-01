import { JsonSchema } from '@revisium/schema-toolkit/types';

export const isEmptyObject = (schema: JsonSchema): boolean => {
  if ('$ref' in schema) {
    return false;
  }

  if (schema.type === 'object') {
    const countProperties = Object.keys(schema.properties).length;

    if (countProperties === 0) {
      return true;
    } else {
      return Object.values(schema.properties).every((property) =>
        isEmptyObject(property),
      );
    }
  }

  if (schema.type === 'array') {
    return isEmptyObject(schema.items);
  }

  return false;
};
