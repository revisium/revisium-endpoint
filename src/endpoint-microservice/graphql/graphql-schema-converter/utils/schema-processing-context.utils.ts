import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import { CreatingTableOptionsType } from '../types';
import { SchemaProcessingContext } from '../services/strategy/schema-processing-context.interface';

const DATA_KEY = 'data';

export class SchemaProcessingContextUtils {
  public static createNodeContext(
    options: CreatingTableOptionsType,
    parentType: string,
  ): SchemaProcessingContext {
    return {
      schema: options.table.store,
      table: options.table,
      safetyTableId: options.safetyTableId,
      fieldName: DATA_KEY,
      isFlat: false,
      parentType,
      postfix: '',
      inList: false,
    };
  }

  public static createFlatContext(
    options: CreatingTableOptionsType,
    parentType: string,
  ): SchemaProcessingContext {
    return {
      schema: options.table.store,
      table: options.table,
      safetyTableId: options.safetyTableId,
      fieldName: 'userFlat',
      isFlat: true,
      parentType,
      postfix: '',
      inList: false,
    };
  }

  public static createPropertyContext(
    baseContext: SchemaProcessingContext,
    schema: JsonSchemaStore,
    fieldName: string,
    parentType: string,
    postfix?: string,
  ): SchemaProcessingContext {
    return {
      ...baseContext,
      schema,
      fieldName,
      parentType,
      postfix: (baseContext.postfix || '') + (postfix || ''),
      inList: false,
    };
  }

  public static createArrayItemContext(
    baseContext: SchemaProcessingContext,
    schema: JsonSchemaStore,
    postfix: string,
  ): SchemaProcessingContext {
    return {
      ...baseContext,
      schema,
      postfix,
      inList: true,
    };
  }

  public static addDefaults(
    context: Partial<SchemaProcessingContext>,
  ): SchemaProcessingContext {
    return {
      ...context,
      postfix: context.postfix || '',
      inList: context.inList || false,
    } as SchemaProcessingContext;
  }
}
