import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql/type';
import { GraphQLFieldConfig } from 'graphql/type/definition';
import { lexicographicSortSchema, printSchema } from 'graphql/utilities';
import { RowModel } from 'src/endpoint-microservice/core-api/generated/api';
import { ModelService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/model.service';
import { QueriesService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/queries.service';
import { ValidTableType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { createScalarFilterTypes } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createScalarFilterTypes';
import { createServiceField } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/createServiceField';
import { getPageInfoType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/getPageInfoType';
import { getSortOrder } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/getSortOrder';
import { createValidTables } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/createValidTables';
import { getProjectName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getProjectName';
import {
  Converter,
  ConverterContextType,
} from 'src/endpoint-microservice/shared/converter';

const FLAT_KEY = 'Flat';

export interface CacheNode {
  node: GraphQLObjectType<RowModel>;
  dataFlat: GraphQLFieldConfig<any, any>;
}

export interface GraphQLSchemaConverterContext extends ConverterContextType {
  pageInfo: GraphQLObjectType;
  sortOrder: GraphQLEnumType;
  listArgsMap: Record<string, GraphQLInputObjectType>;
  filterTypes: Record<string, GraphQLInputObjectType>;
  whereInputTypeMap: Record<string, GraphQLInputObjectType>;
  nodes: Record<string, CacheNode>;
}

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  constructor(
    private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>,
    private readonly queriesService: QueriesService,
    private readonly movelService: ModelService,
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
      pageInfo: getPageInfoType(getProjectName(context.projectName)),
      sortOrder: getSortOrder(getProjectName(context.projectName)),
      listArgsMap: {},
      filterTypes: createScalarFilterTypes(getProjectName(context.projectName)),
      whereInputTypeMap: {},
      nodes: {},
    };

    return this.asyncLocalStorage.run(
      graphQLSchemaConverterContext,
      async () => {
        const schema = await this.createSchema();
        return lexicographicSortSchema(schema);
      },
    );
  }

  private async createSchema(): Promise<GraphQLSchema> {
    let cachedSdl: string = undefined;

    const validTables = createValidTables(this.context.tables);

    this.createValidTables(validTables);

    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: () => ({
          ...this.createQueries(validTables),
          _service: createServiceField(() => {
            if (!cachedSdl) {
              cachedSdl = printSchema(schema);
            }
            return { sdl: cachedSdl };
          }),
        }),
      }),
    });

    return schema;
  }

  private createValidTables(validTables: Record<string, ValidTableType>) {
    const options = Object.values(validTables).map(
      (validTable) => validTable.options,
    );

    this.movelService.create(options);
  }

  private createQueries(
    validTables: Record<string, ValidTableType>,
  ): Record<string, any> {
    return Object.values(validTables).reduce((fields, validTable) => {
      const pluralKey = `${validTable.fieldName.plural}`;
      const singularKey = `${validTable.fieldName.singular}`;
      const flatSingularKey = `${validTable.fieldName.singular}${FLAT_KEY}`;
      const flatPluralKey = `${validTable.fieldName.plural}${FLAT_KEY}`;

      fields[singularKey] = this.queriesService.createItemField(
        validTable.options,
      );
      fields[pluralKey] = this.queriesService.createListField(
        validTable.options,
      );
      fields[flatSingularKey] = this.queriesService.createItemFlatField(
        validTable.options,
      );
      fields[flatPluralKey] = this.queriesService.createListFlatField(
        validTable.options,
      );

      return fields;
    }, {});
  }
}
