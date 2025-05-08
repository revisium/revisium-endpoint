import { JsonSchema } from 'src/endpoint-microservice/shared/types/schema.types';

export const isEmptyObject = (schema: JsonSchema): boolean => {
  if (schema.type === 'object' && !Object.keys(schema.properties).length) {
    return true;
  }

  if (schema.type === 'array') {
    return isEmptyObject(schema.items);
  }

  return false;
};

const startName = /[_a-zA-Z]/;
const containName = /^[_a-zA-Z0-9]+$/;

export const getSafetyName = (name: string, prefix: string): string => {
  if (!startName.test(name[0])) {
    return getSafetyName(`${prefix}_${name}`, prefix);
  }

  if (!containName.test(name)) {
    return getSafetyName(name.replace(/[^_a-zA-Z0-9]/g, '_'), prefix);
  }

  return name;
};
