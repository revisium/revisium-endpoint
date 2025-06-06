import { SystemSchemaIds } from 'src/endpoint-microservice/shared/schema-ids.consts';
import { createJsonSchemaStore } from 'src/endpoint-microservice/shared/schema/lib/createJsonSchemaStore';
import {
  fileSchema,
  rowCreatedAtSchema,
  rowCreatedIdSchema,
  rowHashSchema,
  rowPublishedAtSchema,
  rowSchemaHashSchema,
  rowUpdatedAtSchema,
  rowVersionIdSchema,
} from 'src/endpoint-microservice/shared/schema/plugins';
import { rowIdSchema } from 'src/endpoint-microservice/shared/schema/plugins/row-id.schema';
import { JsonSchema } from 'src/endpoint-microservice/shared/schema/types';

export const pluginRefs: Readonly<Record<string, JsonSchema>> = {
  [SystemSchemaIds.RowId]: rowIdSchema,
  [SystemSchemaIds.RowVersionId]: rowVersionIdSchema,
  [SystemSchemaIds.RowCreatedId]: rowCreatedIdSchema,
  [SystemSchemaIds.RowCreatedAt]: rowCreatedAtSchema,
  [SystemSchemaIds.RowPublishedAt]: rowPublishedAtSchema,
  [SystemSchemaIds.RowUpdatedAt]: rowUpdatedAtSchema,
  [SystemSchemaIds.RowHash]: rowHashSchema,
  [SystemSchemaIds.RowSchemaHash]: rowSchemaHashSchema,
  [SystemSchemaIds.File]: fileSchema,
};

export const resolveRefs = (schema: JsonSchema) => {
  const store = createJsonSchemaStore(schema, pluginRefs);
  return store.getPlainSchema({ skip$Ref: true });
};
