import { GraphQLObjectType, GraphQLString } from 'graphql/type';

export const ServiceType = new GraphQLObjectType({
  name: '_Service',
  fields: {
    sdl: { type: GraphQLString },
  },
});
