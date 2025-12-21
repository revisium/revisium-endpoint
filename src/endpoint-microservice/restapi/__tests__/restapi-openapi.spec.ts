import { INestApplication } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { GetOpenApiSchemaQuery } from 'src/endpoint-microservice/restapi/queries/impl';
import { OpenApiSchema } from 'src/endpoint-microservice/shared/types/open-api-schema';
import {
  createMockInternalCoreApiService,
  createMockProxyCoreApiService,
  createMockPrismaService,
  REVISION_ID,
  PROJECT_NAME,
} from './test-utils';

describe('restapi OpenAPI generation', () => {
  describe('URL paths (singular/plural like GraphQL)', () => {
    it('should use singular path for single item and plural path for list', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      expect(openApiJson.paths).toHaveProperty('/users');
      expect(openApiJson.paths).toHaveProperty('/user/{id}');
      expect(openApiJson.paths).toHaveProperty('/posts');
      expect(openApiJson.paths).toHaveProperty('/post/{id}');
    });

    it('should use singular path as tag name', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      const userPath = openApiJson.paths?.['/user/{id}'];
      expect(userPath?.get?.tags).toContain('user');
    });
  });

  describe('schema names (with project prefix)', () => {
    it('should use project name as prefix for schema components', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      expect(openApiJson.components?.schemas).toHaveProperty('BlogUser');
      expect(openApiJson.components?.schemas).toHaveProperty('BlogPost');
    });

    it('should use prefixed schema names in GET by ID response data $ref', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      const userPath = openApiJson.paths?.['/user/{id}'];
      const responseSchema = userPath?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema as {
        type?: string;
        properties?: {
          id?: { type: string };
          versionId?: { type: string };
          createdId?: { type: string };
          createdAt?: { type: string; format?: string };
          updatedAt?: { type: string; format?: string };
          publishedAt?: { type: string; format?: string };
          readonly?: { type: string };
          data?: { $ref?: string };
        };
        required?: string[];
      };

      expect(responseSchema?.type).toBe('object');
      expect(responseSchema?.properties?.id?.type).toBe('string');
      expect(responseSchema?.properties?.versionId?.type).toBe('string');
      expect(responseSchema?.properties?.createdId?.type).toBe('string');
      expect(responseSchema?.properties?.createdAt?.format).toBe('date-time');
      expect(responseSchema?.properties?.updatedAt?.format).toBe('date-time');
      expect(responseSchema?.properties?.publishedAt?.format).toBe('date-time');
      expect(responseSchema?.properties?.readonly?.type).toBe('boolean');
      expect(responseSchema?.properties?.data?.$ref).toBe(
        '#/components/schemas/BlogUser',
      );
      expect(responseSchema?.required).toContain('id');
      expect(responseSchema?.required).toContain('data');
    });
  });

  describe('common schema names', () => {
    it('should use project name as default prefix for common schemas', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      expect(openApiJson.components?.schemas).toHaveProperty(
        'BlogStringFilter',
      );
      expect(openApiJson.components?.schemas).toHaveProperty('BlogBoolFilter');
      expect(openApiJson.components?.schemas).toHaveProperty(
        'BlogDateTimeFilter',
      );
      expect(openApiJson.components?.schemas).toHaveProperty('BlogJsonFilter');
      expect(openApiJson.components?.schemas).toHaveProperty(
        'BlogRowWhereInput',
      );
      expect(openApiJson.components?.schemas).toHaveProperty('BlogOrderBy');
    });

    it('should use transformed names in $ref references within RowWhereInput', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      const rowWhereInput = openApiJson.components?.schemas?.[
        'BlogRowWhereInput'
      ] as {
        properties?: {
          AND?: { items?: { $ref?: string } };
          id?: { $ref?: string };
          readonly?: { $ref?: string };
          createdAt?: { $ref?: string };
          data?: { $ref?: string };
        };
      };

      expect(rowWhereInput?.properties?.AND?.items?.$ref).toBe(
        '#/components/schemas/BlogRowWhereInput',
      );
      expect(rowWhereInput?.properties?.id?.$ref).toBe(
        '#/components/schemas/BlogStringFilter',
      );
      expect(rowWhereInput?.properties?.readonly?.$ref).toBe(
        '#/components/schemas/BlogBoolFilter',
      );
      expect(rowWhereInput?.properties?.createdAt?.$ref).toBe(
        '#/components/schemas/BlogDateTimeFilter',
      );
      expect(rowWhereInput?.properties?.data?.$ref).toBe(
        '#/components/schemas/BlogJsonFilter',
      );
    });

    it('should use prefixed names in query body schema $refs', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      const userPath = openApiJson.paths?.['/users'];
      const requestBody = userPath?.post?.requestBody as {
        content?: {
          'application/json'?: {
            schema?: {
              properties?: {
                orderBy?: { items?: { $ref?: string } };
                where?: { $ref?: string };
              };
            };
          };
        };
      };
      const requestBodySchema =
        requestBody?.content?.['application/json']?.schema;

      expect(requestBodySchema?.properties?.orderBy?.items?.$ref).toBe(
        '#/components/schemas/BlogOrderBy',
      );
      expect(requestBodySchema?.properties?.where?.$ref).toBe(
        '#/components/schemas/BlogRowWhereInput',
      );
    });
  });

  describe('different project names (schema prefix)', () => {
    it('should capitalize first letter of project name for schema prefix', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: 'myproject',
        }),
      );

      expect(openApiJson.paths).toHaveProperty('/users');
      expect(openApiJson.components?.schemas).toHaveProperty('MyprojectUser');
      expect(openApiJson.components?.schemas).toHaveProperty(
        'MyprojectStringFilter',
      );
    });

    it('should preserve camelCase in project name for schema prefix', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: 'myProject',
        }),
      );

      expect(openApiJson.paths).toHaveProperty('/users');
      expect(openApiJson.components?.schemas).toHaveProperty('MyProjectUser');
    });
  });

  describe('operationId generation', () => {
    it('should generate correct operationIds for CRUD operations', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      const listPath = openApiJson.paths?.['/users'];
      expect(listPath?.post?.operationId).toBe('getUsers');

      const singlePath = openApiJson.paths?.['/user/{id}'];
      expect(singlePath?.get?.operationId).toBe('getUser');
    });

    it('should generate summary and description for operations', async () => {
      const openApiJson = await queryBus.execute<
        GetOpenApiSchemaQuery,
        OpenApiSchema
      >(
        new GetOpenApiSchemaQuery({
          revisionId: REVISION_ID,
          projectName: PROJECT_NAME,
        }),
      );

      const singlePath = openApiJson.paths?.['/user/{id}'];
      expect(singlePath?.get?.summary).toBe('Get user by ID');
      expect(singlePath?.get?.description).toBe(
        'Returns a single user row by its ID',
      );
    });
  });

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
  }, 10000);
});
