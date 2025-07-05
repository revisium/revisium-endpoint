import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { getErrorPayload } from 'src/endpoint-microservice/shared/utils/getErrorPayload';

@Injectable()
export class CoreApiIndicator extends HealthIndicator {
  constructor(private readonly coreApi: ProxyCoreApiService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const { data, error } = await this.fetch();

    const isHealthy = Boolean(data);

    const result = this.getStatus(key, isHealthy, data || error);

    if (data) {
      return this.getStatus(key, isHealthy, data);
    }

    throw new HealthCheckError('core api failed', result);
  }

  private async fetch() {
    try {
      return await this.coreApi.health.liveness();
    } catch (e: unknown) {
      const errorPayload = getErrorPayload(e);

      return {
        data: null,
        error: errorPayload,
      };
    }
  }
}
