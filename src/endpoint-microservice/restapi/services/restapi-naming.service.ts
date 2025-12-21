import { Injectable } from '@nestjs/common';
import {
  getSafetyName,
  getProjectName,
} from 'src/endpoint-microservice/shared/utils/naming';
import { pluralize } from 'src/endpoint-microservice/shared/utils/stringUtils';
import {
  RestapiOptions,
  RestapiOptionsService,
} from './restapi-options.service';

export interface TableUrlMapping {
  rawTableId: string;
  singularPath: string;
  pluralPath: string;
  schemaName: string;
  operationIdBase: string;
}

@Injectable()
export class RestapiNamingService {
  private readonly options: RestapiOptions | undefined;

  constructor(private readonly optionsService: RestapiOptionsService) {
    this.options = this.optionsService.getOptions();
  }

  public getUrlPaths(rawTableId: string): {
    singular: string;
    plural: string;
  } {
    const safeName = this.getSafeTableName(rawTableId);
    return {
      singular: safeName,
      plural: pluralize(safeName),
    };
  }

  public getSchemaName(rawTableId: string, projectName: string): string {
    const prefix = this.getPrefixForTables(projectName);
    const safeName = this.getSafeTableName(rawTableId);
    const capitalizedName = this.capitalizeFirst(safeName);
    return `${prefix}${capitalizedName}`;
  }

  public getCommonSchemaName(name: string, projectName: string): string {
    const prefix = this.getPrefixForCommon(projectName);
    return `${prefix}${name}`;
  }

  public getOperationId(
    operation: 'get' | 'create' | 'update' | 'delete' | 'list',
    rawTableId: string,
  ): string {
    const safeName = this.getSafeTableName(rawTableId);
    const capitalizedName = this.capitalizeFirst(safeName);

    switch (operation) {
      case 'get':
        return `get${capitalizedName}`;
      case 'create':
        return `create${capitalizedName}`;
      case 'update':
        return `update${capitalizedName}`;
      case 'delete':
        return `delete${capitalizedName}`;
      case 'list':
        return `get${this.capitalizeFirst(pluralize(safeName))}`;
    }
  }

  public getForeignKeyOperationId(
    rawTableId: string,
    foreignKeyTableId: string,
  ): string {
    const safeName = this.getSafeTableName(rawTableId);
    const fkSafeName = this.getSafeTableName(foreignKeyTableId);
    const capitalizedName = this.capitalizeFirst(safeName);
    const capitalizedFkName = this.capitalizeFirst(pluralize(fkSafeName));
    return `get${capitalizedName}ForeignKeysBy${capitalizedFkName}`;
  }

  public getPrefixForTables(projectName: string): string {
    if (this.options?.prefixForTables !== undefined) {
      return this.options.prefixForTables;
    }
    return getProjectName(projectName);
  }

  public getPrefixForCommon(projectName: string): string {
    if (this.options?.prefixForCommon !== undefined) {
      return this.options.prefixForCommon;
    }
    return getProjectName(projectName);
  }

  public createTableUrlMappings(
    rawTableIds: string[],
    projectName: string,
  ): TableUrlMapping[] {
    return rawTableIds.map((rawTableId) => {
      const paths = this.getUrlPaths(rawTableId);
      const safeName = this.getSafeTableName(rawTableId);
      return {
        rawTableId,
        singularPath: paths.singular,
        pluralPath: paths.plural,
        schemaName: this.getSchemaName(rawTableId, projectName),
        operationIdBase: this.capitalizeFirst(safeName),
      };
    });
  }

  public getRawTableIdBySingular(
    singularPath: string,
    mappings: TableUrlMapping[],
  ): string | undefined {
    return mappings.find((m) => m.singularPath === singularPath)?.rawTableId;
  }

  public getRawTableIdByPlural(
    pluralPath: string,
    mappings: TableUrlMapping[],
  ): string | undefined {
    return mappings.find((m) => m.pluralPath === pluralPath)?.rawTableId;
  }

  public getMapping(
    rawTableId: string,
    mappings: TableUrlMapping[],
  ): TableUrlMapping | undefined {
    return mappings.find((m) => m.rawTableId === rawTableId);
  }

  private getSafeTableName(rawTableId: string): string {
    const safeName = getSafetyName(rawTableId, 'INVALID_TABLE_NAME');
    return safeName.charAt(0).toLowerCase() + safeName.slice(1);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
