import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql/type';

export const generateOrderByType = (
  prefix: string,
  sortOrder: GraphQLEnumType,
) => {
  const OrderByFieldEnum = new GraphQLEnumType({
    name: `${prefix}OrderByField`,
    values: {
      createdAt: { value: 'createdAt' },
      updatedAt: { value: 'updatedAt' },
      publishedAt: { value: 'publishedAt' },
      id: { value: 'id' },
    },
  });

  const OrderByFieldInput = new GraphQLInputObjectType({
    name: `${prefix}OrderByInput`,
    fields: {
      field: { type: new GraphQLNonNull(OrderByFieldEnum) },
      direction: { type: new GraphQLNonNull(sortOrder) },
    },
  });

  return new GraphQLList(OrderByFieldInput);
};
