import { oas31 } from 'openapi3-ts';
import {
  JsonFilterDtoModeEnum,
  JsonFilterDtoSearchInEnum,
  JsonFilterDtoSearchLanguageEnum,
  JsonFilterDtoSearchTypeEnum,
  OrderByDtoAggregationEnum,
  OrderByDtoDirectionEnum,
  OrderByDtoFieldEnum,
  OrderByDtoTypeEnum,
  StringFilterDtoModeEnum,
} from 'src/endpoint-microservice/core-api/generated/api';

export const getFilterAndSortSchemas = (): Record<
  string,
  oas31.SchemaObject
> => ({
  StringFilter: {
    type: 'object',
    description: 'String filter conditions',
    properties: {
      equals: { type: 'string' },
      in: { type: 'array', items: { type: 'string' } },
      notIn: { type: 'array', items: { type: 'string' } },
      lt: { type: 'string' },
      lte: { type: 'string' },
      gt: { type: 'string' },
      gte: { type: 'string' },
      contains: { type: 'string' },
      startsWith: { type: 'string' },
      endsWith: { type: 'string' },
      mode: { type: 'string', enum: Object.values(StringFilterDtoModeEnum) },
      not: { type: 'string' },
    },
  },
  BoolFilter: {
    type: 'object',
    description: 'Boolean filter conditions',
    properties: {
      equals: { type: 'boolean' },
      not: { type: 'boolean' },
    },
  },
  DateTimeFilter: {
    type: 'object',
    description: 'DateTime filter conditions',
    properties: {
      equals: { type: 'string', format: 'date-time' },
      in: { type: 'array', items: { type: 'string', format: 'date-time' } },
      notIn: { type: 'array', items: { type: 'string', format: 'date-time' } },
      lt: { type: 'string', format: 'date-time' },
      lte: { type: 'string', format: 'date-time' },
      gt: { type: 'string', format: 'date-time' },
      gte: { type: 'string', format: 'date-time' },
    },
  },
  JsonFilter: {
    type: 'object',
    description: 'JSON filter conditions for data field',
    properties: {
      equals: { type: 'object' },
      path: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
        description: 'Path in JSON (e.g., "user.name" or ["user", "name"])',
      },
      mode: { type: 'string', enum: Object.values(JsonFilterDtoModeEnum) },
      string_contains: { type: 'string' },
      string_starts_with: { type: 'string' },
      string_ends_with: { type: 'string' },
      array_contains: { type: 'array', items: { type: 'object' } },
      array_starts_with: { type: 'object' },
      array_ends_with: { type: 'object' },
      lt: { type: 'number' },
      lte: { type: 'number' },
      gt: { type: 'number' },
      gte: { type: 'number' },
      search: { type: 'string', description: 'Full-text search string' },
      searchLanguage: {
        type: 'string',
        enum: Object.values(JsonFilterDtoSearchLanguageEnum),
        description: 'Language for full-text search',
      },
      searchType: {
        type: 'string',
        enum: Object.values(JsonFilterDtoSearchTypeEnum),
      },
      searchIn: {
        type: 'string',
        enum: Object.values(JsonFilterDtoSearchInEnum),
      },
    },
  },
  RowWhereInput: {
    type: 'object',
    description: 'Row filtering conditions',
    properties: {
      AND: {
        type: 'array',
        items: { $ref: '#/components/schemas/RowWhereInput' },
        description: 'AND conditions',
      },
      OR: {
        type: 'array',
        items: { $ref: '#/components/schemas/RowWhereInput' },
        description: 'OR conditions',
      },
      NOT: {
        type: 'array',
        items: { $ref: '#/components/schemas/RowWhereInput' },
        description: 'NOT conditions',
      },
      id: { $ref: '#/components/schemas/StringFilter' },
      versionId: { $ref: '#/components/schemas/StringFilter' },
      createdId: { $ref: '#/components/schemas/StringFilter' },
      readonly: { $ref: '#/components/schemas/BoolFilter' },
      createdAt: { $ref: '#/components/schemas/DateTimeFilter' },
      updatedAt: { $ref: '#/components/schemas/DateTimeFilter' },
      publishedAt: { $ref: '#/components/schemas/DateTimeFilter' },
      data: { $ref: '#/components/schemas/JsonFilter' },
      meta: { $ref: '#/components/schemas/JsonFilter' },
      hash: { $ref: '#/components/schemas/StringFilter' },
      schemaHash: { $ref: '#/components/schemas/StringFilter' },
    },
  },
  OrderBy: {
    type: 'object',
    description: 'Sorting criteria',
    required: ['field', 'direction'],
    properties: {
      field: {
        type: 'string',
        enum: Object.values(OrderByDtoFieldEnum),
        description: 'Field to sort by',
      },
      direction: {
        type: 'string',
        enum: Object.values(OrderByDtoDirectionEnum),
        description: 'Sort direction',
      },
      path: {
        type: 'string',
        description:
          'Path within data field for nested sorting (e.g., "user.age")',
      },
      type: {
        type: 'string',
        enum: Object.values(OrderByDtoTypeEnum),
        description: 'Data type for sorting when using data field',
      },
      aggregation: {
        type: 'string',
        enum: Object.values(OrderByDtoAggregationEnum),
        description: 'Aggregation function for array fields',
      },
    },
  },
});

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

export const getQueryBodySchema = (): oas31.SchemaObject => ({
  type: 'object',
  required: ['first'],
  properties: {
    first: {
      type: 'integer',
      minimum: 1,
      default: 100,
      description: 'Number of items to return',
    },
    after: {
      type: 'string',
      description: 'Cursor for pagination',
    },
    orderBy: {
      type: 'array',
      items: { $ref: '#/components/schemas/OrderBy' },
      description: 'Array of sorting criteria',
    },
    where: {
      $ref: '#/components/schemas/RowWhereInput',
      description: 'Filter conditions',
    },
  },
});

export const createGetListPath = (schemaId: string): oas31.PathItemObject => ({
  post: {
    summary: `Query ${schemaId} list with filtering and sorting`,
    security: [{ 'access-token': [] }],
    tags: [schemaId],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: getQueryBodySchema(),
        },
      },
    },
    responses: {
      '200': {
        description: 'Paginated list of rows',
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
