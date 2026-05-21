import { oas31 } from 'openapi3-ts';
import { toWriteSchema } from '../open-api-schema.utils';

describe('toWriteSchema', () => {
  it('omits readOnly properties and removes them from required', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string', readOnly: true },
        name: { type: 'string', default: '' },
      },
    };

    expect(toWriteSchema(schema)).toEqual({
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', default: '' },
      },
    });
  });

  it('recurses into nested object properties', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      required: ['profile'],
      properties: {
        profile: {
          type: 'object',
          required: ['fileId', 'fileName'],
          properties: {
            fileId: { type: 'string', default: '', readOnly: true },
            fileName: { type: 'string', default: '' },
          },
        },
      },
    };

    expect(toWriteSchema(schema)).toEqual({
      type: 'object',
      required: ['profile'],
      properties: {
        profile: {
          type: 'object',
          required: ['fileName'],
          properties: {
            fileName: { type: 'string', default: '' },
          },
        },
      },
    });
  });

  it('recurses into array items', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            required: ['status', 'fileName'],
            properties: {
              status: { type: 'string', default: '', readOnly: true },
              fileName: { type: 'string', default: '' },
            },
          },
        },
      },
    };

    expect(toWriteSchema(schema)).toEqual({
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            required: ['fileName'],
            properties: {
              fileName: { type: 'string', default: '' },
            },
          },
        },
      },
    });
  });

  it('recurses into additionalProperties schemas', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string', readOnly: true },
          label: { type: 'string' },
        },
      },
    };

    expect(toWriteSchema(schema)).toEqual({
      type: 'object',
      additionalProperties: {
        type: 'object',
        required: ['label'],
        properties: {
          label: { type: 'string' },
        },
      },
    });
  });

  it('recurses into oneOf, anyOf, and allOf schemas', () => {
    const schema: oas31.SchemaObject = {
      oneOf: [
        {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', readOnly: true },
            name: { type: 'string' },
          },
        },
      ],
      anyOf: [
        {
          type: 'object',
          required: ['status', 'fileName'],
          properties: {
            status: { type: 'string', readOnly: true },
            fileName: { type: 'string' },
          },
        },
      ],
      allOf: [
        {
          type: 'object',
          required: ['hash', 'title'],
          properties: {
            hash: { type: 'string', readOnly: true },
            title: { type: 'string' },
          },
        },
      ],
    };

    expect(toWriteSchema(schema)).toEqual({
      oneOf: [
        {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
          },
        },
      ],
      anyOf: [
        {
          type: 'object',
          required: ['fileName'],
          properties: {
            fileName: { type: 'string' },
          },
        },
      ],
      allOf: [
        {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
          },
        },
      ],
    });
  });

  it('does not mutate the original schema', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string', readOnly: true },
        name: { type: 'string' },
      },
    };
    const original = JSON.stringify(schema);

    toWriteSchema(schema);

    expect(JSON.stringify(schema)).toBe(original);
  });
});
