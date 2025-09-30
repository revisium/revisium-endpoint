import { JsonSchemaStore } from '@revisium/schema-toolkit/model';
import { TypeModelField } from '../services/schema';

export function applySchemaDescriptions(
  schema: JsonSchemaStore,
  field: TypeModelField,
): void {
  if (schema.deprecated && schema.description) {
    field.deprecationReason = schema.description;
  } else if (schema.description) {
    field.description = schema.description;
  }
}
