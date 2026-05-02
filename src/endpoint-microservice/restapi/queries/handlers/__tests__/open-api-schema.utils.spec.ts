import { oas31 } from 'openapi3-ts';
import { stripReadOnly } from '../open-api-schema.utils';

describe('stripReadOnly', () => {
  it('removes readOnly from a top-level property', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      properties: {
        id: { type: 'string', readOnly: true },
        name: { type: 'string' },
      },
    };

    const result = stripReadOnly(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    });
  });

  it('removes readOnly recursively in nested object properties', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      properties: {
        file: {
          type: 'object',
          properties: {
            status: { type: 'string', default: '', readOnly: true },
            fileId: { type: 'string', default: '', readOnly: true },
            fileName: { type: 'string', default: '' },
          },
        },
      },
    };

    const result = stripReadOnly(schema);

    expect(result.properties?.file).toEqual({
      type: 'object',
      properties: {
        status: { type: 'string', default: '' },
        fileId: { type: 'string', default: '' },
        fileName: { type: 'string', default: '' },
      },
    });
  });

  it('removes readOnly inside array items', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fileId: { type: 'string', readOnly: true },
              fileName: { type: 'string' },
            },
          },
        },
      },
    };

    const result = stripReadOnly(schema);

    expect((result.properties?.files as oas31.SchemaObject)?.items).toEqual({
      type: 'object',
      properties: {
        fileId: { type: 'string' },
        fileName: { type: 'string' },
      },
    });
  });

  it('preserves default, type, description, required, additionalProperties', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'id'],
      properties: {
        id: {
          type: 'string',
          default: '',
          description: 'Identifier',
          readOnly: true,
        },
        name: { type: 'string', default: '', description: 'Display name' },
      },
    };

    const result = stripReadOnly(schema);

    expect(result).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['name', 'id'],
      properties: {
        id: { type: 'string', default: '', description: 'Identifier' },
        name: { type: 'string', default: '', description: 'Display name' },
      },
    });
  });

  it('does not mutate the input schema', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      properties: {
        id: { type: 'string', readOnly: true },
      },
    };
    const snapshot = JSON.stringify(schema);

    stripReadOnly(schema);

    expect(JSON.stringify(schema)).toBe(snapshot);
  });

  it('handles full File schema (regression test for issue #20)', () => {
    const schema: oas31.SchemaObject = {
      type: 'object',
      additionalProperties: false,
      required: [
        'extension',
        'fileId',
        'fileName',
        'hash',
        'height',
        'mimeType',
        'size',
        'status',
        'url',
        'width',
      ],
      properties: {
        status: { type: 'string', default: '', readOnly: true },
        fileId: { type: 'string', default: '', readOnly: true },
        url: { type: 'string', default: '', readOnly: true },
        fileName: { type: 'string', default: '' },
        hash: { type: 'string', default: '', readOnly: true },
        extension: { type: 'string', default: '', readOnly: true },
        mimeType: { type: 'string', default: '', readOnly: true },
        size: { type: 'number', default: 0, readOnly: true },
        width: { type: 'number', default: 0, readOnly: true },
        height: { type: 'number', default: 0, readOnly: true },
      },
    };

    const result = stripReadOnly(schema);

    const props = result.properties ?? {};
    for (const key of Object.keys(props)) {
      expect((props[key] as oas31.SchemaObject).readOnly).toBeUndefined();
    }
    expect(Object.keys(props).sort()).toEqual([
      'extension',
      'fileId',
      'fileName',
      'hash',
      'height',
      'mimeType',
      'size',
      'status',
      'url',
      'width',
    ]);
  });
});
