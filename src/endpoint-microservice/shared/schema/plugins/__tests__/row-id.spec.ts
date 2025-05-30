import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { rowIdSchema } from 'src/endpoint-microservice/shared/schema';

describe('row-id-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowIdSchema, '')).toBe(true);
    expect(ajv.validate(rowIdSchema, 1)).toBe(false);
  });
});
