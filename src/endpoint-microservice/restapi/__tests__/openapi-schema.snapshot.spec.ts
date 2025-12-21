import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import * as fs from 'node:fs/promises';
import { join } from 'path';
import {
  getArraySchema,
  getBooleanSchema,
  getNumberSchema,
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

const REVISION_ID = 'test-revision-id';
const PROJECT_NAME = 'TestProject';

const createComplexSchemaTableData = () => {
  const authorSchema = getObjectSchema({
    name: getStringSchema(),
    email: getStringSchema(),
    bio: getStringSchema(),
    age: getNumberSchema(),
    isVerified: getBooleanSchema(),
    avatar: getRefSchema(SystemSchemaIds.File),
    socialLinks: getArraySchema(
      getObjectSchema({
        platform: getStringSchema(),
        url: getStringSchema(),
      }),
    ),
  });

  const categorySchema = getObjectSchema({
    name: getStringSchema(),
    slug: getStringSchema(),
    description: getStringSchema(),
    parent: getStringSchema({ foreignKey: 'category' }),
    order: getNumberSchema(),
    isActive: getBooleanSchema(),
  });

  const tagSchema = getObjectSchema({
    name: getStringSchema(),
    color: getStringSchema(),
  });

  const postSchema = getObjectSchema({
    title: getStringSchema(),
    slug: getStringSchema(),
    content: getStringSchema(),
    excerpt: getStringSchema(),
    author: getStringSchema({ foreignKey: 'author' }),
    category: getStringSchema({ foreignKey: 'category' }),
    tags: getArraySchema(getStringSchema({ foreignKey: 'tag' })),
    featuredImage: getRefSchema(SystemSchemaIds.File),
    gallery: getArraySchema(getRefSchema(SystemSchemaIds.File)),
    publishedAt: getStringSchema(),
    viewCount: getNumberSchema(),
    isPublished: getBooleanSchema(),
    metadata: getObjectSchema({
      seoTitle: getStringSchema(),
      seoDescription: getStringSchema(),
      keywords: getArraySchema(getStringSchema()),
      customFields: getObjectSchema({
        field1: getStringSchema(),
        field2: getNumberSchema(),
      }),
    }),
    comments: getArraySchema(
      getObjectSchema({
        authorName: getStringSchema(),
        content: getStringSchema(),
        createdAt: getStringSchema(),
        replies: getArraySchema(
          getObjectSchema({
            authorName: getStringSchema(),
            content: getStringSchema(),
          }),
        ),
      }),
    ),
  });

  const mediaSchema = getObjectSchema({
    file: getRefSchema(SystemSchemaIds.File),
    alt: getStringSchema(),
    caption: getStringSchema(),
    type: getStringSchema(),
    dimensions: getObjectSchema({
      width: getNumberSchema(),
      height: getNumberSchema(),
    }),
  });

  const settingsSchema = getObjectSchema({
    siteName: getStringSchema(),
    siteUrl: getStringSchema(),
    logo: getRefSchema(SystemSchemaIds.File),
    socialMedia: getObjectSchema({
      twitter: getStringSchema(),
      facebook: getStringSchema(),
      instagram: getStringSchema(),
    }),
    features: getObjectSchema({
      enableComments: getBooleanSchema(),
      enableNewsletter: getBooleanSchema(),
      maintenanceMode: getBooleanSchema(),
    }),
    limits: getObjectSchema({
      maxUploadSize: getNumberSchema(),
      postsPerPage: getNumberSchema(),
    }),
  });

  return {
    data: {
      edges: [
        { node: { id: 'author', data: authorSchema } },
        { node: { id: 'category', data: categorySchema } },
        { node: { id: 'tag', data: tagSchema } },
        { node: { id: 'post', data: postSchema } },
        { node: { id: 'media', data: mediaSchema } },
        { node: { id: 'settings', data: settingsSchema } },
      ],
      totalCount: 6,
    },
    error: null,
  };
};

const createMockInternalCoreApiService = () => ({
  initApi: jest.fn().mockResolvedValue(undefined),
  api: {
    login: jest.fn().mockResolvedValue({
      data: { accessToken: 'mock-token' },
      error: null,
    }),
    rows: jest
      .fn()
      .mockImplementation((revisionId: string, tableId: string) => {
        if (tableId === SystemTables.Schema) {
          return Promise.resolve(createComplexSchemaTableData());
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
    tableForeignKeysBy: jest
      .fn()
      .mockImplementation((params: { tableId: string }) => {
        const foreignKeysMap: Record<string, string[]> = {
          author: ['post'],
          category: ['category', 'post'],
          tag: ['post'],
        };
        const fks = foreignKeysMap[params.tableId] || [];
        return Promise.resolve({
          data: {
            edges: fks.map((id) => ({ node: { id } })),
          },
          error: null,
        });
      }),
    endpoints: jest.fn().mockResolvedValue({
      data: { edges: [], totalCount: 0 },
      error: null,
    }),
  },
});

const createMockProxyCoreApiService = () => ({
  api: {},
});

const createMockPrismaService = () => ({
  endpoint: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

describe('OpenAPI Schema Snapshot', () => {
  it('complex schema with relations, files, nested objects, and arrays', async () => {
    const openApiJson = await queryBus.execute<
      GetOpenApiSchemaQuery,
      OpenApiSchema
    >(
      new GetOpenApiSchemaQuery({
        revisionId: REVISION_ID,
        projectName: PROJECT_NAME,
      }),
    );

    const normalizedSchema = JSON.stringify(openApiJson, null, 2);

    await checkSnapshot(normalizedSchema, 'complex-schema.openapi.json');
  });

  async function checkSnapshot(content: string, fileName: string) {
    const snapshotPath = join(__dirname, 'snapshots', fileName);

    const normalizeLineEndings = (str: string) =>
      str.replace(/\r\n|\r/g, '\n').trim();

    try {
      const existingSnapshot = await fs.readFile(snapshotPath, 'utf8');
      expect(normalizeLineEndings(content)).toBe(
        normalizeLineEndings(existingSnapshot),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(snapshotPath, content, 'utf8');
        console.log(`Snapshot created: ${snapshotPath}`);
      } else {
        throw error;
      }
    }
  }

  let app: INestApplication;
  let queryBus: QueryBus;

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
  });

  afterAll(async () => {
    await app.close();
  });
});
