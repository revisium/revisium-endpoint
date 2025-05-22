import { SystemSchemaIds } from 'src/endpoint-microservice/shared/schema-ids.consts';
import { createJsonSchemaStore } from 'src/endpoint-microservice/shared/schema/lib/createJsonSchemaStore';
import { fileSchema } from 'src/endpoint-microservice/shared/schema/plugins';
import { rowIdSchema } from 'src/endpoint-microservice/shared/schema/plugins/row-id.schema';
import { JsonSchema } from 'src/endpoint-microservice/shared/schema/types';

export const pluginRefs: Readonly<Record<string, JsonSchema>> = {
  [SystemSchemaIds.RowId]: rowIdSchema,
  [SystemSchemaIds.File]: fileSchema,
};

export const resolveRefs = (schema: JsonSchema) => {
  const store = createJsonSchemaStore(schema, pluginRefs);
  return store.getPlainSchema({ skip$Ref: true });
};
