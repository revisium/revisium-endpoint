import {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql/type';

export const PageInfo = new GraphQLObjectType({
  name: 'PageInfo',
  fields: {
    startCursor: { type: GraphQLString },
    endCursor: { type: GraphQLString },
    hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

export const DateTimeType = new GraphQLScalarType({
  name: 'DataTime',
});

export const ServiceType = new GraphQLObjectType({
  name: '_Service',
  fields: {
    sdl: { type: GraphQLString },
  },
});

export type InputType = { data?: { first?: number; after?: string } };

export type ContextType = { headers: Record<string, string> };
