import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { MetricsApiModule } from 'src/endpoint-microservice/metrics-api/metrics-api.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    EndpointMicroserviceModule,
    MetricsApiModule,
  ],
})
export class AppModule {}
