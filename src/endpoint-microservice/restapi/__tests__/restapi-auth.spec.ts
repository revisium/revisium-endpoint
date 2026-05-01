import { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { CreateRestapiEndpointCommand } from 'src/endpoint-microservice/restapi/commands/impl';
import {
  createMockInternalCoreApiService,
  createMockProxyCoreApiService,
  createMockPrismaService,
  ORGANIZATION_ID,
  PROJECT_NAME,
  BRANCH_NAME,
  USER_TABLE_ID,
  user1,
} from './test-utils';

describe('REST endpoint auth (issue #5 reproduction matrix)', () => {
  let app: INestApplication;
  const mockInternalCoreApiService = createMockInternalCoreApiService();
  const mockProxyCoreApiService = createMockProxyCoreApiService();

  const rowUrl = `/endpoint/rest/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head/tables/${USER_TABLE_ID}/row/${user1.id}`;
  const changesUrl = `/endpoint/rest/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head/changes`;
  const openApiUrl = `/endpoint/openapi/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head/openapi.json`;
  const swaggerUrl = `/endpoint/swagger/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head`;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EndpointMicroserviceModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(InternalCoreApiService)
      .useValue(mockInternalCoreApiService)
      .overrideProvider(ProxyCoreApiService)
      .useValue(mockProxyCoreApiService)
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const commandBus = app.get(CommandBus);
    await commandBus.execute(
      new CreateRestapiEndpointCommand('test-endpoint-id'),
    );
  });

  afterAll(async () => {
    await app.close();
  }, 10000);

  afterEach(() => jest.clearAllMocks());

  describe('GET /tables/:tableId/row/:rowId (private project)', () => {
    it('returns 403 when no auth provided and core rejects', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      const res = await request(app.getHttpServer()).get(rowUrl).expect(403);
      expect(res.body).not.toEqual({});
      expect(res.body.statusCode).toBe(403);
    });

    it('returns 401 when invalid X-Api-Key and core rejects', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized', statusCode: 401 },
        status: 401,
      });

      const res = await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', 'rev_invalid_full_coverage')
        .expect(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('returns 401 when core returns HTML body for invalid X-Api-Key', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 401,
      });

      const res = await request(app.getHttpServer())
        .get(rowUrl)
        .set('X-Api-Key', 'rev_invalid_full_coverage')
        .expect(401);
      expect(res.body).toEqual({ statusCode: 401, message: 'Unauthorized' });
    });

    it('returns 200 with row data when valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get(rowUrl)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      expect(res.body.id).toBe(user1.id);
    });

    it('forwards auth cookies to core', async () => {
      await request(app.getHttpServer())
        .get(rowUrl)
        .set('Cookie', 'theme=dark; rev_session=1; rev_at=jwt-token')
        .expect(200);

      expect(mockProxyCoreApiService.api.row).toHaveBeenCalledWith(
        expect.any(String),
        USER_TABLE_ID,
        user1.id,
        { headers: { cookie: 'rev_session=1; rev_at=jwt-token' } },
      );
    });

    it('forwards ?api_key= query param to core when no header set', async () => {
      await request(app.getHttpServer())
        .get(`${rowUrl}?api_key=rev_valid_key`)
        .expect(200);

      expect(mockProxyCoreApiService.api.row).toHaveBeenCalledWith(
        expect.any(String),
        USER_TABLE_ID,
        user1.id,
        { headers: { 'x-api-key': 'rev_valid_key' } },
      );
    });

    it('NEVER returns 200 with empty body for an upstream auth failure', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 403,
      });

      const res = await request(app.getHttpServer()).get(rowUrl);
      expect(res.status).not.toBe(200);
      expect(res.body).not.toEqual({});
    });
  });

  describe('GET /changes (revision)', () => {
    it('returns 403 when no auth provided and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      await request(app.getHttpServer()).get(changesUrl).expect(403);
    });

    it('returns 401 when invalid X-Api-Key and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized', statusCode: 401 },
        status: 401,
      });

      await request(app.getHttpServer())
        .get(changesUrl)
        .set('X-Api-Key', 'rev_invalid_full_coverage')
        .expect(401);
    });

    it('returns "Not implemented" with valid auth (preflight passes)', async () => {
      const res = await request(app.getHttpServer())
        .get(changesUrl)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      expect(res.body.message).toBe('Not implemented');
    });
  });

  describe('GET /openapi.json', () => {
    it('returns 403 when no auth provided and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      await request(app.getHttpServer()).get(openApiUrl).expect(403);
    });

    it('returns OpenAPI spec with valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get(openApiUrl)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      expect(res.body.openapi || res.body.swagger).toBeDefined();
    });
  });

  describe('GET /swagger', () => {
    it('returns 403 when no auth provided and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      await request(app.getHttpServer()).get(swaggerUrl).expect(403);
    });

    it('serves SwaggerUI HTML with valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get(swaggerUrl)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      expect(res.text).toContain('SwaggerUIBundle');
    });

    it('serves SwaggerUI HTML with valid auth cookies', async () => {
      const res = await request(app.getHttpServer())
        .get(swaggerUrl)
        .set('Cookie', 'theme=dark; rev_session=1; rev_at=jwt-token')
        .expect(200);

      expect(res.text).toContain('SwaggerUIBundle');
      expect(mockProxyCoreApiService.api.revision).toHaveBeenCalledWith(
        expect.any(String),
        { headers: { cookie: 'rev_session=1; rev_at=jwt-token' } },
      );
    });
  });
});
