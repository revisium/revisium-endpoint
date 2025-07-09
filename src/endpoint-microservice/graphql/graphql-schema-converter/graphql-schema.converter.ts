import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { GraphQLSchema } from 'graphql/type';
import { lexicographicSortSchema } from 'graphql/utilities';
import { ModelService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/model.service';
import { QueriesService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/queries.service';
import {
  Schema,
  TypeModel,
  TypeModelField,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { SchemaToBuilderConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema-to-builder.converter';
import { ValidTableType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { createValidTables } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/createValidTables';
import {
  Converter,
  ConverterContextType,
} from 'src/endpoint-microservice/shared/converter';

const FLAT_KEY = 'Flat';

export interface CacheNode {
  nodeType: TypeModel;
  dataFlatRoot: TypeModelField;
}

export interface GraphQLSchemaConverterContext extends ConverterContextType {
  nodes: Record<string, CacheNode>;
  schema: Schema;
}

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  constructor(
    private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>,
    private readonly queriesService: QueriesService,
    private readonly modelService: ModelService,
  ) {}

  private get context(): GraphQLSchemaConverterContext {
    const context = this.asyncLocalStorage.getStore();

    if (!context) {
      throw new InternalServerErrorException(
        'GraphQLSchemaConverterContext not found. It appears that an attempt was made to access a context outside of AsyncLocalStorage.run.',
      );
    }

    return context;
  }

  public async convert(context: ConverterContextType): Promise<GraphQLSchema> {
    const graphQLSchemaConverterContext: GraphQLSchemaConverterContext = {
      ...context,
      nodes: {},
      schema: new Schema(),
    };

    return this.asyncLocalStorage.run(
      graphQLSchemaConverterContext,
      async () => {
        await this.createSchema();

        const schemaToBuilderConverter = new SchemaToBuilderConverter(
          graphQLSchemaConverterContext.schema,
        );

        schemaToBuilderConverter.convert();

        const schemaNext = schemaToBuilderConverter.builder.toSchema();

        return lexicographicSortSchema(schemaNext);
      },
    );
  }

  private async createSchema() {
    const validTables = createValidTables(this.context.tables);

    this.createValidTables(validTables);
    this.context.schema.resolveAllThunks();
    this.createQueries(validTables);
  }

  private createValidTables(validTables: Record<string, ValidTableType>) {
    const options = Object.values(validTables).map(
      (validTable) => validTable.options,
    );

    this.modelService.create(options);
  }

  private createQueries(validTables: Record<string, ValidTableType>) {
    Object.values(validTables).forEach((validTable) => {
      const pluralKey = `${validTable.fieldName.plural}`;
      const singularKey = `${validTable.fieldName.singular}`;
      const flatSingularKey = `${validTable.fieldName.singular}${FLAT_KEY}`;
      const flatPluralKey = `${validTable.fieldName.plural}${FLAT_KEY}`;

      this.queriesService.createItemField(singularKey, validTable.options);

      this.queriesService.createListField(pluralKey, validTable.options);
      this.queriesService.createItemFlatField(
        flatSingularKey,
        validTable.options,
      );
      this.queriesService.createListFlatField(
        flatPluralKey,
        validTable.options,
      );
    });
  }
}
