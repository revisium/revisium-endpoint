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

export interface TablePathInfo {
  rawTableId: string;
  schemaName: string;
  tag: string;
}

const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

const getSchemaName = (tableId: string, projectName: string): string => {
  const prefix = capitalize(projectName);
  const name = capitalize(tableId);
  return `${prefix}${name}`;
};

const getCommonSchemaName = (name: string, projectName: string): string => {
  const prefix = capitalize(projectName);
  return `${prefix}${name}`;
};

const getOperationId = (
  operation: 'get' | 'create' | 'update' | 'patch' | 'delete' | 'list',
  tableId: string,
): string => {
  const name = capitalize(tableId);
  switch (operation) {
    case 'get':
      return `get${name}`;
    case 'create':
      return `create${name}`;
    case 'update':
      return `update${name}`;
    case 'patch':
      return `patch${name}`;
    case 'delete':
      return `delete${name}`;
    case 'list':
      return `list${name}`;
  }
};

const getBulkOperationId = (
  operation: 'delete' | 'create' | 'patch',
  tableId: string,
): string => {
  const name = capitalize(tableId);
  switch (operation) {
    case 'delete':
      return `bulkDelete${name}`;
    case 'create':
      return `bulkCreate${name}`;
    case 'patch':
      return `bulkPatch${name}`;
  }
};

const getForeignKeyOperationId = (
  tableId: string,
  foreignKeyTableId: string,
): string => {
  const name = capitalize(tableId);
  const fkName = capitalize(foreignKeyTableId);
  return `get${name}ForeignKeysBy${fkName}`;
};

