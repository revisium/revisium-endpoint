import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql/type';

export const createWhereInput = (
  projectName: string,
  typeName: string,
  filterTypes: Record<string, GraphQLInputObjectType>,
  whereInputTypeMap: Record<string, GraphQLInputObjectType>,
): GraphQLInputObjectType => {
  if (whereInputTypeMap[typeName]) {
    return whereInputTypeMap[typeName];
  }

  const whereInput: GraphQLInputObjectType = new GraphQLInputObjectType({
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
      publishedAt: { type: filterTypes.DateTimeFilter },
      updatedAt: { type: filterTypes.DateTimeFilter },
      data: { type: filterTypes.JsonFilter },
    }),
  });

  whereInputTypeMap[typeName] = whereInput;

  return whereInput;
};
