import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthIndicatorFunction } from '@nestjs/terminus/dist/health-indicator';
import { CoreApiCheck } from 'src/endpoint-microservice/health/core-api.check';
import { NotificationCheck } from 'src/endpoint-microservice/health/notification.check';
import { DatabaseCheck } from 'src/endpoint-microservice/health/database-check.service';

@ApiExcludeController()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: DatabaseCheck,
    private readonly notifications: NotificationCheck,
    private readonly coreApi: CoreApiCheck,
  ) {}

  @Get('liveness')
  @HealthCheck()
  liveness() {
    const indicators: HealthIndicatorFunction[] = [
      async () => this.prisma.check(),
      async () => this.notifications.check(),
      async () => this.coreApi.check(),
    ];

    return this.health.check(indicators);
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([]);
  }
}
