import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';
import { ConverterTable } from 'src/endpoint-microservice/shared/converter';

export interface SchemaProcessingContext {
  schema: JsonSchemaStore;
  table: ConverterTable;
  safetyTableId: string;
  fieldName: string;
  isFlat: boolean;
  parentType: string;
  inList?: boolean;
  postfix?: string;
  resolverFieldName?: string;
}
