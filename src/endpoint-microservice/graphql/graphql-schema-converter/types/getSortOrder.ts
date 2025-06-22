import { GraphQLEnumType } from 'graphql/type';

import { SortDirection } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/sortDirection';

export const getSortOrder = (projectName: string) => {
  return new GraphQLEnumType({
    name: `${projectName}SortOrder`,
    values: {
      asc: { value: SortDirection.ASC },
      desc: { value: SortDirection.DESC },
    },
  });
};
