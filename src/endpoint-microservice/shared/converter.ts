import { JsonSchema } from 'src/endpoint-microservice/shared/types/schema.types';

export type ConverterTable = {
  id: string;
  versionId: string;
  schema: JsonSchema;
};

export interface Converter<Target> {
  convert(tables: ConverterTable[]): Promise<Target>;
}
