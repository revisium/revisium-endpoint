import { ClsStore } from 'nestjs-cls';
import {
  ErrorModel,
  HttpResponse,
  RowModel,
} from 'src/endpoint-microservice/core-api/generated/api';

export interface GraphqlCachedRowsClsStore extends ClsStore {
  cachedRows: Map<string, Promise<HttpResponse<RowModel, ErrorModel>>>;
}
