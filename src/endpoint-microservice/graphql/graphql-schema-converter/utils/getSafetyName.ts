import {
  CONTAIN_NAME_PATTERN,
  START_NAME_PATTERN,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/constants';

export const getSafetyName = (name: string, prefix: string): string => {
  if (!START_NAME_PATTERN.test(name[0])) {
    return getSafetyName(`${prefix}_${name}`, prefix);
  }

  if (!CONTAIN_NAME_PATTERN.test(name)) {
    return getSafetyName(name.replace(/\W/g, '_'), prefix);
  }

  return name;
};
