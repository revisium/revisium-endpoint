import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql/type';

export const getPageInfoType = (projectName: string) => {
  return new GraphQLObjectType({
    name: `${projectName}PageInfo`,
    fields: {
      startCursor: { type: GraphQLString },
      endCursor: { type: GraphQLString },
      hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
      hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
  });
};

export const DateTimeType = new GraphQLScalarType({
  name: 'DataTime',
});

export const JsonType = new GraphQLScalarType({
  name: 'JSON',
});

export const ServiceType = new GraphQLObjectType({
  name: '_Service',
  fields: {
    sdl: { type: GraphQLString },
  },
});

export type InputType = { data?: { first?: number; after?: string } };

export type ContextType = { headers: Record<string, string> };

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export const getSortOrder = (projectName: string) => {
  return new GraphQLEnumType({
    name: `${projectName}SortOrder`,
    values: {
      asc: { value: SortDirection.ASC },
      desc: { value: SortDirection.DESC },
    },
  });
};
