import { JsonSchema } from 'src/endpoint-microservice/shared/schema/types';

export const addSharedFieldsFromState = <T extends JsonSchema = JsonSchema>(
  schema: T,
  state: { title?: string; description?: string; deprecated?: boolean },
): T => {
  if (state.title) {
    schema.title = state.title;
  }

  if (state.description) {
    schema.description = state.description;
  }

  if (state.deprecated) {
    schema.deprecated = state.deprecated;
  }

  return schema;
};
