import { ConfigService } from '@nestjs/config';
import { InternalCoreApiService } from '../internal-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';

const createMockPrismaService = () =>
  ({
    user: {
      update: jest.fn(),
    },
  }) as unknown as jest.Mocked<PrismaService>;

const createMockConfigService = (
  overrides: Record<string, string | undefined> = {},
) => {
  const store: Record<string, string | undefined> = {
    PORT: '8080',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => store[key]),
  } as unknown as ConfigService;
};

describe('InternalCoreApiService', () => {
  describe('with INTERNAL_API_KEY set', () => {
    let service: InternalCoreApiService;
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      const configService = createMockConfigService({
        INTERNAL_API_KEY: 'rev_test1234567890abcdef',
      });
      const prisma = createMockPrismaService();
      const options: AppOptions = { mode: 'monolith' };

      service = new InternalCoreApiService(configService, prisma, options);
      logSpy = jest.spyOn((service as any).logger, 'log');
    });

    it('should skip login flow in initApi', async () => {
      await service.initApi();

      expect(logSpy).toHaveBeenCalledWith(
        'Using internal API key for core authentication',
      );
    });

    it('should send X-Internal-Api-Key header after initApi', async () => {
      await service.initApi();

      const params = (service as any).mergeRequestParams({}, {});

      expect(
        (params.headers as Record<string, string>)['X-Internal-Api-Key'],
      ).toBe('rev_test1234567890abcdef');
      expect(
        (params.headers as Record<string, string>)['Authorization'],
      ).toBeUndefined();
    });
  });

  describe('without INTERNAL_API_KEY (password fallback)', () => {
    let service: InternalCoreApiService;
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
      const configService = createMockConfigService({
        CORE_API_URL_USERNAME: 'endpoint',
        CORE_API_URL_PASSWORD: 'secret',
      });
      const prisma = createMockPrismaService();
      const options: AppOptions = { mode: 'microservice' };

      service = new InternalCoreApiService(configService, prisma, options);
      warnSpy = jest.spyOn((service as any).logger, 'warn');
    });

    it('should log deprecation warning', async () => {
      try {
        await service.initApi();
      } catch {
        // Expected: HTTP call fails in unit test
      }

      expect(warnSpy).toHaveBeenCalledWith(
        'Using deprecated password auth for endpoint→core communication. Set INTERNAL_API_KEY to upgrade.',
      );
    });

    it('should send Authorization Bearer header when using password auth', () => {
      (service as any).token = 'jwt-token-123';

      const params = (service as any).mergeRequestParams({}, {});

      expect((params.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer jwt-token-123',
      );
      expect(
        (params.headers as Record<string, string>)['X-Internal-Api-Key'],
      ).toBeUndefined();
    });
  });

  describe('microservice mode without any auth config', () => {
    it('should throw when CORE_API_URL_USERNAME is missing', async () => {
      const configService = createMockConfigService();
      const prisma = createMockPrismaService();
      const options: AppOptions = { mode: 'microservice' };

      const service = new InternalCoreApiService(
        configService,
        prisma,
        options,
      );

      await expect(service.initApi()).rejects.toThrow(
        'Invalid CORE_API_URL_USERNAME',
      );
    });
  });
});
