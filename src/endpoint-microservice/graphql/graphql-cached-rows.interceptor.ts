import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { GraphqlCachedRowsClsStore } from 'src/endpoint-microservice/graphql/graphql-cls.types';

@Injectable()
export class GraphqlCachedRowsInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService<GraphqlCachedRowsClsStore>) {}

  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    this.cls.set('cachedRows', new Map());
    return next.handle();
  }
}
