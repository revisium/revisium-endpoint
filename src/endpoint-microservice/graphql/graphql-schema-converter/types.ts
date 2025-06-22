import { ConverterTable } from 'src/endpoint-microservice/shared/converter';

export type ContextType = { headers: Record<string, string> };

export type CreatingTableOptionsType = {
  table: ConverterTable;
  safetyTableId: string;
  pluralSafetyTableId: string;
};

export interface ValidTableType {
  fieldName: { singular: string; plural: string };
  typeNames: { singular: string; plural: string };
  options: CreatingTableOptionsType;
}
