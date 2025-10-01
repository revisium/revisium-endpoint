import {
  JsonSchemaStore,
  JsonStringStore,
} from '@revisium/schema-toolkit/model';

export const isStringForeignStore = (
  store: JsonSchemaStore,
): store is JsonStringStore & { foreignKey: string } => {
  return Boolean(store instanceof JsonStringStore && store.foreignKey);
};
