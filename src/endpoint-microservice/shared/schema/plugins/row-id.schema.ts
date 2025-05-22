import { Schema } from 'ajv/dist/2020';
import { SystemSchemaIds } from 'src/endpoint-microservice/shared/schema-ids.consts';
import { JsonStringSchema } from 'src/endpoint-microservice/shared/schema';

import { JsonSchemaTypeName } from 'src/endpoint-microservice/shared/schema/types/schema.types';

export const rowIdSchema: JsonStringSchema = {
  type: JsonSchemaTypeName.String,
  default: '',
  readOnly: true,
};

export const ajvRowIdSchema: Schema = {
  $id: SystemSchemaIds.RowId,
  ...rowIdSchema,
};
