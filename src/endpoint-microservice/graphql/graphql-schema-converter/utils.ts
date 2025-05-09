import { JsonSchema } from 'src/endpoint-microservice/shared/schema';
import { capitalize } from 'src/endpoint-microservice/shared/utils/stringUtils';

export const isEmptyObject = (schema: JsonSchema): boolean => {
  if ('$ref' in schema) {
    return false;
  }

  if (schema.type === 'object' && !Object.keys(schema.properties).length) {
    return true;
  }

  if (schema.type === 'array') {
    return isEmptyObject(schema.items);
  }

  return false;
};

const startName = /[_a-zA-Z]/;
const containName = /^\w+$/;

export const isValidName = (name: string): boolean => {
  return startName.test(name[0]) && containName.test(name);
};

export const getSafetyName = (name: string, prefix: string): string => {
  if (!startName.test(name[0])) {
    return getSafetyName(`${prefix}_${name}`, prefix);
  }

  if (!containName.test(name)) {
    return getSafetyName(name.replace(/\W/g, '_'), prefix);
  }

  return name;
};

export const getProjectName = (projectName: string) => {
  return getSafetyName(capitalize(projectName), 'INVALID_PROJECT_NAME');
};
