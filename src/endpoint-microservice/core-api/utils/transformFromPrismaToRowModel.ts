import { RowModel } from 'src/endpoint-microservice/core-api/generated/api';
import { IPaginatedType } from 'src/endpoint-microservice/shared/types/pagination.interface';

export const excludeDataFromRowModel = (
  data: RowModel,
): Omit<RowModel, 'data'> => {
  return {
    versionId: data.versionId,
    id: data.id,
    createdAt: data.createdAt,
    readonly: data.readonly,
  };
};

export const paginatedExcludeDataFromRowModel = ({
  pageInfo,
  totalCount,
  edges,
}: IPaginatedType<RowModel>): IPaginatedType<Omit<RowModel, 'data'>> => {
  return {
    pageInfo,
    totalCount,
    edges: edges.map((edge) => ({
      cursor: edge.cursor,
      node: excludeDataFromRowModel(edge.node),
    })),
  };
};
