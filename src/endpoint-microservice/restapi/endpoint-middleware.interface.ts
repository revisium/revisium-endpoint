import { RowModel } from 'src/endpoint-microservice/core-api/generated/api';
import { IPaginatedType } from 'src/endpoint-microservice/shared/types/pagination.interface';

export interface EndpointMiddleware {
  getRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
  ): Promise<object>;
  deleteRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
  ): Promise<boolean>;
  updateRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    data: object,
  ): Promise<object>;
  createRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    data: object,
  ): Promise<object>;
  getRows(
    headers: Record<string, string>,
    tableId: string,
    first: number,
    after: string | undefined,
  ): Promise<IPaginatedType<Omit<RowModel, 'data'>>>;
  getRowForeignKeysBy(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    foreignKeyByTableId: string,
    first: number,
    after: string | undefined,
  ): Promise<IPaginatedType<Omit<RowModel, 'data'>>>;
}
