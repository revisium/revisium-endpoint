import {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
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
