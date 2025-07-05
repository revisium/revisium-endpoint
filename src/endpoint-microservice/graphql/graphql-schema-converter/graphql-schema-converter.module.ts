import { Module } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { FederationSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/federation-schema.converter';
import { GraphQLSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';
import { GRAPHQL_SCHEMA_CONVERTER_SERVICES } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services';

@Module({
  imports: [CoreApiModule],
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
    GraphQLSchemaConverter,
    FederationSchemaConverter,
    ...GRAPHQL_SCHEMA_CONVERTER_SERVICES,
  ],
  exports: [GraphQLSchemaConverter, FederationSchemaConverter],
})
export class GraphqlSchemaConverterModule {}
