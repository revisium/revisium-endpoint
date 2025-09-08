import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { AppOptionsModule } from 'src/endpoint-microservice/app-options.module';
import { ENDPOINT_COMMANDS } from 'src/endpoint-microservice/commands/handlers';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { GraphqlModule } from 'src/endpoint-microservice/graphql/graphql.module';
import { MetricsModule } from 'src/endpoint-microservice/metrics/metrics.module';
import { RestapiModule } from 'src/endpoint-microservice/restapi/restapi.module';
import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';
import { SynchronizationModule } from 'src/endpoint-microservice/synchronization/synchronization.module';

@Module({})
export class EndpointMicroserviceModule {
  static forRoot(options: AppOptions): DynamicModule {
    return {
      module: EndpointMicroserviceModule,
      imports: [
        AppOptionsModule.forRoot(options),
        CqrsModule,
        ConfigModule,
        DatabaseModule,
        SynchronizationModule,
        GraphqlModule,
        RestapiModule,
        CoreApiModule,
        MetricsModule,
      ],
      providers: [...ENDPOINT_COMMANDS],
      exports: [],
    };
  }
}
