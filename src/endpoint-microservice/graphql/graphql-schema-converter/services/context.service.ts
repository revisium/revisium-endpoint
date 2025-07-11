import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { GraphQLSchemaConverterContext } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';

@Injectable()
export class ContextService {
  constructor(
    private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>,
  ) {}

  public get context(): GraphQLSchemaConverterContext {
    const context = this.asyncLocalStorage.getStore();

    if (!context) {
      throw new InternalServerErrorException(
        'GraphQLSchemaConverterContext not found. It appears that an attempt was made to access a context outside of AsyncLocalStorage.run.',
      );
    }

    return context;
  }

  public get schema() {
    return this.context.schema;
  }

  public get hideNodeTypes() {
    return this.context.options?.hideNodeTypes;
  }

  public get hideFlatTypes() {
    return this.context.options?.hideFlatTypes;
  }
}
