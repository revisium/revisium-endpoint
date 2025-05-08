import { JsonSchema } from 'src/endpoint-microservice/shared/types/schema.types';

export type ConverterTable = {
  id: string;
  versionId: string;
  schema: JsonSchema;
};

export type ConverterContextType = {
  tables: ConverterTable[];
  revisionId: string;
};

export interface Converter<Target> {
  convert(context: ConverterContextType): Promise<Target>;
}
