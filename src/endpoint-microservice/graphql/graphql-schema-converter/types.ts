import { ConverterTable } from 'src/endpoint-microservice/shared/converter';
import { JsonSchemaStore } from 'src/endpoint-microservice/shared/schema';

export type ContextType = { headers: Record<string, string> };

export type CreatingTableOptionsType = {
  table: ConverterTable & {
    store: JsonSchemaStore;
  };
  safetyTableId: string;
  pluralSafetyTableId: string;
};

export interface ValidTableType {
  fieldName: { singular: string; plural: string };
  typeNames: { singular: string; plural: string };
  options: CreatingTableOptionsType;
}
