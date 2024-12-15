import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { RowModel } from 'src/endpoint-microservice/core-api/generated/api';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { paginatedExcludeDataFromRowModel } from 'src/endpoint-microservice/core-api/utils/transformFromPrismaToRowModel';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';
import { IPaginatedType } from 'src/endpoint-microservice/shared/types/pagination.interface';

@Injectable()
export class RestapiEndpointService {
  private readonly logger = new Logger(RestapiEndpointService.name);

  private map = new Map<
    string,
    {
      endpointId: string;
      revisionId: string;
      countTables: number;
      openApiJson: object;
      getRow: (
        headers: Record<string, string>,
        tableId: string,
        rowId: string,
      ) => Promise<object>;
      deleteRow: (
        headers: Record<string, string>,
        tableId: string,
        rowId: string,
      ) => Promise<boolean>;
      updateRow: (
        headers: Record<string, string>,
        tableId: string,
        rowId: string,
        data: object,
      ) => Promise<object>;
      createRow: (
        headers: Record<string, string>,
        tableId: string,
        rowId: string,
        data: object,
      ) => Promise<object>;
      getRows: (
        headers: Record<string, string>,
        tableId: string,
        first: number,
        after: string | undefined,
      ) => Promise<IPaginatedType<Omit<RowModel, 'data'>>>;
      getRowReferencesBy: (
        headers: Record<string, string>,
        tableId: string,
        rowId: string,
        referenceByTableId: string,
        first: number,
        after: string | undefined,
      ) => Promise<IPaginatedType<Omit<RowModel, 'data'>>>;
    }
  >();
  private startedEndpointIds: string[] = [];

  constructor(
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly internalCoreApi: InternalCoreApiService,
    private readonly proxyCoreApi: ProxyCoreApiService,
  ) {}

  public getEndpointMiddleware(
    organizationId: string,
    projectName: string,
    branchName: string,
    postfix: string,
  ) {
    return this.map.get(
      this.getUrl(organizationId, projectName, branchName, postfix),
    );
  }

  public existEndpoint(endpointId: string) {
    return this.startedEndpointIds.includes(endpointId);
  }

  public async stopEndpoint(endpointId: string) {
    if (!this.startedEndpointIds.includes(endpointId)) {
      throw new Error(`${endpointId} is not started`);
    }

    // TODO
    const [url, item] = [...this.map.entries()].find(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, mapValue]) => mapValue.endpointId === endpointId,
    );

    if (item) {
      this.map.delete(url);
    }

    this.startedEndpointIds = this.startedEndpointIds.filter(
      (id) => id !== endpointId,
    );

    this.logger.log(`stopped endpoint name=${url} endpointId=${endpointId}`);
  }

  public async runEndpoint(endpointId: string) {
    if (this.startedEndpointIds.includes(endpointId)) {
      throw new Error(`${endpointId} already started`);
    }

    const dbEndpoint = await this.getDbEndpoint(endpointId);
    const {
      revision: { branch, ...revision },
    } = dbEndpoint;

    const postfix = this.getPostfix(revision);

    const url = this.getUrl(
      branch.project.organizationId,
      branch.project.name,
      branch.name,
      postfix,
    );

    this.startedEndpointIds.push(endpointId);
    this.map.set(url, {
      endpointId,
      revisionId: revision.id,
      countTables: await this.getCountTables(revision.id),
      openApiJson: await this.generateOpenApiJson({
        organizationId: branch.project.organizationId,
        projectName: branch.project.name,
        branchName: branch.name,
        postfix: postfix,
        revisionId: revision.id,
      }),
      getRow: async (headers, tableId, rowId) => {
        const { data } = await this.proxyCoreApi.row(
          revision.id,
          tableId,
          rowId,
          { headers },
        );

        if (!data) {
          throw new HttpException(`Not found ${rowId}`, HttpStatus.NOT_FOUND);
        }

        return data;
      },
      deleteRow: async (headers, tableId, rowId) => {
        await this.proxyCoreApi.deleteRow(revision.id, tableId, rowId, {
          headers,
        });
        return true;
      },
      updateRow: async (headers, tableId, rowId, data) => {
        await this.proxyCoreApi.updateRow(
          revision.id,
          tableId,
          rowId,
          {
            data,
          },
          { headers },
        );
        return data;
      },
      createRow: async (headers, tableId, rowId, data) => {
        try {
          return await this.proxyCoreApi
            .createRow(
              revision.id,
              tableId,
              {
                rowId,
                data,
              },
              { headers },
            )
            .then((result) => result.row.data);
        } catch (e) {
          console.error(e);
        }
      },
      getRows: async (headers, tableId, first, after) => {
        return this.proxyCoreApi
          .rows(
            {
              revisionId: revision.id,
              tableId,
              first,
              after,
            },
            { headers: headers },
          )
          .then((result) => paginatedExcludeDataFromRowModel(result));
      },
      getRowReferencesBy: async (
        headers,
        tableId,
        rowId,
        referenceByTableId,
        first,
        after,
      ) => {
        return this.proxyCoreApi
          .rowReferencesBy(
            {
              revisionId: revision.id,
              tableId,
              rowId,
              referenceByTableId,
              first,
              after,
            },
            { headers },
          )
          .then((result) => paginatedExcludeDataFromRowModel(result));
      },
    });

    this.logger.log(`started endpoint name=${url} endpointId=${endpointId}`);
  }

  private getPostfix(revision: {
    id: string;
    isHead: boolean;
    isDraft: boolean;
  }): string | undefined {
    if (revision.isHead) {
      return 'head';
    }

    if (revision.isDraft) {
      return 'draft';
    }

    return revision.id;
  }

  private getUrl(
    organizationId: string,
    projectName: string,
    branchName: string,
    postfix: string,
  ): string {
    return `${organizationId}/${projectName}/${branchName}/${postfix}`;
  }

  private getDbEndpoint(endpointId: string) {
    return this.prisma.endpoint.findUniqueOrThrow({
      where: { id: endpointId },
      include: {
        revision: {
          include: {
            branch: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });
  }

  private async getCountTables(revisionId: string) {
    const result = await this.internalCoreApi.tables({ revisionId, first: 0 });
    return result.totalCount;
  }

  private async generateOpenApiJson({
    organizationId,
    projectName,
    branchName,
    postfix,
    revisionId,
  }: {
    organizationId: string;
    projectName: string;
    branchName: string;
    postfix: string;
    revisionId: string;
  }) {
    const openApiJson = await this.queryBus.execute<
      GetOpenApiSchemaQuery,
      OpenApiSchema
    >(new GetOpenApiSchemaQuery({ revisionId }));

    openApiJson.info.title = `Revisium organizationId: "${organizationId}", project: "${projectName}", branch: "${branchName}/${postfix}"`;
    const url = `/endpoint/restapi/${organizationId}/${projectName}/${branchName}/${postfix}`;
    openApiJson.servers.push({ url });

    return openApiJson;
  }
}
