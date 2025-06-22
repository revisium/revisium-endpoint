import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLString,
} from 'graphql/type';

import { JsonType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/jsonType';

export const createScalarFilterTypes = (
  projectName: string,
): Record<string, GraphQLInputObjectType> => {
  const types: Record<string, GraphQLInputObjectType> = {};

  types.StringFilter = new GraphQLInputObjectType({
    name: `${projectName}StringFilter`,
    fields: {
      equals: { type: GraphQLString },
      in: { type: new GraphQLList(GraphQLString) },
      notIn: { type: new GraphQLList(GraphQLString) },
      lt: { type: GraphQLString },
      lte: { type: GraphQLString },
      gt: { type: GraphQLString },
      gte: { type: GraphQLString },
      contains: { type: GraphQLString },
      startsWith: { type: GraphQLString },
      endsWith: { type: GraphQLString },
      mode: {
        type: new GraphQLEnumType({
          name: `${projectName}FilterStringMode`,
          values: {
            default: { value: 'default' },
            insensitive: { value: 'insensitive' },
          },
        }),
      },
      not: { type: GraphQLString },
    },
  });

  types.BoolFilter = new GraphQLInputObjectType({
    name: `${projectName}BoolFilter`,
    fields: {
      equals: { type: GraphQLBoolean },
      not: { type: GraphQLBoolean },
    },
  });

  types.DateTimeFilter = new GraphQLInputObjectType({
    name: `${projectName}DateTimeFilter`,
    fields: {
      equals: { type: GraphQLString },
      in: { type: new GraphQLList(GraphQLString) },
      notIn: { type: new GraphQLList(GraphQLString) },
      lt: { type: GraphQLString },
      lte: { type: GraphQLString },
      gt: { type: GraphQLString },
      gte: { type: GraphQLString },
    },
  });

  types.JsonFilter = new GraphQLInputObjectType({
    name: `${projectName}JsonFilter`,
    fields: {
      equals: { type: JsonType },
      path: { type: new GraphQLList(GraphQLString) },
      mode: {
        type: new GraphQLEnumType({
          name: `${projectName}FilterJsonMode`,
          values: {
            default: { value: 'default' },
            insensitive: { value: 'insensitive' },
          },
        }),
      },
      string_contains: { type: GraphQLString },
      string_starts_with: { type: GraphQLString },
      string_ends_with: { type: GraphQLString },
      array_contains: { type: new GraphQLList(JsonType) },
      array_starts_with: { type: JsonType },
      array_ends_with: { type: JsonType },
      lt: { type: GraphQLFloat },
      lte: { type: GraphQLFloat },
      gt: { type: GraphQLFloat },
      gte: { type: GraphQLFloat },
    },
  });
  return types;
};
