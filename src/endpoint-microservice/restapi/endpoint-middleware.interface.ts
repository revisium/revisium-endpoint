import {
  GetTableRowsDto,
  PatchRow,
  RowModel,
  CreateRowsResponse,
  UpdateRowsResponse,
  PatchRowsResponse,
} from 'src/endpoint-microservice/core-api/generated/api';
import { IPaginatedType } from 'src/endpoint-microservice/shared/types/pagination.interface';

export interface EndpointMiddleware {
  getRevision(headers: Record<string, string>): Promise<object>;
  getRevisionChanges(headers: Record<string, string>): Promise<object>;
  getTables(headers: Record<string, string>): Promise<object>;

  getTable(headers: Record<string, string>, tableId: string): Promise<object>;
  getTableSchema(
    headers: Record<string, string>,
    tableId: string,
  ): Promise<object>;
  getTableChanges(
    headers: Record<string, string>,
    tableId: string,
  ): Promise<object>;

  getRows(
    headers: Record<string, string>,
    tableId: string,
    options: GetTableRowsDto,
  ): Promise<IPaginatedType<RowModel>>;
  bulkCreateRows(
    headers: Record<string, string>,
    tableId: string,
    rows: Array<{ rowId: string; data: object }>,
  ): Promise<CreateRowsResponse>;
  bulkUpdateRows(
    headers: Record<string, string>,
    tableId: string,
    rows: Array<{ rowId: string; data: object }>,
  ): Promise<UpdateRowsResponse>;
  bulkPatchRows(
    headers: Record<string, string>,
    tableId: string,
    rows: Array<{ rowId: string; patches: PatchRow[] }>,
  ): Promise<PatchRowsResponse>;
  deleteRows(
    headers: Record<string, string>,
    tableId: string,
    rowIds: string[],
  ): Promise<boolean>;

  getRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
  ): Promise<object>;
  createRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    data: object,
  ): Promise<object>;
  updateRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    data: object,
  ): Promise<object>;
  patchRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    patches: PatchRow[],
  ): Promise<object>;
  deleteRow(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
  ): Promise<boolean>;
  getRowChanges(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
  ): Promise<object>;
  getRowForeignKeysBy(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    foreignKeyByTableId: string,
    first: number,
    after: string | undefined,
  ): Promise<IPaginatedType<RowModel>>;
  uploadFile(
    headers: Record<string, string>,
    tableId: string,
    rowId: string,
    fileId: string,
    file: Express.Multer.File,
  ): Promise<object>;
}
