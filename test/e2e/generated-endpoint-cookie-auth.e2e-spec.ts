import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { initSwagger } from '@revisium/core';
import request from 'supertest';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { CreateRestapiEndpointCommand } from 'src/endpoint-microservice/restapi/commands/impl';
import { runMigrations, runSeed } from './setup';
import { TestAppModule } from './test-app.module';

const ORGANIZATION_ID = 'admin';
const PROJECT_NAME = `cookieauth${Date.now()}`;
const BRANCH_NAME = 'master';
const TEST_PORT = 8084;
const TEST_DB_URL =
  'postgresql://revisium:password@localhost:5437/revisium-endpoint-test?schema=public';

type SetCookieHeader = string[] | string | undefined;

describe('Generated endpoint cookie auth E2E', () => {
  let app: INestApplication;
  let internalKey: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.REVISIUM_NO_AUTH = 'false';
    process.env.NODE_ENV = 'test';
    process.env.PORT = String(TEST_PORT);
    process.env.CORE_API_URL = `http://127.0.0.1:${TEST_PORT}`;
    delete process.env.INTERNAL_API_KEY_ENDPOINT;

    runMigrations();
    runSeed();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(parseCookies);
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    initSwagger(app);
    await app.listen(TEST_PORT);

    const internalCoreApi = app.get(InternalCoreApiService);
    await internalCoreApi.initApi();
    internalKey = process.env.INTERNAL_API_KEY_ENDPOINT ?? '';
    if (!internalKey) {
      throw new Error('INTERNAL_API_KEY_ENDPOINT was not bootstrapped');
    }

    await createRestEndpoint();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.INTERNAL_API_KEY_ENDPOINT;
  }, 15000);

  it('serves generated Swagger UI when authenticated with core session cookies', async () => {
    const authCookies = await loginAsAdmin();

    const res = await request(app.getHttpServer())
      .get(
        `/endpoint/swagger/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head`,
      )
      .set('Cookie', authCookies)
      .expect(200);

    expect(res.text).toContain('SwaggerUIBundle');
  });

  async function createRestEndpoint() {
    await apiPost(`/api/organization/${ORGANIZATION_ID}/projects`, {
      projectName: PROJECT_NAME,
    });

    const draft = await apiGet(
      `/api/organization/${ORGANIZATION_ID}/projects/${PROJECT_NAME}/branches/${BRANCH_NAME}/draft-revision`,
    );

    await apiPost(`/api/revision/${draft.id}/tables`, {
      tableId: 'item',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: '' },
        },
        additionalProperties: false,
        required: ['name'],
      },
    });

    await apiPost(
      `/api/organization/${ORGANIZATION_ID}/projects/${PROJECT_NAME}/branches/${BRANCH_NAME}/create-revision`,
      { comment: 'Initial data' },
    );

    const headRevision = await apiGet(
      `/api/organization/${ORGANIZATION_ID}/projects/${PROJECT_NAME}/branches/${BRANCH_NAME}/head-revision`,
    );

    const endpoint = await apiPost(
      `/api/revision/${headRevision.id}/endpoints`,
      { type: 'REST_API' },
    );

    const commandBus = app.get(CommandBus);
    await commandBus.execute(new CreateRestapiEndpointCommand(endpoint.id));
  }

  async function apiPost(path: string, body: Record<string, unknown>) {
    const res = await request(app.getHttpServer())
      .post(path)
      .set('X-Internal-Api-Key', internalKey)
      .send(body)
      .expect(201);

    return res.body;
  }

  async function apiGet(path: string) {
    const res = await request(app.getHttpServer())
      .get(path)
      .set('X-Internal-Api-Key', internalKey)
      .expect(200);

    return res.body;
  }

  async function loginAsAdmin(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ emailOrUsername: 'admin', password: 'admin' })
      .expect(201);

    return endpointCookieHeader(res.headers['set-cookie'] as SetCookieHeader);
  }
});

function endpointCookieHeader(setCookie: SetCookieHeader): string {
  const cookiePairs = (
    Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  )
    .map((entry) => entry.split(';')[0])
    .filter(
      (pair) => pair.startsWith('rev_at=') || pair.startsWith('rev_session='),
    );

  expect(cookiePairs).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/^rev_at=/),
      'rev_session=1',
    ]),
  );

  return cookiePairs.join('; ');
}

function parseCookies(
  req: { headers: { cookie?: string }; cookies?: Record<string, string> },
  _res: unknown,
  next: () => void,
) {
  req.cookies = {};

  for (const part of req.headers.cookie?.split(';') ?? []) {
    const pair = part.trim();
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex <= 0) continue;

    const name = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    req.cookies[name] = decodeURIComponent(value);
  }

  next();
}
