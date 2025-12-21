import { Injectable, Logger } from '@nestjs/common';
import { isValidIdentifier } from 'src/endpoint-microservice/shared/utils/naming';

export type RestapiOptions = {
  prefixForTables?: string;
  prefixForCommon?: string;
};

@Injectable()
export class RestapiOptionsService {
  private readonly logger = new Logger(RestapiOptionsService.name);

  private options: RestapiOptions | undefined;

  constructor() {
    this.validateAndLoadOptions();
  }

  public getOptions(): RestapiOptions | undefined {
    return this.options;
  }

  private validateAndLoadOptions(): void {
    const envOptions: RestapiOptions = {};
    let hasAnyOption = false;

    if (process.env.RESTAPI_PREFIX_FOR_TABLES !== undefined) {
      envOptions.prefixForTables = this.validateIdentifier(
        process.env.RESTAPI_PREFIX_FOR_TABLES,
        'RESTAPI_PREFIX_FOR_TABLES',
      );
      hasAnyOption = true;
    }

    if (process.env.RESTAPI_PREFIX_FOR_COMMON !== undefined) {
      envOptions.prefixForCommon = this.validateIdentifier(
        process.env.RESTAPI_PREFIX_FOR_COMMON,
        'RESTAPI_PREFIX_FOR_COMMON',
      );
      hasAnyOption = true;
    }

    this.options = hasAnyOption ? envOptions : undefined;

    this.logger.log(this.options);
  }

  private validateIdentifier(value: string, envName: string): string {
    if (!isValidIdentifier(value)) {
      throw new Error(
        `Invalid identifier for ${envName}: ${value}. Must be empty or match naming convention (start with letter or underscore, followed by letters, digits, or underscores)`,
      );
    }

    return value;
  }
}
