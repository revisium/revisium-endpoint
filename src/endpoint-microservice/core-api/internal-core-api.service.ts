import { HttpException, Inject, Injectable } from '@nestjs/common';
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
  private token: string | undefined = undefined;

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
    const isMonolith = this.options.mode === 'monolith';

    const loginDto = isMonolith
      ? await this.getLoginDtoInBuildMode()
      : this.getLoginDtoInCloudMode();

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
    params.headers['Authorization'] = `Bearer ${this.token}`;
    return params;
  }

  private getLoginDtoInCloudMode(): LoginDto {
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

  private async getLoginDtoInBuildMode(): Promise<LoginDto> {
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
