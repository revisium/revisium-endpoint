import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { getErrorPayload } from 'src/endpoint-microservice/shared/utils/getErrorPayload';

@Injectable()
export class CoreApiIndicator {
  constructor(
    private readonly coreApi: ProxyCoreApiService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const { data, error } = await this.fetch();

    if (data) {
      return indicator.up(data);
    }

    return indicator.down(error?.message ?? 'core api failed');
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
