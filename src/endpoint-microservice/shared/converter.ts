import { JsonSchema } from '@revisium/schema-toolkit/types';

export type Options = {
  hideNodeTypes?: boolean;
  hideFlatTypes?: boolean;
  flatPostfix?: string;
  nodePostfix?: string;
  prefixForTables?: string;
  prefixForCommon?: string;
};

export type ConverterTable = {
  id: string;
  versionId: string;
  schema: JsonSchema;
};

export type ConverterContextType = {
  tables: ConverterTable[];
  projectId: string;
  projectName: string;
  endpointId: string;
  revisionId: string;
  isDraft: boolean;
  options?: Options;
};

export interface Converter<Target> {
  convert(context: ConverterContextType): Promise<Target>;
}
