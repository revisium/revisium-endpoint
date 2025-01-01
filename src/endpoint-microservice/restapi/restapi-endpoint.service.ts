import { HttpException, Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { paginatedExcludeDataFromRowModel } from 'src/endpoint-microservice/core-api/utils/transformFromPrismaToRowModel';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointMiddleware } from 'src/endpoint-microservice/restapi/endpoint-middleware.interface';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';

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
    } & EndpointMiddleware
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
        const { data, error } = await this.proxyCoreApi.row(
          revision.id,
          tableId,
          rowId,
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      deleteRow: async (headers, tableId, rowId) => {
        const { error } = await this.proxyCoreApi.deleteRow(
          revision.id,
          tableId,
          rowId,
          {
            headers,
          },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return true;
      },
      updateRow: async (headers, tableId, rowId, data) => {
        const { data: responseData, error } = await this.proxyCoreApi.updateRow(
          revision.id,
          tableId,
          rowId,
          {
            data,
          },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return responseData.row.data;
      },
      createRow: async (headers, tableId, rowId, data) => {
        const { data: responseData, error } = await this.proxyCoreApi.createRow(
          revision.id,
          tableId,
          {
            rowId,
            data,
          },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return responseData.row.data;
      },
      getRows: async (headers, tableId, first, after) => {
        const { data, error } = await this.proxyCoreApi.rows(
          {
            revisionId: revision.id,
            tableId,
            first,
            after,
          },
          { headers: headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return paginatedExcludeDataFromRowModel(data);
      },
      getRowReferencesBy: async (
        headers,
        tableId,
        rowId,
        referenceByTableId,
        first,
        after,
      ) => {
        const { data, error } = await this.proxyCoreApi.rowReferencesBy(
          {
            revisionId: revision.id,
            tableId,
            rowId,
            referenceByTableId,
            first,
            after,
          },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return paginatedExcludeDataFromRowModel(data);
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
    const { data, error } = await this.internalCoreApi.tables({
      revisionId,
      first: 0,
    });

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.totalCount;
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
