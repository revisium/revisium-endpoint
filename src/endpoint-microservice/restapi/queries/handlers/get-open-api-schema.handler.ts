import { HttpException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import { resolveRefs } from '@revisium/schema-toolkit/lib';
import { JsonSchema } from '@revisium/schema-toolkit/types';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';
import {
  createBulkRowsPath,
  createFileUploadPath,
  createForeignKeyPath,
  createQueryRowsPath,
  createSingleRowPath,
  createTableInfoMap,
  getFilterAndSortSchemas,
  TablePathInfo,
} from './open-api-schema.utils';

const HARDCODED_LIMIT_FOR_TABLES = 1000;

@QueryHandler(GetOpenApiSchemaQuery)
export class GetOpenApiSchemaHandler implements IQueryHandler<GetOpenApiSchemaQuery> {
  public constructor(
    private readonly internalCoreApi: InternalCoreApiService,
  ) {}

  public execute({ data }: GetOpenApiSchemaQuery): Promise<OpenApiSchema> {
    return this.getOpenApiSchema(data.revisionId, data.projectName);
  }

  private async getOpenApiSchema(revisionId: string, projectName: string) {
    const schemas = await this.getSchemas(revisionId);
    const isDraftRevision = await this.getIsDraftRevision(revisionId);

    const tableInfoMap = createTableInfoMap(
      schemas.map((s) => s.id),
      projectName,
    );

    const openApiJson: OpenApiSchema = {
      openapi: '3.1.0',
      info: { version: revisionId, title: '' },
      servers: [],
      tags: this.createTags(tableInfoMap),
      paths: {},
      components: {
        securitySchemes: {
          'access-token': {
            scheme: 'bearer',
            bearerFormat: 'JWT',
            type: 'http',
          },
        },
        schemas: {
          ...getFilterAndSortSchemas(projectName),
        },
      },
    };

    openApiJson.paths ??= {};

    for (const schemaRow of schemas) {
      const rawTableId = schemaRow.id;
      const info = tableInfoMap.get(rawTableId);

      if (!info) {
        continue;
      }

      openApiJson.paths[`/tables/${rawTableId}/rows`] = createQueryRowsPath(
        info,
        projectName,
      );

      openApiJson.paths[`/tables/${rawTableId}/row/{rowId}`] =
        createSingleRowPath(info, projectName, isDraftRevision);

      if (isDraftRevision) {
        openApiJson.paths[`/tables/${rawTableId}/row/{rowId}/files/{fileId}`] =
          createFileUploadPath(info);
        openApiJson.paths[`/tables/${rawTableId}/rows/bulk`] =
          createBulkRowsPath(info, projectName);
      }

      const foreignKeys = await this.getForeignKeys(revisionId, rawTableId);

      for (const fk of foreignKeys) {
        const fkInfo = tableInfoMap.get(fk.id);
        if (!fkInfo) {
          continue;
        }

        openApiJson.paths[
          `/tables/${rawTableId}/row/{rowId}/foreign-keys-by/${fk.id}`
        ] = createForeignKeyPath(info, fkInfo);
      }

      openApiJson.components ??= { schemas: {} };
      openApiJson.components.schemas ??= {};
      openApiJson.components.schemas[info.schemaName] = resolveRefs(
        schemaRow.data as JsonSchema,
      );
    }

    return openApiJson;
  }

  private createTags(
    tableInfoMap: Map<string, TablePathInfo>,
  ): Array<{ name: string; description: string }> {
    return Array.from(tableInfoMap.values()).map((info) => ({
      name: info.tag,
      description: `Operations on ${info.rawTableId} table`,
    }));
  }

  private async getIsDraftRevision(revisionId: string) {
    const { data, error } = await this.internalCoreApi.api.revision(revisionId);

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.isDraft;
  }

  private async getSchemas(revisionId: string) {
    const { error, data } = await this.internalCoreApi.api.rows(
      revisionId,
      SystemTables.Schema,
      {
        first: HARDCODED_LIMIT_FOR_TABLES,
      },
    );

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    return data.edges
      .map((e) => e.node)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private async getForeignKeys(revisionId: string, tableId: string) {
    const { data, error } = await this.internalCoreApi.api.tableForeignKeysBy({
      revisionId,
      tableId,
      first: 100,
    });

    if (error) throw new HttpException(error, error.statusCode);
    return data.edges.map((e) => e.node);
  }
}
