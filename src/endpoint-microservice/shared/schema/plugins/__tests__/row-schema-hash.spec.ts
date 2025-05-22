import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { rowSchemaHashSchema } from 'src/endpoint-microservice/shared/schema';

describe('row-schema-hash-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowSchemaHashSchema, '')).toBe(true);
    expect(ajv.validate(rowSchemaHashSchema, 1)).toBe(false);
  });
});
