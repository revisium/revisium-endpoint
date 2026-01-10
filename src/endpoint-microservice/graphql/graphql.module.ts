import { Module, OnApplicationShutdown } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ClsModule } from 'nestjs-cls';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { GRAPHQL_COMMANDS } from 'src/endpoint-microservice/graphql/commands/handlers';
import { GraphqlEndpointController } from 'src/endpoint-microservice/graphql/graphql-endpoint.controller';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';
import { GraphqlSchemaConverterModule } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema-converter.module';
import { GRAPHQL_QUERIES } from 'src/endpoint-microservice/graphql/queries/handlers';
import { GraphQLOptionsService } from 'src/endpoint-microservice/graphql/services/graphql-options.service';
import { MetricsModule } from 'src/endpoint-microservice/metrics/metrics.module';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    CqrsModule,
    DatabaseModule,
    CoreApiModule,
    MetricsModule,
    GraphqlSchemaConverterModule,
  ],
  providers: [
    GraphqlEndpointService,
    GraphQLOptionsService,
    ...GRAPHQL_COMMANDS,
    ...GRAPHQL_QUERIES,
  ],
  controllers: [GraphqlEndpointController],
  exports: [GraphqlEndpointService],
})
export class GraphqlModule implements OnApplicationShutdown {
  constructor(
    private readonly graphqlEndpointService: GraphqlEndpointService,
  ) {}

  async onApplicationShutdown() {
    await this.graphqlEndpointService.shutdown();
  }
}
