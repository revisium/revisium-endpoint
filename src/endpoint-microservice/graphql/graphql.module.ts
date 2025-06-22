import { Module, OnApplicationShutdown } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AsyncLocalStorage } from 'async_hooks';
import { ClsModule } from 'nestjs-cls';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { GRAPHQL_COMMANDS } from 'src/endpoint-microservice/graphql/commands/handlers';
import { GraphqlEndpointController } from 'src/endpoint-microservice/graphql/graphql-endpoint.controller';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';
import { GraphQLSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';
import { GRAPHQL_QUERIES } from 'src/endpoint-microservice/graphql/queries/handlers';
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
  ],
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
    GraphQLSchemaConverter,
    GraphqlEndpointService,
    ...GRAPHQL_COMMANDS,
    ...GRAPHQL_QUERIES,
  ],
  controllers: [GraphqlEndpointController],
})
export class GraphqlModule implements OnApplicationShutdown {
  constructor(
    private readonly graphqlEndpointService: GraphqlEndpointService,
  ) {}

  async onApplicationShutdown() {
    await this.graphqlEndpointService.shutdown();
  }
}
