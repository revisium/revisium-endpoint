import {
  CONTAIN_NAME_PATTERN,
  START_NAME_PATTERN,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/constants';

export const getSafetyName = (
  name: string,
  prefix: string,
  depth = 0,
): string => {
  if (depth > 100) {
    throw new Error(
      `Maximum recursion depth exceeded for name sanitization: ${name}`,
    );
  }
  if (!START_NAME_PATTERN.test(name[0])) {
    return getSafetyName(`${prefix}_${name}`, prefix, depth + 1);
  }
  if (!CONTAIN_NAME_PATTERN.test(name)) {
    return getSafetyName(name.replace(/\W/g, '_'), prefix, depth + 1);
  }
  return name;
};
