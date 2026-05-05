import { INestApplication } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { oas31 } from 'openapi3-ts';
import {
  getObjectSchema,
  getRefSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';

const REVISION_ID = 'rev-1';
const PROJECT_NAME = 'TestProject';
const TABLE_ID = 'document';
const SCHEMA_NAME = 'TestProjectDocument';
const INPUT_SCHEMA_NAME = `${SCHEMA_NAME}Input`;

const FILE_FIELDS = [
  'status',
  'fileId',
  'url',
  'fileName',
  'hash',
  'extension',
  'mimeType',
  'size',
  'width',
  'height',
];

const createSchemaTableData = () => ({
  data: {
    edges: [
      {
        node: {
          id: TABLE_ID,
          data: getObjectSchema({
            title: getStringSchema(),
            file: getRefSchema(SystemSchemaIds.File),
          }),
        },
      },
    ],
    totalCount: 1,
  },
  error: null,
});

const createMockInternalCoreApiService = () => ({
  initApi: jest.fn().mockResolvedValue(undefined),
  api: {
    login: jest.fn().mockResolvedValue({
      data: { accessToken: 'mock-token' },
      error: null,
    }),
    rows: jest
      .fn()
      .mockImplementation((_revisionId: string, tableId: string) => {
        if (tableId === SystemTables.Schema) {
          return Promise.resolve(createSchemaTableData());
        }
        return Promise.resolve({
          data: { edges: [], totalCount: 0 },
          error: null,
        });
      }),
    revision: jest.fn().mockResolvedValue({
      data: { isDraft: true },
      error: null,
    }),
    tableForeignKeysBy: jest.fn().mockResolvedValue({
      data: { edges: [] },
      error: null,
    }),
    endpoints: jest.fn().mockResolvedValue({
      data: { edges: [], totalCount: 0 },
      error: null,
    }),
  },
});

const createMockProxyCoreApiService = () => ({ api: {} });

const createMockPrismaService = () => ({
  endpoint: { findMany: jest.fn().mockResolvedValue([]) },
});

const collectReadOnlyPaths = (
  node: unknown,
  trail: string[] = [],
  hits: string[] = [],
): string[] => {
  if (!node || typeof node !== 'object') return hits;
  const obj = node as Record<string, unknown>;
  if (obj.readOnly === true) hits.push(trail.join('.') || '<root>');
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'readOnly') continue;
    collectReadOnlyPaths(value, [...trail, key], hits);
  }
  return hits;
};

