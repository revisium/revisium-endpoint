import {
  JsonSchemaStore,
  JsonStringStore,
} from 'src/endpoint-microservice/shared/schema';

export const isStringForeignStore = (
  store: JsonSchemaStore,
): store is JsonStringStore & { foreignKey: string } => {
  return Boolean(store instanceof JsonStringStore && store.foreignKey);
};
