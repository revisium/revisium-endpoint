import { JsonSchema } from 'src/endpoint-microservice/shared/schema';

export type Options = {
  hideNodeTypes?: boolean;
  hideFlatTypes?: boolean;
  flatPostfix?: string;
  nodePostfix?: string;
  hideProjectPrefixForTypes?: string;
  hideProjectPrefixForEnums?: string;
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
};

export interface Converter<Target> {
  convert(context: ConverterContextType): Promise<Target>;
}
