import { Injectable } from '@nestjs/common';
import { CoreApiIndicator } from 'src/endpoint-microservice/health/indicators/core-api.health';

@Injectable()
export class CoreApiCheck {
  constructor(private readonly coreApiHealth: CoreApiIndicator) {}

  public check() {
    return this.coreApiHealth.isHealthy('core-api');
  }
}
