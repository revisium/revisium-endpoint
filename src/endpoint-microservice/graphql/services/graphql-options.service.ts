import { Injectable, Logger } from '@nestjs/common';
import { Options } from 'src/endpoint-microservice/shared/converter';

@Injectable()
export class GraphQLOptionsService {
  private readonly logger = new Logger(GraphQLOptionsService.name);

  private options: Options | undefined;

  constructor() {
    this.validateAndLoadOptions();
  }

  public getOptions(): Options | undefined {
    return this.options;
  }

  private validateAndLoadOptions(): void {
    const envOptions: Options = {};
    let hasAnyOption = false;

    if (process.env.GRAPHQL_HIDE_NODE_TYPES !== undefined) {
      envOptions.hideNodeTypes = this.parseBoolean(
        process.env.GRAPHQL_HIDE_NODE_TYPES,
        'GRAPHQL_HIDE_NODE_TYPES',
      );
      hasAnyOption = true;
    }

    if (process.env.GRAPHQL_HIDE_FLAT_TYPES !== undefined) {
      envOptions.hideFlatTypes = this.parseBoolean(
        process.env.GRAPHQL_HIDE_FLAT_TYPES,
        'GRAPHQL_HIDE_FLAT_TYPES',
      );
      hasAnyOption = true;
    }

    if (process.env.GRAPHQL_FLAT_POSTFIX !== undefined) {
      envOptions.flatPostfix = this.validateGraphQLIdentifier(
        process.env.GRAPHQL_FLAT_POSTFIX,
        'GRAPHQL_FLAT_POSTFIX',
      );
      hasAnyOption = true;
    }

    if (process.env.GRAPHQL_NODE_POSTFIX !== undefined) {
      envOptions.nodePostfix = this.validateGraphQLIdentifier(
        process.env.GRAPHQL_NODE_POSTFIX,
        'GRAPHQL_NODE_POSTFIX',
      );
      hasAnyOption = true;
    }

    if (process.env.GRAPHQL_PREFIX_FOR_TABLES !== undefined) {
      envOptions.prefixForTables = this.validateGraphQLIdentifier(
        process.env.GRAPHQL_PREFIX_FOR_TABLES,
        'GRAPHQL_PREFIX_FOR_TABLES',
      );
      hasAnyOption = true;
    }

    if (process.env.GRAPHQL_PREFIX_FOR_COMMON !== undefined) {
      envOptions.prefixForCommon = this.validateGraphQLIdentifier(
        process.env.GRAPHQL_PREFIX_FOR_COMMON,
        'GRAPHQL_PREFIX_FOR_COMMON',
      );
      hasAnyOption = true;
    }

    this.validatePostfixMutualExclusivity(envOptions);

    this.options = hasAnyOption ? envOptions : undefined;

    this.logger.log(this.options);
  }

  private parseBoolean(value: string, envName: string): boolean {
    const normalizedValue = value.toLowerCase().trim();
    if (normalizedValue === 'true' || normalizedValue === '1') {
      return true;
    }
    if (normalizedValue === 'false' || normalizedValue === '0') {
      return false;
    }
    throw new Error(
      `Invalid boolean value for ${envName}: ${value}. Expected: true, false, 1, or 0`,
    );
  }

  private validateGraphQLIdentifier(value: string, envName: string): string {
    if (value === '') {
      return value;
    }

    if (!/^[_A-Za-z][_0-9A-Za-z]*$/.test(value)) {
      throw new Error(
        `Invalid GraphQL identifier for ${envName}: ${value}. Must be empty or match GraphQL naming convention (start with letter or underscore, followed by letters, digits, or underscores)`,
      );
    }

    return value;
  }

  private validatePostfixMutualExclusivity(options: Options): void {
    const flatPostfix = options.flatPostfix;
    const nodePostfix = options.nodePostfix;
    const hideNodeTypes = options.hideNodeTypes;
    const hideFlatTypes = options.hideFlatTypes;

    const isFlatEmpty = flatPostfix !== undefined && flatPostfix === '';
    const isNodeEmpty = nodePostfix !== undefined && nodePostfix === '';
    const isFlatEmptyAndNodeUndefined =
      isFlatEmpty && nodePostfix === undefined;
    const isNodeEmptyAndFlatUndefined =
      isNodeEmpty && flatPostfix === undefined;

    const isNodeTypeHidden = hideNodeTypes === true;
    const isFlatTypeHidden = hideFlatTypes === true;

    if (isFlatEmpty && isNodeEmpty && !isNodeTypeHidden && !isFlatTypeHidden) {
      throw new Error(
        'GRAPHQL_FLAT_POSTFIX and GRAPHQL_NODE_POSTFIX cannot both be empty at the same time. At least one must have a value or be undefined.',
      );
    }

    if (isFlatEmptyAndNodeUndefined && !isFlatTypeHidden && !isNodeTypeHidden) {
      throw new Error(
        'Conflicting postfix configuration: at least one postfix must have a value when the other is empty.',
      );
    }

    if (isNodeEmptyAndFlatUndefined && !isNodeTypeHidden && !isFlatTypeHidden) {
      throw new Error(
        'Conflicting postfix configuration: at least one postfix must have a value when the other is empty.',
      );
    }
  }
}
