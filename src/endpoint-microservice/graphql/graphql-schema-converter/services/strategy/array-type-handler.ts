import { createArrayItemContext } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/schema-processing-context.utils';
import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import { BaseSchemaTypeHandler } from './base-schema-type-handler';
import { SchemaProcessingContext } from './schema-processing-context.interface';
import { FieldResult } from './schema-type-handler.interface';
import { isArrayStore } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isArrayStore';

const ITEMS_POSTFIX = 'Items';

export class ArrayTypeHandler extends BaseSchemaTypeHandler {
  public canHandle(schema: JsonSchemaStore): boolean {
    return schema.type === 'array';
  }

  public handle(context: SchemaProcessingContext): FieldResult {
    if (!isArrayStore(context.schema)) {
      throw new Error('Schema must be an array store');
    }

    const accumulatedPostfix = this.getAccumulatedPostfix(context);
    const arrayConfig =
      this.handlerContext.modelService.processSchemaWithHandler(
        createArrayItemContext(
          context,
          context.schema.items,
          accumulatedPostfix,
        ),
      );

    return this.createSimpleFieldResult(arrayConfig.field);
  }

  private getAccumulatedPostfix(context: SchemaProcessingContext): string {
    return (context.postfix || '') + ITEMS_POSTFIX;
  }
}
