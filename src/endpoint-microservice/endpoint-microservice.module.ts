import { DynamicModule, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { AppOptionsModule } from 'src/endpoint-microservice/app-options.module';
import { ENDPOINT_COMMANDS } from 'src/endpoint-microservice/commands/handlers';
import { RunAllEndpointsCommand } from 'src/endpoint-microservice/commands/impl/run-all-endpoints.command';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { EndpointEventsModule } from 'src/endpoint-microservice/events/endpoint-events.module';
import { GraphqlModule } from 'src/endpoint-microservice/graphql/graphql.module';
import { MetricsModule } from 'src/endpoint-microservice/metrics/metrics.module';
import { RestapiModule } from 'src/endpoint-microservice/restapi/restapi.module';
import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';

@Module({})
export class EndpointMicroserviceModule implements OnApplicationBootstrap {
  static forRoot(options: AppOptions): DynamicModule {
    return {
      module: EndpointMicroserviceModule,
      imports: [
        AppOptionsModule.forRoot(options),
        CqrsModule,
        ConfigModule,
        DatabaseModule,
        GraphqlModule,
        RestapiModule,
        CoreApiModule,
        MetricsModule,
        EndpointEventsModule,
      ],
      providers: [...ENDPOINT_COMMANDS],
      exports: [],
    };
  }

  constructor(
    private readonly commandBus: CommandBus,
    private readonly internalCoreApiService: InternalCoreApiService,
  ) {}

  public async onApplicationBootstrap() {
    // wait for REST API
    setImmediate(async () => {
      await this.internalCoreApiService.initApi();
      await this.commandBus.execute(new RunAllEndpointsCommand());
    });
  }
}