export const getFilterAndSortSchemas = (
  projectName: string,
): Record<string, oas31.SchemaObject> => {
  const stringFilter = getCommonSchemaName('StringFilter', projectName);
  const boolFilter = getCommonSchemaName('BoolFilter', projectName);
  const dateTimeFilter = getCommonSchemaName('DateTimeFilter', projectName);
  const jsonFilter = getCommonSchemaName('JsonFilter', projectName);
  const rowWhereInput = getCommonSchemaName('RowWhereInput', projectName);
  const orderBy = getCommonSchemaName('OrderBy', projectName);
  const patchOperation = getCommonSchemaName('PatchOperation', projectName);

  return {
    [stringFilter]: {
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
    [boolFilter]: {
      type: 'object',
      description: 'Boolean filter conditions',
      properties: {
        equals: { type: 'boolean' },
        not: { type: 'boolean' },
      },
    },
    [dateTimeFilter]: {
      type: 'object',
      description: 'DateTime filter conditions',
      properties: {
        equals: { type: 'string', format: 'date-time' },
        in: { type: 'array', items: { type: 'string', format: 'date-time' } },
        notIn: {
          type: 'array',
          items: { type: 'string', format: 'date-time' },
        },
        lt: { type: 'string', format: 'date-time' },
        lte: { type: 'string', format: 'date-time' },
        gt: { type: 'string', format: 'date-time' },
        gte: { type: 'string', format: 'date-time' },
      },
    },
    [jsonFilter]: {
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
    [rowWhereInput]: {
      type: 'object',
      description: 'Row filtering conditions',
      properties: {
        AND: {
          type: 'array',
          items: { $ref: `#/components/schemas/${rowWhereInput}` },
          description: 'AND conditions',
        },
        OR: {
          type: 'array',
          items: { $ref: `#/components/schemas/${rowWhereInput}` },
          description: 'OR conditions',
        },
        NOT: {
          type: 'array',
          items: { $ref: `#/components/schemas/${rowWhereInput}` },
          description: 'NOT conditions',
        },
        id: { $ref: `#/components/schemas/${stringFilter}` },
        versionId: { $ref: `#/components/schemas/${stringFilter}` },
        createdId: { $ref: `#/components/schemas/${stringFilter}` },
        readonly: { $ref: `#/components/schemas/${boolFilter}` },
        createdAt: { $ref: `#/components/schemas/${dateTimeFilter}` },
        updatedAt: { $ref: `#/components/schemas/${dateTimeFilter}` },
        publishedAt: { $ref: `#/components/schemas/${dateTimeFilter}` },
        data: { $ref: `#/components/schemas/${jsonFilter}` },
        meta: { $ref: `#/components/schemas/${jsonFilter}` },
        hash: { $ref: `#/components/schemas/${stringFilter}` },
        schemaHash: { $ref: `#/components/schemas/${stringFilter}` },
      },
    },
    [orderBy]: {
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
    [patchOperation]: {
      type: 'object',
      description: 'JSON Patch operation (RFC 6902 subset - only replace)',
      required: ['op', 'path', 'value'],
      properties: {
        op: {
          type: 'string',
          enum: ['replace'],
          description: 'Operation type (only "replace" is supported)',
        },
        path: {
          type: 'string',
          description:
            'JSON path using dot notation for objects and [index] for arrays (e.g., "name", "user.email", "items[0]")',
        },
        value: {
          description:
            'The value to set at the specified path (any valid JSON value)',
        },
      },
    },
  };
};

export const getRowIdPathParam = (): oas31.ParameterObject => ({
  name: 'rowId',
  in: 'path',
  required: true,
  description: 'Row ID',
  schema: { type: 'string' },
});

export const getPaginationParams = (): oas31.ParameterObject[] => [
  {
    name: 'first',
    in: 'query',
    required: true,
    description: 'Number of items to return',
    schema: { type: 'integer', minimum: 1, default: 100 },
  },
  {
    name: 'after',
    in: 'query',
    required: false,
    description: 'Cursor for pagination',
    schema: { type: 'string' },
  },
];

const UNAUTHORIZED_RESPONSE: oas31.ResponseObject = {
  description: 'Unauthorized - invalid or missing token',
};

const NOT_FOUND_RESPONSE: oas31.ResponseObject = {
  description: 'Not found',
};

const CONFLICT_RESPONSE: oas31.ResponseObject = {
  description: 'Conflict - row with this ID already exists',
};

const createJsonResponse = (
  description: string,
  schema: oas31.SchemaObject | oas31.ReferenceObject,
): oas31.ResponseObject => ({
  description,
  content: {
    'application/json': { schema },
  },
});

export const getSystemFieldsProperties = (): Record<
  string,
  oas31.SchemaObject
> => ({
  id: { type: 'string', description: 'Row ID' },
  versionId: { type: 'string', description: 'Current version ID' },
  createdId: { type: 'string', description: 'Original creation ID' },
  createdAt: {
    type: 'string',
    format: 'date-time',
    description: 'Creation timestamp',
  },
  updatedAt: {
    type: 'string',
    format: 'date-time',
    description: 'Last update timestamp',
  },
  publishedAt: {
    type: 'string',
    format: 'date-time',
    description: 'Publication timestamp',
  },
  readonly: { type: 'boolean', description: 'Whether the row is read-only' },
});

export const getSystemFieldsRequired = (): string[] => [
  'id',
  'versionId',
  'createdId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'readonly',
];

export const getRowNodeSchema = (
  dataSchemaRef: string,
): oas31.SchemaObject => ({
  type: 'object',
  required: [...getSystemFieldsRequired(), 'data'],
  properties: {
    ...getSystemFieldsProperties(),
    data: { $ref: dataSchemaRef },
  },
});

export const getSingleRowResponseSchema = (
  dataSchemaRef: string,
): oas31.SchemaObject => ({
  type: 'object',
  required: [...getSystemFieldsRequired(), 'data'],
  properties: {
    ...getSystemFieldsProperties(),
    data: { $ref: dataSchemaRef },
  },
});

export const getPaginatedResponseSchema = (
  dataSchemaRef: string,
): oas31.SchemaObject => ({
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
          node: getRowNodeSchema(dataSchemaRef),
        },
      },
    },
    pageInfo: {
      type: 'object',
      required: ['startCursor', 'endCursor', 'hasNextPage', 'hasPreviousPage'],
      properties: {
        startCursor: { type: ['string', 'null'] },
        endCursor: { type: ['string', 'null'] },
        hasNextPage: { type: 'boolean' },
        hasPreviousPage: { type: 'boolean' },
      },
    },
    totalCount: { type: 'number', minimum: 0 },
  },
});

