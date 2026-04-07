import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import {
  Api,
  LoginDto,
  RequestParams,
} from 'src/endpoint-microservice/core-api/generated/api';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import {
  APP_OPTIONS_TOKEN,
  AppOptions,
} from 'src/endpoint-microservice/shared/app-mode';
import { DEFAULT_PORT } from 'src/endpoint-microservice/shared/default-port';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InternalCoreApiService extends Api<unknown> {
  private readonly logger = new Logger(InternalCoreApiService.name);

  private token: string | undefined = undefined;
  private internalApiKey: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(APP_OPTIONS_TOKEN) private readonly options: AppOptions,
  ) {
    const CORE_API_URL = configService.get('CORE_API_URL');
    const PORT = configService.get('PORT') ?? DEFAULT_PORT;

    const baseUrl = CORE_API_URL ?? `http://0.0.0.0:${PORT}`;

    super({
      baseUrl,
    });
  }

  public async initApi() {
    this.internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (this.internalApiKey) {
      this.logger.log('Using internal API key for core authentication');
      return;
    }

    this.logger.warn(
      'Using deprecated password auth for endpoint→core communication. Set INTERNAL_API_KEY to upgrade.',
    );

    const isMonolith = this.options.mode === 'monolith';

    const loginDto = isMonolith
      ? await this.getLoginDtoInMonolithMode()
      : this.getLoginDtoInMicroserviceMode();

    const { data, error } = await this.api.login(loginDto);

    if (error) {
      throw new HttpException(error, error.statusCode);
    }

    this.token = data.accessToken;
  }

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    const params = super.mergeRequestParams(params1, params2);
    params.headers ??= {};

    if (this.internalApiKey) {
      (params.headers as Record<string, string>)['X-Internal-Api-Key'] =
        this.internalApiKey;
    } else {
      (params.headers as Record<string, string>)['Authorization'] =
        `Bearer ${this.token}`;
    }

    return params;
  }

  private getLoginDtoInMicroserviceMode(): LoginDto {
    const CORE_API_URL_USERNAME = this.configService.get(
      'CORE_API_URL_USERNAME',
    );

    const CORE_API_URL_PASSWORD = this.configService.get(
      'CORE_API_URL_PASSWORD',
    );

    if (!CORE_API_URL_USERNAME) {
      throw new Error(`Invalid CORE_API_URL_USERNAME`);
    }

    if (!CORE_API_URL_PASSWORD) {
      throw new Error(`Invalid CORE_API_URL_PASSWORD`);
    }

    return {
      emailOrUsername: CORE_API_URL_USERNAME,
      password: CORE_API_URL_PASSWORD,
    };
  }

  private async getLoginDtoInMonolithMode(): Promise<LoginDto> {
    const emailOrUsername = 'endpoint';
    const password = nanoid();
    const hashedRandomPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: emailOrUsername },
      data: {
        password: hashedRandomPassword,
      },
    });

    return {
      emailOrUsername,
      password,
    };
  }
}
