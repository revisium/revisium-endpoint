import { Injectable, Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql/error';
import { ClsService } from 'nestjs-cls';
import {
  GetTableRowsDto,
  RequestParams,
} from 'src/endpoint-microservice/core-api/generated/api';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { GraphqlCachedRowsClsStore } from 'src/endpoint-microservice/graphql/graphql-cls.types';
import { DEFAULT_FIRST } from 'src/endpoint-microservice/graphql/graphql-schema-converter/constants';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ContextType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { ConverterTable } from 'src/endpoint-microservice/shared/converter';

@Injectable()
export class ResolverService {
  private readonly logger = new Logger(ResolverService.name);

  constructor(
    private readonly contextService: ContextService,
    private readonly proxyCoreApi: ProxyCoreApiService,
    private readonly cls: ClsService<GraphqlCachedRowsClsStore>,
  ) {}

  public getItemResolver(table: ConverterTable) {
    return this.getItemBaseResolver(table.id, false);
  }

  public getItemFlatResolver(table: ConverterTable) {
    return this.getItemBaseResolver(table.id, true);
  }

  public getFieldResolver(
    foreignTableId: string,
    field: string,
    isFlat: boolean = false,
  ) {
    const revisionId = this.context.revisionId;

    return async (
      parent: Record<string, string>,
      _: unknown,
      context: ContextType,
    ) => {
      const response = await this.getCachedRow(
        revisionId,
        foreignTableId,
        parent[field],
        {
          headers: context.headers,
        },
      );
      return isFlat ? response.data : response;
    };
  }

  public getFieldArrayItemResolver(
    foreignTableId: string,
    field: string,
    isFlat: boolean = false,
  ) {
    const revisionId = this.context.revisionId;

    return async (
      parent: Record<string, string[]>,
      _: unknown,
      context: ContextType,
    ) => {
      const ids = parent[field];
      if (!ids?.length) return [];

      const promises = ids.map(async (id) => {
        const response = await this.getCachedRow(
          revisionId,
          foreignTableId,
          id,
          {
            headers: context.headers,
          },
        );
        return isFlat ? response.data : response;
      });

      return Promise.all(promises);
    };
  }

  public getListResolver(table: ConverterTable) {
    return this.getListBaseResolver(table, false);
  }

  public getListFlatResolver(table: ConverterTable) {
    return this.getListBaseResolver(table, true);
  }

  private getListBaseResolver(table: ConverterTable, isFlat: boolean) {
    const revisionId = this.context.revisionId;

    return async (
      _: unknown,
      { data }: { data: GetTableRowsDto },
      ctx: ContextType,
    ) => {
      const { data: response, error } = await this.proxyCoreApi.api.rows(
        revisionId,
        table.id,
        {
          first: data?.first || DEFAULT_FIRST,
          after: data?.after ?? undefined,
          orderBy: data?.orderBy ?? undefined,
          where: data?.where ?? undefined,
        },
        { headers: ctx.headers },
      );
      if (error) throw this.toGraphQLError(error);

      if (!isFlat) {
        return response;
      }

      const flatEdges = response.edges.map((edge) => ({
        cursor: edge.cursor,
        node: edge.node.data,
      }));

      return {
        edges: flatEdges,
        pageInfo: response.pageInfo,
        totalCount: response.totalCount,
      };
    };
  }

  private getItemBaseResolver(tableId: string, isFlat: boolean) {
    const revisionId = this.context.revisionId;

    return async (_: unknown, { id }: { id: string }, ctx: ContextType) => {
      const response = await this.getCachedRow(revisionId, tableId, id, {
        headers: ctx.headers,
      });
      return isFlat ? response.data : response;
    };
  }

  private async getCachedRow(
    revisionId: string,
    tableId: string,
    id: string,
    params: RequestParams = {},
  ) {
    const cacheKey = `${revisionId}:${tableId}:${id}`;
    const cachedRows = this.cls.get('cachedRows');
    let promise = cachedRows.get(cacheKey);

    if (!promise) {
      promise = this.proxyCoreApi.api.row(revisionId, tableId, id, params);
      cachedRows.set(cacheKey, promise);
    }

    const { data: response, error } = await promise;
    if (error) throw this.toGraphQLError(error);

    return response;
  }

  private toGraphQLError(err: any): GraphQLError {
    this.logger.error(err);
    return new GraphQLError(err.message, {
      extensions: { code: err.error, originalError: err },
    });
  }

  private get context() {
    return this.contextService.context;
  }
}