export const getQueryBodySchema = (projectName: string): oas31.SchemaObject => {
  const orderBy = getCommonSchemaName('OrderBy', projectName);
  const rowWhereInput = getCommonSchemaName('RowWhereInput', projectName);

  return {
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
        items: { $ref: `#/components/schemas/${orderBy}` },
        description: 'Array of sorting criteria',
      },
      where: {
        $ref: `#/components/schemas/${rowWhereInput}`,
        description: 'Filter conditions',
      },
    },
  };
};

export const createTableRowsPath = (
  info: TablePathInfo,
  projectName: string,
  isDraft: boolean,
): oas31.PathItemObject => {
  const schemaRef = `#/components/schemas/${info.schemaName}`;

  const result: oas31.PathItemObject = {
    post: {
      operationId: getOperationId('list', info.rawTableId),
      summary: `Query ${info.rawTableId} rows`,
      description: `Returns a paginated list of ${info.rawTableId} rows with filtering and sorting`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      requestBody: {
        required: true,
        description: 'Query parameters for filtering and pagination',
        content: {
          'application/json': {
            schema: getQueryBodySchema(projectName),
          },
        },
      },
      responses: {
        '200': createJsonResponse(
          'Paginated list of rows',
          getPaginatedResponseSchema(schemaRef),
        ),
        '401': UNAUTHORIZED_RESPONSE,
      },
    },
  };

  if (isDraft) {
    result.delete = {
      operationId: getBulkOperationId('delete', info.rawTableId),
      summary: `Bulk delete ${info.rawTableId} rows`,
      description: `Deletes multiple ${info.rawTableId} rows by their IDs. Maximum 1000 rows per request.`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      requestBody: {
        required: true,
        description: 'Array of row IDs to delete',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['rowIds'],
              properties: {
                rowIds: {
                  type: 'array',
                  items: { type: 'string' },
                  maxItems: 1000,
                  description: 'Array of row IDs to delete (max 1000)',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': createJsonResponse('Deletion successful', { type: 'boolean' }),
        '401': UNAUTHORIZED_RESPONSE,
      },
    };
  }

  return result;
};

export const createSingleRowPath = (
  info: TablePathInfo,
  projectName: string,
  isDraft: boolean,
): oas31.PathItemObject => {
  const schemaRef = `#/components/schemas/${info.schemaName}`;
  const rowResponseSchema = getSingleRowResponseSchema(schemaRef);
  const patchOperationRef = `#/components/schemas/${getCommonSchemaName('PatchOperation', projectName)}`;

  const result: oas31.PathItemObject = {
    get: {
      operationId: getOperationId('get', info.rawTableId),
      summary: `Get ${info.rawTableId} by ID`,
      description: `Returns a single ${info.rawTableId} row by its ID`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getRowIdPathParam()],
      responses: {
        '200': createJsonResponse('Successful response', rowResponseSchema),
        '401': UNAUTHORIZED_RESPONSE,
        '404': NOT_FOUND_RESPONSE,
      },
    },
  };

  if (isDraft) {
    const dataRequestBody: oas31.RequestBodyObject = {
      required: true,
      description: 'Row data',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['data'],
            properties: {
              data: { $ref: schemaRef },
            },
          },
        },
      },
    };

    result.post = {
      operationId: getOperationId('create', info.rawTableId),
      summary: `Create ${info.rawTableId}`,
      description: `Creates a new ${info.rawTableId} row with the specified ID`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getRowIdPathParam()],
      requestBody: dataRequestBody,
      responses: {
        '200': createJsonResponse('Created row', rowResponseSchema),
        '401': UNAUTHORIZED_RESPONSE,
        '409': CONFLICT_RESPONSE,
      },
    };

    result.put = {
      operationId: getOperationId('update', info.rawTableId),
      summary: `Update ${info.rawTableId}`,
      description: `Updates an existing ${info.rawTableId} row (full replacement)`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getRowIdPathParam()],
      requestBody: dataRequestBody,
      responses: {
        '200': createJsonResponse('Updated row', rowResponseSchema),
        '401': UNAUTHORIZED_RESPONSE,
        '404': NOT_FOUND_RESPONSE,
      },
    };

    result.patch = {
      operationId: getOperationId('patch', info.rawTableId),
      summary: `Patch ${info.rawTableId}`,
      description: `Partially updates a ${info.rawTableId} row using JSON Patch operations`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getRowIdPathParam()],
      requestBody: {
        required: true,
        description: 'JSON Patch operations',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['patches'],
              properties: {
                patches: {
                  type: 'array',
                  items: { $ref: patchOperationRef },
                  description: 'Array of patch operations to apply',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': createJsonResponse('Patched row', rowResponseSchema),
        '401': UNAUTHORIZED_RESPONSE,
        '404': NOT_FOUND_RESPONSE,
      },
    };

    result.delete = {
      operationId: getOperationId('delete', info.rawTableId),
      summary: `Delete ${info.rawTableId}`,
      description: `Deletes a ${info.rawTableId} row by its ID`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getRowIdPathParam()],
      responses: {
        '200': createJsonResponse('Deletion successful', { type: 'boolean' }),
        '401': UNAUTHORIZED_RESPONSE,
        '404': NOT_FOUND_RESPONSE,
      },
    };
  }

  return result;
};

