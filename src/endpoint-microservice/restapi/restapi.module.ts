import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { MetricsModule } from 'src/endpoint-microservice/metrics/metrics.module';
import { REST_API_COMMANDS } from 'src/endpoint-microservice/restapi/commands/handlers';
import {
  RevisionController,
  RowController,
  TableController,
} from 'src/endpoint-microservice/restapi/controllers';
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
    SwaggerEndpointController,
  ],
})
export class RestapiModule {}
