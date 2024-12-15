import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { ENDPOINT_COMMANDS } from 'src/endpoint-microservice/commands/handlers';
import { RunAllEndpointsCommand } from 'src/endpoint-microservice/commands/impl/run-all-endpoints.command';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { EndpointListenerController } from 'src/endpoint-microservice/endpoint-listener.controller';
import { GraphqlModule } from 'src/endpoint-microservice/graphql/graphql.module';
import { RestapiModule } from 'src/endpoint-microservice/restapi/restapi.module';

@Module({
  imports: [
    CqrsModule,
    ConfigModule.forRoot(),
    DatabaseModule,
    GraphqlModule,
    RestapiModule,
    CoreApiModule,
  ],
  controllers: [EndpointListenerController],
  providers: [...ENDPOINT_COMMANDS],
})
export class EndpointMicroserviceModule implements OnApplicationBootstrap {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly internalCoreApiService: InternalCoreApiService,
  ) {}

  public async onApplicationBootstrap() {
    // TODO wait for REST API
    setImmediate(async () => {
      try {
        await this.internalCoreApiService.initApi();
        await this.commandBus.execute(new RunAllEndpointsCommand());
      } catch (e) {
        console.error(e);
      }
    });
  }
}