export const createForeignKeyPath = (
  info: TablePathInfo,
  fkInfo: TablePathInfo,
): oas31.PathItemObject => {
  const fkSchemaRef = `#/components/schemas/${fkInfo.schemaName}`;

  return {
    get: {
      operationId: getForeignKeyOperationId(info.rawTableId, fkInfo.rawTableId),
      summary: `Get ${info.rawTableId} foreign keys by ${fkInfo.rawTableId}`,
      description: `Returns rows from ${fkInfo.rawTableId} that reference this ${info.rawTableId}`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getRowIdPathParam(), ...getPaginationParams()],
      responses: {
        '200': createJsonResponse(
          'Paginated list of related rows',
          getPaginatedResponseSchema(fkSchemaRef),
        ),
        '401': UNAUTHORIZED_RESPONSE,
        '404': NOT_FOUND_RESPONSE,
      },
    },
  };
};

export const createFileUploadPath = (
  info: TablePathInfo,
): oas31.PathItemObject => ({
  post: {
    operationId: `upload${capitalize(info.rawTableId)}File`,
    summary: `Upload file for ${info.rawTableId}`,
    description: `Uploads a file to a specific field in the ${info.rawTableId} row`,
    security: [{ 'access-token': [] }],
    tags: [info.tag],
    parameters: [
      getRowIdPathParam(),
      {
        name: 'fileId',
        in: 'path',
        required: true,
        description: 'File field ID',
        schema: { type: 'string' },
      },
    ],
    requestBody: {
      required: true,
      description: 'File to upload',
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                description: 'The file to upload',
              },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'File uploaded successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                fileId: { type: 'string' },
                url: { type: 'string' },
                fileName: { type: 'string' },
                mimeType: { type: 'string' },
                size: { type: 'number' },
              },
            },
          },
        },
      },
      '401': UNAUTHORIZED_RESPONSE,
      '404': NOT_FOUND_RESPONSE,
    },
  },
});

export const createTableInfoMap = (
  tableIds: string[],
  projectName: string,
): Map<string, TablePathInfo> => {
  const map = new Map<string, TablePathInfo>();

  for (const rawTableId of tableIds) {
    map.set(rawTableId, {
      rawTableId,
      schemaName: getSchemaName(rawTableId, projectName),
      tag: rawTableId,
    });
  }

  return map;
};
