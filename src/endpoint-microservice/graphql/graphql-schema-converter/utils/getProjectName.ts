import { getSafetyName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getSafetyName';
import { capitalize } from 'src/endpoint-microservice/shared/utils/stringUtils';

export const getProjectName = (projectName: string) => {
  return getSafetyName(capitalize(projectName), 'INVALID_PROJECT_NAME');
};
