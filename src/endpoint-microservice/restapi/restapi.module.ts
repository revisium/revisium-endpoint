import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { MetricsModule } from 'src/endpoint-microservice/metrics/metrics.module';
import { REST_API_COMMANDS } from 'src/endpoint-microservice/restapi/commands/handlers';
import {
  LegacyRevisionController,
  LegacyRowController,
  LegacyTableController,
  RevisionController,
  RowController,
  TableController,
} from 'src/endpoint-microservice/restapi/controllers';
import { DeprecatedRestapiMiddleware } from 'src/endpoint-microservice/restapi/middleware';
import { REST_API_QUERIES } from 'src/endpoint-microservice/restapi/queries/handlers';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { RestapiOptionsService } from 'src/endpoint-microservice/restapi/services/restapi-options.service';
import { SwaggerEndpointController } from 'src/endpoint-microservice/restapi/swagger-endpoint.controller';

@Module({
  imports: [CqrsModule, DatabaseModule, CoreApiModule, MetricsModule],
  providers: [
    RestapiOptionsService,
    RestapiEndpointService,
    ...REST_API_COMMANDS,
    ...REST_API_QUERIES,
  ],
  controllers: [
    RevisionController,
    TableController,
    RowController,
    LegacyRevisionController,
    LegacyTableController,
    LegacyRowController,
    SwaggerEndpointController,
  ],
  exports: [RestapiEndpointService],
})
export class RestapiModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DeprecatedRestapiMiddleware)
      .forRoutes('/endpoint/restapi/*');
  }
}
