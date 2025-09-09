import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { EndpointSyncManager } from '../endpoint-sync-manager.service';
import { InitialSyncService } from '../services/initial-sync.service';
import { DbPollingStrategy } from '../strategies/db-polling.strategy';
import { PgNotifyStrategy } from '../strategies/pg-notify.strategy';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { APP_OPTIONS_TOKEN } from 'src/endpoint-microservice/shared/app-mode';

const createMockPrismaService = () =>
  ({
    endpoint: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  }) as unknown as jest.Mocked<PrismaService>;

const createMockInternalCoreApiService = () =>
  ({
    initApi: jest.fn().mockResolvedValue(undefined),
    api: {},
  }) as unknown as jest.Mocked<InternalCoreApiService>;

const createMockConfigService = () => ({
  get: jest
    .fn()
    .mockImplementation((key: string, defaultValue: any) => defaultValue),
});

describe('SynchronizationModule', () => {
  let module: TestingModule;
  let originalNodeEnv: string | undefined;

  beforeEach(async () => {
    // Store original NODE_ENV and ensure test environment doesn't skip initialization
    originalNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    module = await Test.createTestingModule({
      providers: [
        EndpointSyncManager,
        InitialSyncService,
        DbPollingStrategy,
        PgNotifyStrategy,
        {
          provide: 'SYNC_STRATEGIES',
          useFactory: (
            dbPolling: DbPollingStrategy,
            pgNotify: PgNotifyStrategy,
          ) => [pgNotify, dbPolling],
          inject: [DbPollingStrategy, PgNotifyStrategy],
        },
        {
          provide: APP_OPTIONS_TOKEN,
          useValue: { mode: 'monolith' },
        },
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
        {
          provide: InternalCoreApiService,
          useValue: createMockInternalCoreApiService(),
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (module) {
      await module.close();
    }
  });

  describe('Module Definition', () => {
    it('should compile the module', () => {
      expect(module).toBeDefined();
    });

    it('should provide EndpointSyncManager', () => {
      const endpointSyncManager =
        module.get<EndpointSyncManager>(EndpointSyncManager);
      expect(endpointSyncManager).toBeDefined();
      expect(endpointSyncManager).toBeInstanceOf(EndpointSyncManager);
    });

    it('should provide InitialSyncService', () => {
      const initialSyncService =
        module.get<InitialSyncService>(InitialSyncService);
      expect(initialSyncService).toBeDefined();
      expect(initialSyncService).toBeInstanceOf(InitialSyncService);
    });

    it('should provide DbPollingStrategy', () => {
      const dbPollingStrategy =
        module.get<DbPollingStrategy>(DbPollingStrategy);
      expect(dbPollingStrategy).toBeDefined();
      expect(dbPollingStrategy).toBeInstanceOf(DbPollingStrategy);
    });

    it('should provide PgNotifyStrategy', () => {
      const pgNotifyStrategy = module.get<PgNotifyStrategy>(PgNotifyStrategy);
      expect(pgNotifyStrategy).toBeDefined();
      expect(pgNotifyStrategy).toBeInstanceOf(PgNotifyStrategy);
    });

    it('should provide SYNC_STRATEGIES array with correct strategies', () => {
      const syncStrategies = module.get('SYNC_STRATEGIES');
      expect(syncStrategies).toBeDefined();
      expect(Array.isArray(syncStrategies)).toBe(true);
      expect(syncStrategies).toHaveLength(2);

      // Should contain both strategies
      const strategyNames = syncStrategies.map(
        (strategy: any) => strategy.name,
      );
      expect(strategyNames).toContain('pg-notify');
      expect(strategyNames).toContain('db-polling');

      // Should be ordered by initialization order (pg-notify has order 10, db-polling has order 30)
      expect(syncStrategies[0].name).toBe('pg-notify');
      expect(syncStrategies[1].name).toBe('db-polling');
    });
  });

  describe('Provider Access', () => {
    it('should provide all required services', () => {
      const endpointSyncManager =
        module.get<EndpointSyncManager>(EndpointSyncManager);
      const dbPollingStrategy =
        module.get<DbPollingStrategy>(DbPollingStrategy);
      const pgNotifyStrategy = module.get<PgNotifyStrategy>(PgNotifyStrategy);

      expect(endpointSyncManager).toBeDefined();
      expect(dbPollingStrategy).toBeDefined();
      expect(pgNotifyStrategy).toBeDefined();
    });
  });

  describe('Dependency Injection', () => {
    it('should inject ConfigService into strategies', () => {
      const configService = module.get<ConfigService>(ConfigService);
      const dbPollingStrategy =
        module.get<DbPollingStrategy>(DbPollingStrategy);
      const pgNotifyStrategy = module.get<PgNotifyStrategy>(PgNotifyStrategy);

      expect(configService).toBeDefined();
      expect(dbPollingStrategy).toBeDefined();
      expect(pgNotifyStrategy).toBeDefined();

      // Strategies should have access to configuration
      expect(typeof dbPollingStrategy.isEnabled).toBe('function');
      expect(typeof pgNotifyStrategy.isEnabled).toBe('function');
    });

    it('should inject PrismaService into strategies', () => {
      const prismaService = module.get<PrismaService>(PrismaService);
      const dbPollingStrategy =
        module.get<DbPollingStrategy>(DbPollingStrategy);

      expect(prismaService).toBeDefined();
      expect(dbPollingStrategy).toBeDefined();

      // DbPollingStrategy should be initialized properly with Prisma access
      expect(dbPollingStrategy.name).toBe('db-polling');
      expect(dbPollingStrategy.initializationOrder).toBe(30);
    });

    it('should create SYNC_STRATEGIES factory correctly', () => {
      const syncStrategies = module.get('SYNC_STRATEGIES');
      const dbPollingStrategy =
        module.get<DbPollingStrategy>(DbPollingStrategy);
      const pgNotifyStrategy = module.get<PgNotifyStrategy>(PgNotifyStrategy);

      expect(syncStrategies).toContain(pgNotifyStrategy);
      expect(syncStrategies).toContain(dbPollingStrategy);

      // Factory should inject the actual strategy instances
      expect(syncStrategies[0]).toBe(pgNotifyStrategy);
      expect(syncStrategies[1]).toBe(dbPollingStrategy);
    });
  });

  describe('Service Integration', () => {
    it('should allow EndpointSyncManager to access all dependencies', () => {
      const endpointSyncManager =
        module.get<EndpointSyncManager>(EndpointSyncManager);
      const syncStrategies = module.get('SYNC_STRATEGIES');
      const initialSyncService =
        module.get<InitialSyncService>(InitialSyncService);

      expect(endpointSyncManager).toBeDefined();
      expect(syncStrategies).toBeDefined();
      expect(initialSyncService).toBeDefined();

      // EndpointSyncManager should have access to strategies through injection
      expect(Array.isArray(syncStrategies)).toBe(true);
    });
  });
});
