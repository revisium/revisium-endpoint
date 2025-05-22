import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { rowCreatedAtSchema } from 'src/endpoint-microservice/shared/schema';

describe('row-created-at-schema', () => {
  const ajv = new Ajv();
  addFormats(ajv);

  it('base tests', () => {
    expect(ajv.validate(rowCreatedAtSchema, '')).toBe(true);
    expect(ajv.validate(rowCreatedAtSchema, 1)).toBe(false);
  });
});
