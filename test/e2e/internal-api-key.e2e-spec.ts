import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { initSwagger } from '@revisium/core';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { TestAppModule } from './test-app.module';
import { runMigrations, runSeed } from './setup';

describe('Internal API Key E2E', () => {
  let app: INestApplication;
  let bootstrappedKey: string;

  beforeAll(async () => {
    const TEST_DB_URL =
      'postgresql://revisium:password@localhost:5437/revisium-endpoint-test?schema=public';

    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.REVISIUM_NO_AUTH = 'true';
    process.env.NODE_ENV = 'test';
    delete process.env.INTERNAL_API_KEY_ENDPOINT;

    runMigrations();
    runSeed();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    initSwagger(app);

    const port = process.env.PORT || 8083;
    process.env.PORT = String(port);
    process.env.CORE_API_URL = `http://127.0.0.1:${port}`;
    await app.listen(port);

    // Core's InternalKeyBootstrapService auto-generates and exports the key
    // into process.env on module init.
    bootstrappedKey = process.env
      .INTERNAL_API_KEY_ENDPOINT as unknown as string;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.INTERNAL_API_KEY_ENDPOINT;
  }, 15000);

  it('should initialize InternalCoreApiService with the bootstrapped key', async () => {
    const internalCoreApi = app.get(InternalCoreApiService);
    await internalCoreApi.initApi();

    const params = (internalCoreApi as any).mergeRequestParams({}, {});
    const headers = params.headers as Record<string, string>;

    expect(bootstrappedKey).toMatch(/^rev_/);
    expect(headers['X-Internal-Api-Key']).toBe(bootstrappedKey);
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should skip password auth when INTERNAL_API_KEY_ENDPOINT is set', async () => {
    const internalCoreApi = app.get(InternalCoreApiService);
    const logSpy = jest.spyOn((internalCoreApi as any).logger, 'log');

    await internalCoreApi.initApi();

    expect(logSpy).toHaveBeenCalledWith(
      'Using internal API key for core authentication',
    );
  });
});
