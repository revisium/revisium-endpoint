import { ArrayTypeHandler } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/array-type-handler';
import { BooleanTypeHandler } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/boolean-type-handler';
import { ForeignKeyArrayHandler } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/foreign-key-array-handler';
import { ForeignKeyHandler } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/foreign-key-handler';
import { NumberTypeHandler } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/number-type-handler';
import { ObjectTypeHandler } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/object-type-handler';
import { SchemaTypeHandlerContext } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/schema-type-handler-context.interface';
import { StringTypeHandler } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/string-type-handler';

export const createTypeHandlers = (
  handlerContext: SchemaTypeHandlerContext,
) => [
  new ForeignKeyHandler(handlerContext),
  new ForeignKeyArrayHandler(handlerContext),
  new StringTypeHandler(handlerContext),
  new NumberTypeHandler(handlerContext),
  new BooleanTypeHandler(handlerContext),
  new ObjectTypeHandler(handlerContext),
  new ArrayTypeHandler(handlerContext),
];
