import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from 'src/endpoint-microservice/common/interceptors/logging.interceptor';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { HealthModule } from 'src/endpoint-microservice/health/health.module';
import { MetricsApiModule } from 'src/endpoint-microservice/metrics-api/metrics-api.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    EndpointMicroserviceModule,
    MetricsApiModule,
    HealthModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }],
})
export class AppModule {}
