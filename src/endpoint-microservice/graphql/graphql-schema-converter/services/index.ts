import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';

export const GRAPHQL_SCHEMA_CONVERTER_SERVICES = [
  ContextService,
  ResolverService,
];