describe('OpenAPI: write request bodies must not contain readOnly fields (issue #20)', () => {
  let app: INestApplication;
  let queryBus: QueryBus;
  let openApiJson: OpenApiSchema;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EndpointMicroserviceModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(InternalCoreApiService)
      .useValue(createMockInternalCoreApiService())
      .overrideProvider(ProxyCoreApiService)
      .useValue(createMockProxyCoreApiService())
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    queryBus = app.get(QueryBus);
    openApiJson = await queryBus.execute<GetOpenApiSchemaQuery, OpenApiSchema>(
      new GetOpenApiSchemaQuery({
        revisionId: REVISION_ID,
        projectName: PROJECT_NAME,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  }, 10000);

  it('exposes both output and input schemas in components.schemas', () => {
    const schemas = openApiJson.components?.schemas ?? {};
    expect(schemas).toHaveProperty(SCHEMA_NAME);
    expect(schemas).toHaveProperty(INPUT_SCHEMA_NAME);
  });

  it('input schema preserves all File subfields (no fields are dropped)', () => {
    const inputSchema = openApiJson.components?.schemas?.[
      INPUT_SCHEMA_NAME
    ] as oas31.SchemaObject;
    const file = inputSchema?.properties?.file as oas31.SchemaObject;
    expect(file?.type).toBe('object');
    expect(Object.keys(file.properties ?? {}).sort()).toEqual(
      [...FILE_FIELDS].sort(),
    );
  });

  it('input schema does not contain readOnly anywhere', () => {
    const inputSchema = openApiJson.components?.schemas?.[INPUT_SCHEMA_NAME];
    const readOnlyHits = collectReadOnlyPaths(inputSchema);
    expect(readOnlyHits).toEqual([]);
  });

  it('output schema retains readOnly markers (response semantics preserved)', () => {
    const outputSchema = openApiJson.components?.schemas?.[
      SCHEMA_NAME
    ] as oas31.SchemaObject;
    const file = outputSchema?.properties?.file as oas31.SchemaObject;
    const readOnlyChildren = Object.entries(file?.properties ?? {})
      .filter(([, value]) => (value as oas31.SchemaObject).readOnly === true)
      .map(([key]) => key)
      .sort();
    expect(readOnlyChildren).toEqual(
      [
        'status',
        'fileId',
        'url',
        'hash',
        'extension',
        'mimeType',
        'size',
        'width',
        'height',
      ].sort(),
    );
  });

  it('createRow request body references the input schema', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/row/{rowId}`];
    const body = path?.post?.requestBody as oas31.RequestBodyObject;
    const schema = body?.content?.['application/json']
      ?.schema as oas31.SchemaObject;
    const dataRef = (schema?.properties?.data as oas31.ReferenceObject)?.$ref;
    expect(dataRef).toBe(`#/components/schemas/${INPUT_SCHEMA_NAME}`);
  });

  it('updateRow (PUT) request body references the input schema', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/row/{rowId}`];
    const body = path?.put?.requestBody as oas31.RequestBodyObject;
    const schema = body?.content?.['application/json']
      ?.schema as oas31.SchemaObject;
    const dataRef = (schema?.properties?.data as oas31.ReferenceObject)?.$ref;
    expect(dataRef).toBe(`#/components/schemas/${INPUT_SCHEMA_NAME}`);
  });

  it('bulkCreate request body references the input schema', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/rows/bulk`];
    const body = path?.post?.requestBody as oas31.RequestBodyObject;
    const schema = body?.content?.['application/json']
      ?.schema as oas31.SchemaObject;
    const items = (schema?.properties?.rows as oas31.SchemaObject)
      ?.items as oas31.SchemaObject;
    const dataRef = (items?.properties?.data as oas31.ReferenceObject)?.$ref;
    expect(dataRef).toBe(`#/components/schemas/${INPUT_SCHEMA_NAME}`);
  });

  it('bulkUpdate (PUT) request body references the input schema', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/rows/bulk`];
    const body = path?.put?.requestBody as oas31.RequestBodyObject;
    const schema = body?.content?.['application/json']
      ?.schema as oas31.SchemaObject;
    const items = (schema?.properties?.rows as oas31.SchemaObject)
      ?.items as oas31.SchemaObject;
    const dataRef = (items?.properties?.data as oas31.ReferenceObject)?.$ref;
    expect(dataRef).toBe(`#/components/schemas/${INPUT_SCHEMA_NAME}`);
  });

  it('GET single row response still references the output schema (not input)', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/row/{rowId}`];
    const response = path?.get?.responses?.['200'] as oas31.ResponseObject;
    const schema = response?.content?.['application/json']
      ?.schema as oas31.SchemaObject;
    const dataRef = (schema?.properties?.data as oas31.ReferenceObject)?.$ref;
    expect(dataRef).toBe(`#/components/schemas/${SCHEMA_NAME}`);
  });

  it('createRow response still references the output schema (not input)', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/row/{rowId}`];
    const response = path?.post?.responses?.['200'] as oas31.ResponseObject;
    const schema = response?.content?.['application/json']
      ?.schema as oas31.SchemaObject;
    const dataRef = (schema?.properties?.data as oas31.ReferenceObject)?.$ref;
    expect(dataRef).toBe(`#/components/schemas/${SCHEMA_NAME}`);
  });
});
