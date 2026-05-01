import { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import {
  createMockInternalCoreApiService,
  createMockProxyCoreApiService,
  ORGANIZATION_ID,
  PROJECT_NAME,
  BRANCH_NAME,
  createMockPrismaService,
} from './test-utils';

describe('GraphQL endpoint auth (issue #5 reproduction matrix)', () => {
  let app: INestApplication;
  const mockInternalCoreApiService = createMockInternalCoreApiService();
  const mockProxyCoreApiService = createMockProxyCoreApiService();

  const url = `/endpoint/graphql/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head`;

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
      new CreateGraphqlEndpointCommand('test-endpoint-id'),
    );
  });

  afterAll(async () => {
    await app.close();
  }, 10000);

  afterEach(() => jest.clearAllMocks());

  describe('POST { __typename } (private project)', () => {
    it('returns 403 when no auth and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      const res = await request(app.getHttpServer())
        .post(url)
        .send({ query: '{ __typename }' })
        .expect(403);

      expect(res.body.data).toBeUndefined();
      expect(res.body.statusCode).toBe(403);
    });

    it('returns 401 when invalid X-Api-Key and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized', statusCode: 401 },
        status: 401,
      });

      const res = await request(app.getHttpServer())
        .post(url)
        .set('X-Api-Key', 'rev_invalid_full_coverage')
        .send({ query: '{ __typename }' })
        .expect(401);

      expect(res.body.data).toBeUndefined();
    });

    it('returns 401 when core returns HTML body for invalid X-Api-Key on preflight', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 401,
      });

      const res = await request(app.getHttpServer())
        .post(url)
        .set('X-Api-Key', 'rev_invalid_full_coverage')
        .send({ query: '{ __typename }' })
        .expect(401);

      expect(res.body).toEqual({ statusCode: 401, message: 'Unauthorized' });
    });

    it('returns 200 with __typename when valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer valid-token')
        .send({ query: '{ __typename }' })
        .expect(200);

      expect(res.body.data).toEqual({ __typename: 'Query' });
    });

    it('forwards ?api_key= query param to preflight when no header set', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized', statusCode: 401 },
        status: 401,
      });

      await request(app.getHttpServer())
        .post(`${url}?api_key=rev_invalid_full_coverage`)
        .send({ query: '{ __typename }' })
        .expect(401);

      expect(mockProxyCoreApiService.api.revision).toHaveBeenCalledWith(
        expect.any(String),
        { headers: { 'x-api-key': 'rev_invalid_full_coverage' } },
      );
    });

    it('NEVER returns 200 with __typename for an unauthenticated private project', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      const res = await request(app.getHttpServer())
        .post(url)
        .send({ query: '{ __typename }' });

      expect(res.status).not.toBe(200);
      expect(res.body.data).toBeUndefined();
    });
  });

  describe('POST { __schema { ... } } (introspection)', () => {
    it('returns 403 when no auth and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      await request(app.getHttpServer())
        .post(url)
        .send({ query: '{ __schema { queryType { name } } }' })
        .expect(403);
    });

    it('allows introspection with valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer valid-token')
        .send({ query: '{ __schema { queryType { name } } }' })
        .expect(200);

      expect(res.body.data.__schema.queryType.name).toBe('Query');
    });
  });

  describe('GET (explorer redirect)', () => {
    it('returns 403 when no auth and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      await request(app.getHttpServer()).get(url).expect(403);
    });

    it('returns 401 when invalid X-Api-Key and preflight rejects', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized', statusCode: 401 },
        status: 401,
      });

      await request(app.getHttpServer())
        .get(url)
        .set('X-Api-Key', 'rev_invalid_full_coverage')
        .expect(401);
    });

    it('redirects to Apollo explorer with valid Bearer token', async () => {
      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', 'Bearer valid-token')
        .expect(302);
    });
  });

  describe('Resolver-level error mapping', () => {
    it('maps upstream 403 + non-JSON to FORBIDDEN with no originalError leak', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 403,
      });

      const res = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer valid-token')
        .send({
          query: 'query U($id: String!) { user(id: $id) { id } }',
          variables: { id: 'user-1' },
        })
        .expect(200);

      expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(res.body.errors[0].extensions.statusCode).toBe(403);
      expect(res.body.errors[0].extensions).not.toHaveProperty('originalError');
      expect(res.body.errors[0].message).not.toMatch(/Unexpected token/);
    });

    it('maps upstream 401 + non-JSON to UNAUTHENTICATED', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 401,
      });

      const res = await request(app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer valid-token')
        .send({
          query: 'query U($id: String!) { user(id: $id) { id } }',
          variables: { id: 'user-1' },
        })
        .expect(200);

      expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect(res.body.errors[0].extensions.statusCode).toBe(401);
    });
  });
});
