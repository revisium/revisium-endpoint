import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointMiddleware } from 'src/endpoint-microservice/restapi/endpoint-middleware.interface';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';

@Injectable()
export class RestapiEndpointService {
  private readonly logger = new Logger(RestapiEndpointService.name);

  private readonly map = new Map<
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
      this.logger.warn(`${endpointId} is not started`);
      return;
    }

    const [url, item] =
      [...this.map.entries()].find(
        ([_, mapValue]) => mapValue.endpointId === endpointId,
      ) ?? [];

    if (item && url) {
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

    const tableIds = await this.getTableIds(revision.id);

    this.startedEndpointIds.push(endpointId);
    this.map.set(url, {
      endpointId,
      revisionId: revision.id,
      countTables: tableIds.length,
      openApiJson: await this.generateOpenApiJson({
        organizationId: branch.project.organizationId,
        projectName: branch.project.name,
        branchName: branch.name,
        postfix: postfix,
        revisionId: revision.id,
      }),

      getRevision: async (headers) => {
        const { data, error } = await this.proxyCoreApi.api.revision(
          revision.id,
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      getRevisionChanges: async () => {
        return { message: 'Not implemented' };
      },
      getTables: async (headers) => {
        const { data, error } = await this.proxyCoreApi.api.tables(
          { revisionId: revision.id, first: 1000 },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },

      getTable: async (headers, tableId) => {
        const { data, error } = await this.proxyCoreApi.api.table(
          revision.id,
          tableId,
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      getTableSchema: async (headers, tableId) => {
        const { data, error } = await this.proxyCoreApi.api.tableSchema(
          revision.id,
          tableId,
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      getTableChanges: async () => {
        return { message: 'Not implemented' };
      },

      getRows: async (headers, tableId, options) => {
        const { data, error } = await this.proxyCoreApi.api.rows(
          revision.id,
          tableId,
          options,
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      bulkCreateRows: async (headers, tableId, rows) => {
        const { data, error } = await this.proxyCoreApi.api.createRows(
          revision.id,
          tableId,
          { rows: rows.map((r) => ({ rowId: r.rowId, data: r.data })) },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      bulkUpdateRows: async (headers, tableId, rows) => {
        const { data, error } = await this.proxyCoreApi.api.updateRows(
          revision.id,
          tableId,
          { rows: rows.map((r) => ({ rowId: r.rowId, data: r.data })) },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      bulkPatchRows: async (headers, tableId, rows) => {
        const { data, error } = await this.proxyCoreApi.api.patchRows(
          revision.id,
          tableId,
          { rows: rows.map((r) => ({ rowId: r.rowId, patches: r.patches })) },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      deleteRows: async (headers, tableId, rowIds) => {
        const { error } = await this.proxyCoreApi.api.deleteRows(
          revision.id,
          tableId,
          { rowIds },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return true;
      },

      getRow: async (headers, tableId, rowId) => {
        const { data, error } = await this.proxyCoreApi.api.row(
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
      createRow: async (headers, tableId, rowId, data) => {
        const { data: responseData, error } =
          await this.proxyCoreApi.api.createRow(
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

        return responseData.row;
      },
      updateRow: async (headers, tableId, rowId, data) => {
        const { data: responseData, error } =
          await this.proxyCoreApi.api.updateRow(
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

        if (!responseData.row) {
          throw new NotFoundException('Row not found');
        }

        return responseData.row;
      },
      patchRow: async (headers, tableId, rowId, patches) => {
        const { data: responseData, error } =
          await this.proxyCoreApi.api.patchRow(
            revision.id,
            tableId,
            rowId,
            { patches },
            { headers },
          );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        if (!responseData.row) {
          throw new NotFoundException('Row not found');
        }

        return responseData.row;
      },
      deleteRow: async (headers, tableId, rowId) => {
        const { error } = await this.proxyCoreApi.api.deleteRow(
          revision.id,
          tableId,
          rowId,
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return true;
      },
      getRowChanges: async () => {
        return { message: 'Not implemented' };
      },
      getRowForeignKeysBy: async (
        headers,
        tableId,
        rowId,
        foreignKeyByTableId,
        first,
        after,
      ) => {
        const { data, error } = await this.proxyCoreApi.api.rowForeignKeysBy(
          {
            revisionId: revision.id,
            tableId,
            rowId,
            foreignKeyByTableId,
            first,
            after,
          },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
      uploadFile: async (headers, tableId, rowId, fileId, file) => {
        const fileObj = new File(
          [new Uint8Array(file.buffer)],
          file.originalname,
          {
            type: file.mimetype,
          },
        );
        const { data, error } = await this.proxyCoreApi.api.uploadFile(
          revision.id,
          tableId,
          rowId,
          fileId,
          { file: fileObj },
          { headers },
        );

        if (error) {
          throw new HttpException(error, error.statusCode);
        }

        return data;
      },
    });

    this.logger.log(`started endpoint name=${url} endpointId=${endpointId}`);
  }

  private getPostfix(revision: {
    id: string;
    isHead: boolean;
    isDraft: boolean;
  }): string {
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

  private async getTableIds(revisionId: string): Promise<string[]> {
    const { data, error } = await this.internalCoreApi.api.rows(
      revisionId,
      SystemTables.Schema,
      { first: 1000 },
    );

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.edges.map((edge) => edge.node.id);
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
    >(new GetOpenApiSchemaQuery({ revisionId, projectName }));

    openApiJson.info.title = `Revisium organizationId: "${organizationId}", project: "${projectName}", branch: "${branchName}/${postfix}"`;
    const url = `/endpoint/rest/${organizationId}/${projectName}/${branchName}/${postfix}`;
    openApiJson.servers ??= [];
    openApiJson.servers.push({ url });

    return openApiJson;
  }
}
