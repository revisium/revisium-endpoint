import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { NamingService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/naming.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ModelService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/model.service';
import { FieldRegistrationService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/field-registration.service';

export interface SchemaTypeHandlerContext {
  contextService: ContextService;
  namingService: NamingService;
  resolverService: ResolverService;
  cacheService: CacheService;
  modelService: ModelService;
  fieldRegistrationService: FieldRegistrationService;
}
