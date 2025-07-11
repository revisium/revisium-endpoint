import { Injectable } from '@nestjs/common';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { getProjectName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getProjectName';
import { capitalize } from 'src/endpoint-microservice/shared/utils/stringUtils';

export type GraphQLTypeVariant =
  | 'base'
  | 'node'
  | 'flat'
  | 'connection'
  | 'edge'
  | 'flatConnection'
  | 'flatEdge';

/**
 * Centralized naming service for GraphQL schema generation
 * Handles consistent naming patterns for types, fields, inputs, and enums
 */
@Injectable()
export class NamingService {
  constructor(private readonly contextService: ContextService) {}

  /**
   * Get formatted project name from context
   */
  public getProjectName(): string {
    return getProjectName(this.contextService.context.projectName);
  }

  /**
   * Generate GraphQL type names using pre-processed table names
   */
  public getTypeName(
    processedTableName: string,
    variant: GraphQLTypeVariant = 'base',
  ): string {
    const formattedProject =
      this.contextService.prefixForTables ?? this.getProjectName();

    switch (variant) {
      case 'base':
        return `${formattedProject}${processedTableName}`;
      case 'node':
        return `${formattedProject}${processedTableName}Node`;
      case 'flat':
        return `${formattedProject}${processedTableName}Flat`;
      case 'connection':
        return `${formattedProject}${processedTableName}Connection`;
      case 'edge':
        return `${formattedProject}${processedTableName}Edge`;
      case 'flatConnection':
        return `${formattedProject}${processedTableName}FlatConnection`;
      case 'flatEdge':
        return `${formattedProject}${processedTableName}FlatEdge`;
      default:
        return `${formattedProject}${processedTableName}`;
    }
  }

  /**
   * Generate foreign key type name using simple capitalization
   */
  public getForeignKeyTypeName(
    foreignKeyTableName: string,
    isFlat: boolean = false,
  ): string {
    const formattedProject =
      this.contextService.prefixForTables ?? this.getProjectName();
    const capitalizedTable =
      foreignKeyTableName.charAt(0).toUpperCase() +
      foreignKeyTableName.slice(1);

    return `${formattedProject}${capitalizedTable}${isFlat ? 'Flat' : 'Node'}`;
  }

  /**
   * Generate system type names (shared across all tables)
   */
  public getSystemTypeName(systemType: 'pageInfo' | 'sortOrder'): string {
    const formattedProject =
      this.contextService.prefixForCommon ?? this.getProjectName();

    switch (systemType) {
      case 'pageInfo':
        return `${formattedProject}PageInfo`;
      case 'sortOrder':
        return `${formattedProject}SortOrder`;
      default:
        return `${formattedProject}${capitalize(systemType)}`;
    }
  }

  /**
   * Generate system filter type names
   */
  public getSystemFilterTypeName(
    filterType: 'string' | 'bool' | 'dateTime' | 'json',
  ): string {
    const formattedProject =
      this.contextService.prefixForCommon ?? this.getProjectName();

    switch (filterType) {
      case 'string':
        return `${formattedProject}StringFilter`;
      case 'bool':
        return `${formattedProject}BoolFilter`;
      case 'dateTime':
        return `${formattedProject}DateTimeFilter`;
      case 'json':
        return `${formattedProject}JsonFilter`;
      default:
        return `${formattedProject}${capitalize(filterType)}Filter`;
    }
  }

  /**
   * Generate system filter mode enum names
   */
  public getSystemFilterModeEnumName(filterType: 'string' | 'json'): string {
    const formattedProject =
      this.contextService.prefixForCommon ?? this.getProjectName();

    switch (filterType) {
      case 'string':
        return `${formattedProject}FilterStringMode`;
      case 'json':
        return `${formattedProject}FilterJsonMode`;
      default:
        return `${formattedProject}Filter${capitalize(filterType)}Mode`;
    }
  }

  /**
   * Generate type names with postfix (used for nested types)
   */
  public getTypeNameWithPostfix(baseName: string, postfix: string): string {
    return `${baseName}${postfix}`;
  }

  /**
   * Generate input type names for GraphQL queries
   */
  public getGetInputTypeName(tableName: string): string {
    const formattedProject =
      this.contextService.prefixForTables ?? this.getProjectName();
    return `${formattedProject}Get${tableName}Input`;
  }

  /**
   * Generate order by field enum names
   */
  public getOrderByFieldEnumName(tableName: string): string {
    const formattedProject =
      this.contextService.prefixForTables ?? this.getProjectName();
    return `${formattedProject}Get${tableName}OrderByField`;
  }

  /**
   * Generate order by input type names
   */
  public getOrderByInputTypeName(tableName: string): string {
    const formattedProject =
      this.contextService.prefixForTables ?? this.getProjectName();
    return `${formattedProject}Get${tableName}OrderByInput`;
  }

  /**
   * Generate where input type names
   */
  public getWhereInputTypeName(tableName: string): string {
    const formattedProject =
      this.contextService.prefixForTables ?? this.getProjectName();
    return `${formattedProject}${tableName}WhereInput`;
  }
}
