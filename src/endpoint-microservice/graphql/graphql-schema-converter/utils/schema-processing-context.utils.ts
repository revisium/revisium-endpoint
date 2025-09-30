import { JsonSchemaStore } from '@revisium/schema-toolkit/model';
import { CreatingTableOptionsType } from '../types';
import { SchemaProcessingContext } from '../services/strategy/schema-processing-context.interface';

const DATA_KEY = 'data';

export function createNodeContext(
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

export function createFlatContext(
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

export function createPropertyContext(
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

export function createArrayItemContext(
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

export function addDefaults(
  context: SchemaProcessingContext,
): SchemaProcessingContext {
  return {
    ...context,
    postfix: context.postfix || '',
    inList: context.inList || false,
  };
}
