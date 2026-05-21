import { INestApplication } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { oas31 } from 'openapi3-ts';
import {
  getArraySchema,
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
const WRITE_SCHEMA_NAME = 'TestProjectDocumentWriteInput';

const WRITABLE_FILE_FIELDS = ['fileName'];
const SERVER_MANAGED_FILE_FIELDS = [
  'status',
  'fileId',
  'url',
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
            nested: getObjectSchema({
              contract: getRefSchema(SystemSchemaIds.File),
            }),
            gallery: getArraySchema(getRefSchema(SystemSchemaIds.File)),
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

type JsonContentObject = {
  content?: Record<
    string,
    {
      schema?: oas31.SchemaObject | oas31.ReferenceObject;
    }
  >;
};

const getJsonSchema = (body: unknown) =>
  (body as JsonContentObject | undefined)?.content?.['application/json']
    ?.schema as oas31.SchemaObject;

const getDataRef = (schema: oas31.SchemaObject | undefined) =>
  (schema?.properties?.data as oas31.ReferenceObject | undefined)?.$ref;

const getBulkDataRef = (schema: oas31.SchemaObject | undefined) => {
  const rows = schema?.properties?.rows as oas31.SchemaObject | undefined;
  const items = rows?.items as oas31.SchemaObject | undefined;
  return (items?.properties?.data as oas31.ReferenceObject | undefined)?.$ref;
};

describe('OpenAPI write schemas for File fields (qa#20)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
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
    process.env.NODE_ENV = originalNodeEnv;
    await app.close();
  }, 10000);

  it('creates output and write input schemas', () => {
    const schemas = openApiJson.components?.schemas ?? {};
    expect(schemas).toHaveProperty(SCHEMA_NAME);
    expect(schemas).toHaveProperty(WRITE_SCHEMA_NAME);
  });

  it('uses write input schema for single create and update request bodies', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/row/{rowId}`];

    expect(getDataRef(getJsonSchema(path?.post?.requestBody))).toBe(
      `#/components/schemas/${WRITE_SCHEMA_NAME}`,
    );
    expect(getDataRef(getJsonSchema(path?.put?.requestBody))).toBe(
      `#/components/schemas/${WRITE_SCHEMA_NAME}`,
    );
  });

  it('uses write input schema for bulk create and update request bodies', () => {
    const path = openApiJson.paths?.[`/tables/${TABLE_ID}/rows/bulk`];

    expect(getBulkDataRef(getJsonSchema(path?.post?.requestBody))).toBe(
      `#/components/schemas/${WRITE_SCHEMA_NAME}`,
    );
    expect(getBulkDataRef(getJsonSchema(path?.put?.requestBody))).toBe(
      `#/components/schemas/${WRITE_SCHEMA_NAME}`,
    );
  });

  it('keeps response schemas on the output schema', () => {
    const singlePath = openApiJson.paths?.[`/tables/${TABLE_ID}/row/{rowId}`];
    const rowsPath = openApiJson.paths?.[`/tables/${TABLE_ID}/rows`];

    expect(getDataRef(getJsonSchema(singlePath?.get?.responses?.['200']))).toBe(
      `#/components/schemas/${SCHEMA_NAME}`,
    );
    expect(
      getDataRef(getJsonSchema(singlePath?.post?.responses?.['200'])),
    ).toBe(`#/components/schemas/${SCHEMA_NAME}`);

    const listResponseSchema = getJsonSchema(
      rowsPath?.post?.responses?.['200'],
    );
    const edges = listResponseSchema?.properties?.edges as
      | oas31.SchemaObject
      | undefined;
    const edge = edges?.items as oas31.SchemaObject | undefined;
    const node = edge?.properties?.node as oas31.SchemaObject | undefined;
    expect(getDataRef(node)).toBe(`#/components/schemas/${SCHEMA_NAME}`);
  });

  it('keeps file metadata in output schema', () => {
    const outputSchema = openApiJson.components?.schemas?.[
      SCHEMA_NAME
    ] as oas31.SchemaObject;
    const file = outputSchema.properties?.file as oas31.SchemaObject;

    for (const field of [...SERVER_MANAGED_FILE_FIELDS, 'fileName']) {
      expect(file.properties).toHaveProperty(field);
    }

    for (const field of SERVER_MANAGED_FILE_FIELDS) {
      expect((file.properties?.[field] as oas31.SchemaObject).readOnly).toBe(
        true,
      );
    }
  });

  it('omits server-managed file metadata from write input schema', () => {
    const writeSchema = openApiJson.components?.schemas?.[
      WRITE_SCHEMA_NAME
    ] as oas31.SchemaObject;
    const file = writeSchema.properties?.file as oas31.SchemaObject;
    const nested = writeSchema.properties?.nested as oas31.SchemaObject;
    const contract = nested.properties?.contract as oas31.SchemaObject;
    const gallery = writeSchema.properties?.gallery as oas31.SchemaObject;
    const galleryItem = gallery.items as oas31.SchemaObject;

    for (const fileSchema of [file, contract, galleryItem]) {
      expect(Object.keys(fileSchema.properties ?? {}).sort()).toEqual(
        WRITABLE_FILE_FIELDS,
      );
      expect(fileSchema.required).toEqual(WRITABLE_FILE_FIELDS);

      for (const field of SERVER_MANAGED_FILE_FIELDS) {
        expect(fileSchema.properties).not.toHaveProperty(field);
      }
    }
  });
});
