import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api } from 'src/endpoint-microservice/core-api/generated/api';
import { DEFAULT_PORT } from 'src/endpoint-microservice/shared/default-port';

@Injectable()
export class ProxyCoreApiService extends Api<unknown> {
  constructor(configService: ConfigService) {
    const CORE_API_URL = configService.get('CORE_API_URL');
    const PORT = configService.get('PORT') || DEFAULT_PORT;

    const baseUrl = CORE_API_URL || `http://0.0.0.0:${PORT}`;

    super({
      baseUrl,
    });
  }
}
