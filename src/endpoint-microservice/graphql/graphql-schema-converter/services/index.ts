import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ModelService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/model.service';
import { NamingService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/naming.service';
import { QueriesService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/queries.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import { CommonSchemaService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/common-schema.service';
import { NodeTypeBuilderService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/node-type-builder.service';
import { FieldRegistrationService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/field-registration.service';

export const GRAPHQL_SCHEMA_CONVERTER_SERVICES = [
  ContextService,
  ResolverService,
  CacheService,
  ModelService,
  NamingService,
  QueriesService,
  CommonSchemaService,
  NodeTypeBuilderService,
  FieldRegistrationService,
];
