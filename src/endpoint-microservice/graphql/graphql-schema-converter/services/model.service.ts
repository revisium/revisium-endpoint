import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { NamingService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/naming.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import { NodeTypeBuilderService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/node-type-builder.service';
import { FieldRegistrationService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/field-registration.service';
import { TypeModelField } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { createTypeHandlers } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/strategy/create-type-handlers';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { isRootForeignStore } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isRootForeignStore';
import { applySchemaDescriptions } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/schema-description.utils';
import {
  addDefaults,
  createFlatContext,
  createNodeContext,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/schema-processing-context.utils';
import {
  SchemaTypeHandler,
  SchemaTypeHandlerContext,
  SchemaProcessingContext,
  FieldResult,
} from './strategy';

@Injectable()
export class ModelService {
  private readonly schemaTypeHandlers: SchemaTypeHandler[];

  constructor(
    private readonly contextService: ContextService,
    private readonly resolver: ResolverService,
    private readonly cacheService: CacheService,
    private readonly namingService: NamingService,
    private readonly nodeTypeBuilderService: NodeTypeBuilderService,
    private readonly fieldRegistrationService: FieldRegistrationService,
  ) {
    const handlerContext: SchemaTypeHandlerContext = {
      contextService: this.contextService,
      namingService: this.namingService,
      resolverService: this.resolver,
      cacheService: this.cacheService,
      modelService: this,
      fieldRegistrationService: this.fieldRegistrationService,
    };

    this.schemaTypeHandlers = createTypeHandlers(handlerContext);
  }

  public create(options: CreatingTableOptionsType[]) {
    this.createNotRootForeignKey(options);
    this.createRootForeignKey(options);
  }

  public getNodeType(options: CreatingTableOptionsType) {
    const { nodeType, typeName } =
      this.nodeTypeBuilderService.createNodeType(options);

    this.processSchemaField(createNodeContext(options, typeName));

    return {
      nodeType,
    };
  }

  public getFlatType(options: CreatingTableOptionsType, parentType: string) {
    return this.processSchemaField(createFlatContext(options, parentType));
  }

  public processSchemaField(context: SchemaProcessingContext): {
    field: TypeModelField;
  } {
    const result = this.processSchemaWithHandler(addDefaults(context));

    applySchemaDescriptions(context.schema, result.field);

    if (result.fieldThunk) {
      this.fieldRegistrationService.registerFieldThunkWithParent(
        context,
        result.fieldThunk,
      );
    } else {
      this.fieldRegistrationService.registerFieldWithParent(
        context,
        result.field,
      );
    }

    return { field: result.field };
  }

  public processSchemaWithHandler(
    context: SchemaProcessingContext,
  ): FieldResult {
    const handler = this.schemaTypeHandlers.find((handler) =>
      handler.canHandle(context.schema),
    );

    if (!handler) {
      throw new InternalServerErrorException(
        `endpointId: ${this.contextService.context.endpointId}, unknown schema: ${JSON.stringify(context.schema)}`,
      );
    }

    return handler.handle(context);
  }

  private createNotRootForeignKey(options: CreatingTableOptionsType[]) {
    for (const option of options) {
      const store = option.table.store;

      if (isRootForeignStore(store)) {
        continue;
      }

      this.createRootTypes(option);
    }
  }

  private createRootForeignKey(options: CreatingTableOptionsType[]) {
    for (const option of options) {
      const store = option.table.store;

      if (isRootForeignStore(store)) {
        this.createRootTypes(option);
      }
    }
  }

  private createRootTypes(option: CreatingTableOptionsType): void {
    const { nodeType } = this.getNodeType(option);
    const dataFlat = this.getFlatType(option, '');

    this.cacheService.add(option.table.id, {
      nodeType,
      dataFlatRoot: dataFlat.field,
    });
  }
}
