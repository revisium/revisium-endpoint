import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { GraphQLSchema } from 'graphql/type';
import { lexicographicSortSchema } from 'graphql/utilities';
import { CommonSchemaService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/common-schema.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ModelService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/model.service';
import { NamingService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/naming.service';
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
import { JsonSchemaStore } from '@revisium/schema-toolkit/model';
import {
  createJsonSchemaStore,
  pluginRefs,
} from '@revisium/schema-toolkit/lib';

export interface CacheNode {
  nodeType?: TypeModel;
  dataFlatRoot?: TypeModelField;
}

export interface GraphQLSchemaConverterContext extends ConverterContextType {
  nodes: Record<string, CacheNode>;
  schema: Schema;
  tables: (ConverterContextType['tables'][number] & {
    store: JsonSchemaStore;
  })[];
}

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  constructor(
    private readonly contextService: ContextService,
    private readonly namingService: NamingService,
    private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>,
    private readonly queriesService: QueriesService,
    private readonly modelService: ModelService,
    private readonly commonSchemaService: CommonSchemaService,
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
      tables: context.tables.map((table) => {
        const store = createJsonSchemaStore(table.schema, pluginRefs);
        const resoledSchema = store.getPlainSchema({ skip$Ref: true });

        return {
          ...table,
          schema: resoledSchema,
          store,
        };
      }),
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

        const schemaNext = schemaToBuilderConverter.builder.toSubGraphSchema({
          linkUrl: 'https://specs.apollo.dev/federation/v2.3',
          federationDirectives: ['@key'],
        });

        return lexicographicSortSchema(schemaNext);
      },
    );
  }

  private async createSchema() {
    const validTables = createValidTables(this.context.tables);

    this.commonSchemaService.createCommon();
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
      const nodePostfix = this.namingService.getNodePostfix();
      const flatPostfix = this.namingService.getFlatPostfix();

      const pluralKey = `${validTable.fieldName.plural}${nodePostfix}`;
      const singularKey = `${validTable.fieldName.singular}${nodePostfix}`;
      const flatSingularKey = `${validTable.fieldName.singular}${flatPostfix}`;
      const flatPluralKey = `${validTable.fieldName.plural}${flatPostfix}`;

      if (!this.contextService.hideNodeTypes) {
        this.queriesService.createItemField(singularKey, validTable.options);
        this.queriesService.createListField(pluralKey, validTable.options);
      }

      if (!this.contextService.hideFlatTypes) {
        this.queriesService.createItemFlatField(
          flatSingularKey,
          validTable.options,
        );
        this.queriesService.createListFlatField(
          flatPluralKey,
          validTable.options,
        );
      }
    });
  }
}
