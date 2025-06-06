import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLFloat,
  GraphQLList,
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

export const createWhereInput = (
  projectName: string,
  typeName: string,
  filterTypes: Record<string, GraphQLInputObjectType>,
  whereInputTypeMap: Record<string, GraphQLInputObjectType>,
): GraphQLInputObjectType => {
  if (whereInputTypeMap[typeName]) {
    return whereInputTypeMap[typeName];
  }

  const whereInput = new GraphQLInputObjectType({
    name: `${projectName}${typeName}WhereInput`,
    fields: () => ({
      AND: {
        type: new GraphQLList(new GraphQLNonNull(whereInput)),
      },
      OR: {
        type: new GraphQLList(new GraphQLNonNull(whereInput)),
      },
      NOT: {
        type: new GraphQLList(new GraphQLNonNull(whereInput)),
      },
      versionId: { type: filterTypes.StringFilter },
      createdId: { type: filterTypes.StringFilter },
      id: { type: filterTypes.StringFilter },
      readonly: { type: filterTypes.BoolFilter },
      createdAt: { type: filterTypes.DateTimeFilter },
      updatedAt: { type: filterTypes.DateTimeFilter },
      data: { type: filterTypes.JsonFilter },
    }),
  });

  whereInputTypeMap[typeName] = whereInput;

  return whereInput;
};
