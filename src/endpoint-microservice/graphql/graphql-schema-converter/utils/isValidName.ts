import {
  CONTAIN_NAME_PATTERN,
  START_NAME_PATTERN,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/constants';

export const isValidName = (name: string): boolean => {
  return START_NAME_PATTERN.test(name[0]) && CONTAIN_NAME_PATTERN.test(name);
};
