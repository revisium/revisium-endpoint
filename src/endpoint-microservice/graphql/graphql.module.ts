import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { GRAPHQL_COMMANDS } from 'src/endpoint-microservice/graphql/commands/handlers';
import { GraphqlEndpointController } from 'src/endpoint-microservice/graphql/graphql-endpoint.controller';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';
import { GRAPHQL_QUERIES } from 'src/endpoint-microservice/graphql/queries/handlers';
import { MetricsModule } from 'src/endpoint-microservice/metrics/metrics.module';

@Module({
  imports: [CqrsModule, DatabaseModule, CoreApiModule, MetricsModule],
  providers: [GraphqlEndpointService, ...GRAPHQL_COMMANDS, ...GRAPHQL_QUERIES],
  controllers: [GraphqlEndpointController],
})
export class GraphqlModule {}
