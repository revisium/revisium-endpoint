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
  POST_TABLE_ID,
  CONF_TABLE_ID,
  user1,
  user2,
  user3,
} from './test-utils';

describe('restapi controller', () => {
  describe('RevisionController', () => {
    describe('GET /endpoint/restapi/:org/:project/:branch/:postfix', () => {
      it('should return revision info', async () => {
        const response = await request(app.getHttpServer())
          .get(getRevisionUrl())
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.id).toBeDefined();
        expect(response.body.isDraft).toBe(true);
        expect(response.body.isHead).toBe(true);
      });
    });

    describe('GET /endpoint/restapi/:org/:project/:branch/:postfix/changes', () => {
      it('should return revision changes (not implemented)', async () => {
        const response = await request(app.getHttpServer())
          .get(`${getRevisionUrl()}/changes`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.message).toBe('Not implemented');
      });
    });

    describe('GET /endpoint/restapi/:org/:project/:branch/:postfix/tables', () => {
      it('should return all tables', async () => {
        const response = await request(app.getHttpServer())
          .get(`${getRevisionUrl()}/tables`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.totalCount).toBe(3);
        expect(response.body.edges).toHaveLength(3);
      });
    });
  });

  describe('TableController', () => {
    describe('GET /tables/:tableId', () => {
      it('should return table info', async () => {
        const response = await request(app.getHttpServer())
          .get(getTableUrl(USER_TABLE_ID))
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.id).toBe(USER_TABLE_ID);
        expect(response.body.count).toBeDefined();
      });
    });

    describe('GET /tables/:tableId/schema', () => {
      it('should return table schema', async () => {
        const response = await request(app.getHttpServer())
          .get(`${getTableUrl(USER_TABLE_ID)}/schema`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.type).toBe('object');
        expect(response.body.properties).toBeDefined();
      });
    });

    describe('GET /tables/:tableId/changes', () => {
      it('should return table changes (not implemented)', async () => {
        const response = await request(app.getHttpServer())
          .get(`${getTableUrl(USER_TABLE_ID)}/changes`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.message).toBe('Not implemented');
      });
    });

    describe('PUT /tables/:tableId/rows (bulkCreateRows)', () => {
      it('should bulk create rows', async () => {
        const response = await request(app.getHttpServer())
          .put(getRowsUrl(USER_TABLE_ID))
          .set('Authorization', 'Bearer test-token')
          .send({
            rows: [
              { rowId: 'new-1', data: { firstName: 'Test1' } },
              { rowId: 'new-2', data: { firstName: 'Test2' } },
            ],
          })
          .expect(200);

        expect(response.body.table).toBeDefined();
        expect(response.body.rows).toHaveLength(2);
        expect(response.body.rows[0].id).toBe('new-1');
        expect(response.body.rows[1].id).toBe('new-2');
      });

      it('should call createRows on Core API', async () => {
        await request(app.getHttpServer())
          .put(getRowsUrl(USER_TABLE_ID))
          .set('Authorization', 'Bearer test-token')
          .send({
            rows: [{ rowId: 'test-row', data: { firstName: 'Test' } }],
          })
          .expect(200);

        expect(mockProxyCoreApiService.api.createRows).toHaveBeenCalledWith(
          expect.any(String),
          USER_TABLE_ID,
          { rows: [{ rowId: 'test-row', data: { firstName: 'Test' } }] },
          expect.any(Object),
        );
      });
    });

    describe('POST /tables/:tableId/update-rows (bulkUpdateRows)', () => {
      it('should bulk update rows', async () => {
        const response = await request(app.getHttpServer())
          .post(`${getTableUrl(USER_TABLE_ID)}/update-rows`)
          .set('Authorization', 'Bearer test-token')
          .send({
            rows: [
              { rowId: 'user-1', data: { firstName: 'Updated1' } },
              { rowId: 'user-2', data: { firstName: 'Updated2' } },
            ],
          })
          .expect(200);

        expect(response.body.table).toBeDefined();
        expect(response.body.rows).toHaveLength(2);
        expect(response.body.rows[0].id).toBe('user-1');
        expect(response.body.rows[1].id).toBe('user-2');
      });

      it('should call updateRows on Core API', async () => {
        await request(app.getHttpServer())
          .post(`${getTableUrl(USER_TABLE_ID)}/update-rows`)
          .set('Authorization', 'Bearer test-token')
          .send({
            rows: [{ rowId: 'user-1', data: { firstName: 'Updated' } }],
          })
          .expect(200);

        expect(mockProxyCoreApiService.api.updateRows).toHaveBeenCalledWith(
          expect.any(String),
          USER_TABLE_ID,
          { rows: [{ rowId: 'user-1', data: { firstName: 'Updated' } }] },
          expect.any(Object),
        );
      });
    });

    describe('PATCH /tables/:tableId/rows (bulkPatchRows)', () => {
      it('should bulk patch rows', async () => {
        const response = await request(app.getHttpServer())
          .patch(getRowsUrl(USER_TABLE_ID))
          .set('Authorization', 'Bearer test-token')
          .send({
            rows: [
              {
                rowId: 'user-1',
                patches: [
                  { op: 'replace', path: 'firstName', value: 'Updated' },
                ],
              },
            ],
          })
          .expect(200);

        expect(response.body.table).toBeDefined();
        expect(response.body.rows).toHaveLength(1);
        expect(response.body.rows[0].id).toBe('user-1');
      });

      it('should call patchRows on Core API', async () => {
        const patches = [
          { op: 'replace', path: 'firstName', value: 'Patched' },
        ];

        await request(app.getHttpServer())
          .patch(getRowsUrl(USER_TABLE_ID))
          .set('Authorization', 'Bearer test-token')
          .send({
            rows: [{ rowId: 'user-1', patches }],
          })
          .expect(200);

        expect(mockProxyCoreApiService.api.patchRows).toHaveBeenCalledWith(
          expect.any(String),
          USER_TABLE_ID,
          { rows: [{ rowId: 'user-1', patches }] },
          expect.any(Object),
        );
      });
    });
  });

  describe('RowController additional endpoints', () => {
    describe('GET /row/:rowId/changes', () => {
      it('should return row changes (not implemented)', async () => {
        const response = await request(app.getHttpServer())
          .get(`${getRowUrl(USER_TABLE_ID, user1.id)}/changes`)
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.message).toBe('Not implemented');
      });
    });

    describe('GET /row/:rowId/foreign-keys-by/:fkTableId', () => {
      it('should return foreign key references', async () => {
        const response = await request(app.getHttpServer())
          .get(
            `${getRowUrl(USER_TABLE_ID, user1.id)}/foreign-keys-by/${POST_TABLE_ID}?first=10`,
          )
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.edges).toBeDefined();
        expect(response.body.totalCount).toBeDefined();
        expect(
          mockProxyCoreApiService.api.rowForeignKeysBy,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            tableId: USER_TABLE_ID,
            rowId: user1.id,
            foreignKeyByTableId: POST_TABLE_ID,
            first: 10,
          }),
          expect.any(Object),
        );
      });

      it('should pass after cursor for pagination', async () => {
        const response = await request(app.getHttpServer())
          .get(
            `${getRowUrl(USER_TABLE_ID, user1.id)}/foreign-keys-by/${POST_TABLE_ID}?first=10&after=cursor123`,
          )
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(response.body.edges).toBeDefined();
        expect(
          mockProxyCoreApiService.api.rowForeignKeysBy,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            first: 10,
            after: 'cursor123',
          }),
          expect.any(Object),
        );
      });
    });

    describe('POST /row/:rowId/files/:fileId', () => {
      it('should upload file', async () => {
        const buffer = Buffer.from('test file content');

        const response = await request(app.getHttpServer())
          .post(`${getRowUrl(USER_TABLE_ID, user1.id)}/files/file-123`)
          .set('Authorization', 'Bearer test-token')
          .attach('file', buffer, 'test.txt')
          .expect(201);

        expect(response.body.fileId).toBe('file-123');
        expect(response.body.url).toBeDefined();
      });
    });
  });

  describe('Endpoint not found scenarios', () => {
    it('should return 404 when endpoint not started', async () => {
      await request(app.getHttpServer())
        .get(
          '/endpoint/restapi/unknown-org/unknown-project/unknown-branch/head',
        )
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });

    it('should return 404 for rows endpoint when endpoint not started', async () => {
      await request(app.getHttpServer())
        .post(
          '/endpoint/restapi/unknown-org/unknown-project/unknown-branch/head/tables/users/rows',
        )
        .set('Authorization', 'Bearer test-token')
        .send({ first: 10 })
        .expect(404);
    });

    it('should return 404 for table endpoint when endpoint not started', async () => {
      await request(app.getHttpServer())
        .get(
          '/endpoint/restapi/unknown-org/unknown-project/unknown-branch/head/tables/users',
        )
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });

    it('should return 404 for row endpoint when endpoint not started', async () => {
      await request(app.getHttpServer())
        .get(
          '/endpoint/restapi/unknown-org/unknown-project/unknown-branch/head/tables/users/row/user-1',
        )
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });
  });

  describe('Error handling', () => {
    it('should return error when Core API row fails', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found', statusCode: 404 },
      });

      await request(app.getHttpServer())
        .get(getRowUrl(USER_TABLE_ID, 'nonexistent'))
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });

    it('should return error when Core API rows fails', async () => {
      mockProxyCoreApiService.api.rows.mockResolvedValueOnce({
        data: null,
        error: { message: 'Internal error', statusCode: 500 },
      });

      await request(app.getHttpServer())
        .post(getRowsUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ first: 10 })
        .expect(500);
    });

    it('should return error when Core API tables fails', async () => {
      mockProxyCoreApiService.api.tables.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unauthorized', statusCode: 401 },
      });

      await request(app.getHttpServer())
        .get(`${getRevisionUrl()}/tables`)
        .set('Authorization', 'Bearer test-token')
        .expect(401);
    });

    it('should return error when Core API revision fails', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found', statusCode: 404 },
      });

      await request(app.getHttpServer())
        .get(getRevisionUrl())
        .set('Authorization', 'Bearer test-token')
        .expect(404);
    });

    it('should return error when Core API createRows fails', async () => {
      mockProxyCoreApiService.api.createRows.mockResolvedValueOnce({
        data: null,
        error: { message: 'Validation failed', statusCode: 400 },
      });

      await request(app.getHttpServer())
        .put(getRowsUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ rows: [{ rowId: 'test', data: {} }] })
        .expect(400);
    });

    it('should return error when Core API updateRows fails', async () => {
      mockProxyCoreApiService.api.updateRows.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found', statusCode: 404 },
      });

      await request(app.getHttpServer())
        .post(`${getTableUrl(USER_TABLE_ID)}/update-rows`)
        .set('Authorization', 'Bearer test-token')
        .send({ rows: [{ rowId: 'nonexistent', data: {} }] })
        .expect(404);
    });

    it('should return error when Core API patchRows fails', async () => {
      mockProxyCoreApiService.api.patchRows.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid patch', statusCode: 400 },
      });

      await request(app.getHttpServer())
        .patch(getRowsUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ rows: [{ rowId: 'user-1', patches: [] }] })
        .expect(400);
    });
  });

  describe('POST /endpoint/restapi/:org/:project/:branch/:postfix/tables/:tableId/rows', () => {
    it('should return all rows with basic pagination', async () => {
      const response = await request(app.getHttpServer())
        .post(getRowsUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ first: 100 })
        .expect(200);

      expect(response.body.totalCount).toBe(3);
      expect(response.body.edges).toHaveLength(3);
      expect(response.body.edges[0].node.id).toBe(user1.id);
    });

    it('should pass orderBy to Core API', async () => {
      const response = await request(app.getHttpServer())
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
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
        .post(getRowsUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ first: 100, after: 'cursor123' })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('DELETE /endpoint/restapi/:org/:project/:branch/:postfix/tables/:tableId/rows', () => {
    it('should bulk delete rows by IDs', async () => {
      const response = await request(app.getHttpServer())
        .delete(getRowsUrl(USER_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ rowIds: ['user-1', 'user-2'] });

      expect(response.status).toBe(200);
      expect(response.body).toBe(true);
    });

    it('should delete rows from uppercase table name', async () => {
      const response = await request(app.getHttpServer())
        .delete(getRowsUrl(CONF_TABLE_ID))
        .set('Authorization', 'Bearer test-token')
        .send({ rowIds: ['1', '2', '3'] })
        .expect(200);

      expect(response.body).toBe(true);
    });
  });

  describe('GET /endpoint/restapi/:org/:project/:branch/:postfix/tables/:tableId/row/:rowId', () => {
    it('should get single row by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(getRowUrl(USER_TABLE_ID, user1.id))
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body.id).toBe(user1.id);
      expect(response.body.data.firstName).toBe('John');
    });
  });

  describe('POST /endpoint/restapi/:org/:project/:branch/:postfix/tables/:tableId/row/:rowId', () => {
    it('should create a new row', async () => {
      const response = await request(app.getHttpServer())
        .post(getRowUrl(USER_TABLE_ID, 'new-row'))
        .set('Authorization', 'Bearer test-token')
        .send({ data: { firstName: 'New', lastName: 'User' } })
        .expect(201);

      expect(response.body.id).toBe('new-row');
    });
  });

  describe('PUT /endpoint/restapi/:org/:project/:branch/:postfix/tables/:tableId/row/:rowId', () => {
    it('should update an existing row', async () => {
      const response = await request(app.getHttpServer())
        .put(getRowUrl(USER_TABLE_ID, user1.id))
        .set('Authorization', 'Bearer test-token')
        .send({ data: { firstName: 'Updated', lastName: 'User' } })
        .expect(200);

      expect(response.body.id).toBe('updated-row');
    });
  });

  describe('PATCH /endpoint/restapi/:org/:project/:branch/:postfix/tables/:tableId/row/:rowId', () => {
    it('should patch an existing row', async () => {
      const response = await request(app.getHttpServer())
        .patch(getRowUrl(USER_TABLE_ID, user1.id))
        .set('Authorization', 'Bearer test-token')
        .send({
          patches: [{ op: 'replace', path: 'firstName', value: 'Patched' }],
        })
        .expect(200);

      expect(response.body.id).toBe('patched-row');
    });
  });

  describe('DELETE /endpoint/restapi/:org/:project/:branch/:postfix/tables/:tableId/row/:rowId', () => {
    it('should delete a row', async () => {
      const response = await request(app.getHttpServer())
        .delete(getRowUrl(USER_TABLE_ID, user1.id))
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toBe(true);
    });
  });

  function getRevisionUrl() {
    return `/endpoint/restapi/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head`;
  }

  function getTableUrl(tableId: string) {
    return `/endpoint/restapi/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head/tables/${tableId}`;
  }

  function getRowsUrl(tableId: string) {
    return `/endpoint/restapi/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head/tables/${tableId}/rows`;
  }

  function getRowUrl(tableId: string, rowId: string) {
    return `/endpoint/restapi/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head/tables/${tableId}/row/${rowId}`;
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
