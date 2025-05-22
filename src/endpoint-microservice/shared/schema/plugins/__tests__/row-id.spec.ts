import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { rowHashSchema } from 'src/endpoint-microservice/shared/schema';

describe('row-id-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowHashSchema, '')).toBe(true);
    expect(ajv.validate(rowHashSchema, 1)).toBe(false);
  });
});
