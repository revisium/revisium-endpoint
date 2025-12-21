import { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
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
  user2,
  user3,
} from './test-utils';

describe('restapi controller', () => {
  describe('POST /endpoint/restapi/:org/:project/:branch/:postfix/:tableId', () => {
    it('should return all rows with basic pagination', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ first: 100 })
        .expect(200);

      expect(response.body.totalCount).toBe(3);
      expect(response.body.edges).toHaveLength(3);
      expect(response.body.edges[0].node.id).toBe(user1.id);
    });

    it('should pass orderBy to Core API', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          orderBy: [{ field: 'id', direction: 'desc' }],
        })
        .expect(200);

      expect(response.body.totalCount).toBe(3);
      expect(response.body.edges[0].node.id).toBe(user3.id);
      expect(response.body.edges[2].node.id).toBe(user1.id);
    });

    it('should pass where filter to Core API', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          where: { id: { equals: 'user-2' } },
        })
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.edges[0].node.id).toBe(user2.id);
    });

    it('should filter by readonly field', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          where: { readonly: { equals: true } },
        })
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.edges[0].node.id).toBe(user3.id);
      expect(response.body.edges[0].node.readonly).toBe(true);
    });

    it('should filter by data path with gte operator', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          where: { data: { path: 'age', gte: 30 } },
        })
        .expect(200);

      expect(response.body.totalCount).toBe(2);
      const ids = response.body.edges.map(
        (e: { node: { id: string } }) => e.node.id,
      );
      expect(ids).toContain(user1.id);
      expect(ids).toContain(user3.id);
    });

    it('should sort by data path', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          orderBy: [
            { field: 'data', direction: 'desc', path: 'age', type: 'int' },
          ],
        })
        .expect(200);

      expect(response.body.edges[0].node.id).toBe(user3.id);
      expect(response.body.edges[1].node.id).toBe(user1.id);
      expect(response.body.edges[2].node.id).toBe(user2.id);
    });

    it('should support complex where with AND/OR', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          where: {
            id: { startsWith: 'user-' },
          },
        })
        .expect(200);

      expect(response.body.totalCount).toBe(3);
    });

    it('should support sorting by nested data field', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          orderBy: [
            {
              field: 'data',
              direction: 'asc',
              path: 'firstName',
              type: 'text',
            },
          ],
        })
        .expect(200);

      expect(response.body.totalCount).toBe(3);
      expect(response.body.edges).toHaveLength(3);
      expect(mockProxyCoreApiService.api.rows).toHaveBeenCalledWith(
        expect.any(String),
        USER_TABLE_ID,
        expect.objectContaining({
          orderBy: [
            {
              field: 'data',
              direction: 'asc',
              path: 'firstName',
              type: 'text',
            },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should support combined filtering and sorting', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({
          first: 100,
          orderBy: [
            { field: 'data', direction: 'desc', path: 'age', type: 'int' },
          ],
          where: { readonly: { equals: false } },
        })
        .expect(200);

      expect(response.body.totalCount).toBe(2);
      expect(response.body.edges[0].node.id).toBe(user1.id);
      expect(response.body.edges[1].node.id).toBe(user2.id);
    });

    it('should support after cursor', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ first: 100, after: 'cursor123' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should resolve plural path to table', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl('users'))
        .set('Authorization', 'Bearer test-token')
        .send({ first: 100 })
        .expect(200);

      expect(response.body.totalCount).toBe(3);
      expect(mockProxyCoreApiService.api.rows).toHaveBeenCalledWith(
        expect.any(String),
        USER_TABLE_ID,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should return 400 for unknown table', async () => {
      const response = await request(app.getHttpServer())
        .post(getUrl('nonexistent'))
        .set('Authorization', 'Bearer test-token')
        .send({ first: 100 })
        .expect(400);

      expect(response.body.message).toBe('Table "nonexistent" not found');
    });
  });

  function getUrl(tableId: string) {
    return `/endpoint/restapi/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head/${tableId}`;
  }

  let app: INestApplication;
  const mockInternalCoreApiService = createMockInternalCoreApiService();
  const mockProxyCoreApiService = createMockProxyCoreApiService();

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

  afterEach(() => {
    jest.clearAllMocks();
  });
});
