import { GraphQLFieldConfig } from 'graphql/type/definition';
import { ServiceType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/serviceType';

export const createServiceField = (
  resolver: () => { sdl: string },
): GraphQLFieldConfig<any, any> => {
  return {
    type: ServiceType,
    resolve: resolver,
  };
};
