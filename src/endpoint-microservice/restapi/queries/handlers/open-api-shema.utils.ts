import { oas31 } from 'openapi3-ts';

export const getIdPathParam = (): oas31.ParameterObject => ({
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
});

export const getPaginationParams = (): oas31.ParameterObject[] => [
  {
    name: 'first',
    in: 'query',
    required: true,
    schema: { type: 'integer', minimum: 1, default: 100 },
  },
  {
    name: 'after',
    in: 'query',
    required: false,
    schema: { type: 'string' },
  },
];

export const getPaginatedResponseSchema = (): oas31.SchemaObject => ({
  type: 'object',
  required: ['edges', 'pageInfo', 'totalCount'],
  properties: {
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['cursor', 'node'],
        properties: {
          cursor: { type: 'string' },
          node: {
            type: 'object',
            required: ['id', 'versionId', 'createdAt', 'readonly'],
            properties: {
              id: { type: 'string' },
              versionId: { type: 'string' },
              createdAt: { type: 'string' },
              readonly: { type: 'boolean' },
            },
          },
        },
      },
    },
    pageInfo: {
      type: 'object',
      required: ['startCursor', 'endCursor', 'hasNextPage', 'hasPreviousPage'],
      properties: {
        startCursor: { type: 'string' },
        endCursor: { type: 'string' },
        hasNextPage: { type: 'boolean' },
        hasPreviousPage: { type: 'boolean' },
      },
    },
    totalCount: { type: 'number', minimum: 0 },
  },
});

export const createGetListPath = (schemaId: string): oas31.PathItemObject => ({
  get: {
    security: [{ 'access-token': [] }],
    tags: [schemaId],
    parameters: getPaginationParams(),
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: getPaginatedResponseSchema(),
          },
        },
      },
    },
  },
});

export const createGetByIdPath = (schemaId: string): oas31.PathItemObject => ({
  get: {
    security: [{ 'access-token': [] }],
    tags: [schemaId],
    parameters: [getIdPathParam()],
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${schemaId}` },
          },
        },
      },
    },
  },
});

export const createCRUDPaths = (
  schemaId: string,
): Partial<oas31.PathItemObject> => {
  const common = {
    security: [{ 'access-token': [] }],
    tags: [schemaId],
    parameters: [getIdPathParam()],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${schemaId}` },
        },
      },
    },
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${schemaId}` },
          },
        },
      },
    },
  };

  return {
    post: common,
    put: common,
    delete: {
      security: [{ 'access-token': [] }],
      tags: [schemaId],
      parameters: [getIdPathParam()],
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: { type: 'boolean' },
            },
          },
        },
      },
    },
  };
};
