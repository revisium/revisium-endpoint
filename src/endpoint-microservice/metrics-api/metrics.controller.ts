import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import * as client from 'prom-client';
import { MetricsEnabledGuard } from 'src/endpoint-microservice/metrics-api/metrics-enabled.guard';

@ApiExcludeController()
@Controller('metrics')
@UseGuards(MetricsEnabledGuard)
export class MetricsController {
  @Get()
  async getMetrics(@Res() response: Response) {
    const metrics = await client.register.metrics();

    response.set('Content-Type', client.register.contentType);

    response.end(metrics);
  }
}
