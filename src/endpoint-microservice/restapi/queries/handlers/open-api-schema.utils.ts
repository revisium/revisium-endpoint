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
import { RestapiNamingService } from 'src/endpoint-microservice/restapi/services/restapi-naming.service';

export interface TablePathInfo {
  rawTableId: string;
  singularPath: string;
  pluralPath: string;
  schemaName: string;
  tag: string;
}

export const getFilterAndSortSchemas = (
  projectName: string,
  namingService: RestapiNamingService,
): Record<string, oas31.SchemaObject> => {
  const stringFilter = namingService.getCommonSchemaName(
    'StringFilter',
    projectName,
  );
  const boolFilter = namingService.getCommonSchemaName(
    'BoolFilter',
    projectName,
  );
  const dateTimeFilter = namingService.getCommonSchemaName(
    'DateTimeFilter',
    projectName,
  );
  const jsonFilter = namingService.getCommonSchemaName(
    'JsonFilter',
    projectName,
  );
  const rowWhereInput = namingService.getCommonSchemaName(
    'RowWhereInput',
    projectName,
  );
  const orderBy = namingService.getCommonSchemaName('OrderBy', projectName);

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
  };
};

export const getIdPathParam = (): oas31.ParameterObject => ({
  name: 'id',
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

export const getRowNodeSchema = (): oas31.SchemaObject => ({
  type: 'object',
  required: getSystemFieldsRequired(),
  properties: getSystemFieldsProperties(),
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
          node: getRowNodeSchema(),
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

export const getQueryBodySchema = (
  projectName: string,
  namingService: RestapiNamingService,
): oas31.SchemaObject => {
  const orderBy = namingService.getCommonSchemaName('OrderBy', projectName);
  const rowWhereInput = namingService.getCommonSchemaName(
    'RowWhereInput',
    projectName,
  );

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

export const createListPath = (
  info: TablePathInfo,
  rawTableId: string,
  projectName: string,
  namingService: RestapiNamingService,
): oas31.PathItemObject => ({
  post: {
    operationId: namingService.getOperationId('list', rawTableId),
    summary: `Query ${info.singularPath} list`,
    description: `Returns a paginated list of ${info.singularPath} rows with filtering and sorting`,
    security: [{ 'access-token': [] }],
    tags: [info.tag],
    requestBody: {
      required: true,
      description: 'Query parameters for filtering and pagination',
      content: {
        'application/json': {
          schema: getQueryBodySchema(projectName, namingService),
        },
      },
    },
    responses: {
      '200': createJsonResponse(
        'Paginated list of rows',
        getPaginatedResponseSchema(),
      ),
      '401': UNAUTHORIZED_RESPONSE,
    },
  },
});

export const createGetByIdPath = (
  info: TablePathInfo,
  rawTableId: string,
  namingService: RestapiNamingService,
): oas31.PathItemObject => ({
  get: {
    operationId: namingService.getOperationId('get', rawTableId),
    summary: `Get ${info.singularPath} by ID`,
    description: `Returns a single ${info.singularPath} row by its ID`,
    security: [{ 'access-token': [] }],
    tags: [info.tag],
    parameters: [getIdPathParam()],
    responses: {
      '200': createJsonResponse(
        'Successful response',
        getSingleRowResponseSchema(`#/components/schemas/${info.schemaName}`),
      ),
      '401': UNAUTHORIZED_RESPONSE,
      '404': NOT_FOUND_RESPONSE,
    },
  },
});

export const createCRUDPaths = (
  info: TablePathInfo,
  rawTableId: string,
  namingService: RestapiNamingService,
): Partial<oas31.PathItemObject> => {
  const schemaRef = `#/components/schemas/${info.schemaName}`;
  const rowResponseSchema = getSingleRowResponseSchema(schemaRef);
  const dataRequestBody: oas31.RequestBodyObject = {
    required: true,
    description: 'Row data',
    content: {
      'application/json': {
        schema: { $ref: schemaRef },
      },
    },
  };

  return {
    post: {
      operationId: namingService.getOperationId('create', rawTableId),
      summary: `Create ${info.singularPath}`,
      description: `Creates a new ${info.singularPath} row with the specified ID`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getIdPathParam()],
      requestBody: dataRequestBody,
      responses: {
        '200': createJsonResponse('Created row', rowResponseSchema),
        '401': UNAUTHORIZED_RESPONSE,
        '409': CONFLICT_RESPONSE,
      },
    },
    put: {
      operationId: namingService.getOperationId('update', rawTableId),
      summary: `Update ${info.singularPath}`,
      description: `Updates an existing ${info.singularPath} row`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getIdPathParam()],
      requestBody: dataRequestBody,
      responses: {
        '200': createJsonResponse('Updated row', rowResponseSchema),
        '401': UNAUTHORIZED_RESPONSE,
        '404': NOT_FOUND_RESPONSE,
      },
    },
    delete: {
      operationId: namingService.getOperationId('delete', rawTableId),
      summary: `Delete ${info.singularPath}`,
      description: `Deletes a ${info.singularPath} row by its ID`,
      security: [{ 'access-token': [] }],
      tags: [info.tag],
      parameters: [getIdPathParam()],
      responses: {
        '200': createJsonResponse('Deletion successful', { type: 'boolean' }),
        '401': UNAUTHORIZED_RESPONSE,
        '404': NOT_FOUND_RESPONSE,
      },
    },
  };
};

export const createForeignKeyPath = (
  info: TablePathInfo,
  fkInfo: TablePathInfo,
  rawTableId: string,
  fkRawTableId: string,
  namingService: RestapiNamingService,
): oas31.PathItemObject => ({
  get: {
    operationId: namingService.getForeignKeyOperationId(
      rawTableId,
      fkRawTableId,
    ),
    summary: `Get ${info.singularPath} foreign keys by ${fkInfo.pluralPath}`,
    description: `Returns rows from ${fkInfo.singularPath} that reference this ${info.singularPath}`,
    security: [{ 'access-token': [] }],
    tags: [info.tag],
    parameters: [getIdPathParam(), ...getPaginationParams()],
    responses: {
      '200': createJsonResponse(
        'Paginated list of related rows',
        getPaginatedResponseSchema(),
      ),
      '401': UNAUTHORIZED_RESPONSE,
      '404': NOT_FOUND_RESPONSE,
    },
  },
});
