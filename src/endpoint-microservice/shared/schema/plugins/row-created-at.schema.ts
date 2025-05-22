import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from 'src/endpoint-microservice/shared/schema-ids.consts';
import { JsonStringSchema } from 'src/endpoint-microservice/shared/schema';

import { JsonSchemaTypeName } from 'src/endpoint-microservice/shared/schema/types/schema.types';

export const rowCreatedAtSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowCreatedAtSchema: Schema = {
  $id: SystemSchemaIds.RowCreatedAt,
  ...rowCreatedAtSchema,
};
