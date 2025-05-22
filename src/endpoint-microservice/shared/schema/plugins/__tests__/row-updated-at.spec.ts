import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { rowUpdatedAtSchema } from 'src/endpoint-microservice/shared/schema';

describe('row-updated-at-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowUpdatedAtSchema, '')).toBe(true);
    expect(ajv.validate(rowUpdatedAtSchema, 1)).toBe(false);
  });
});
