import { ConverterTable } from 'src/endpoint-microservice/shared/converter';
import { JsonSchemaStore } from '@revisium/schema-toolkit/model';

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
  legacyFieldName?: { singular: string; plural: string };
  legacyInputNames?: { plural: string };
  options: CreatingTableOptionsType;
}
