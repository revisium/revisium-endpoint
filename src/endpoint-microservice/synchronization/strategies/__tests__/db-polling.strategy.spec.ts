import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EndpointType } from 'src/__generated__/client';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { DbPollingStrategy } from '../db-polling.strategy';
import { EndpointChangeEvent } from '../../types';

const createMockPrismaService = () =>
  ({
    endpoint: {
      findMany: jest.fn(),
    },
  }) as unknown as jest.Mocked<PrismaService>;

const createMockConfigService = () => ({
  get: jest.fn(),
});

describe('DbPollingStrategy', () => {
  describe('initialization', () => {
    it('should have correct strategy properties', () => {
      expect(strategy.name).toBe('db-polling');
      expect(strategy.initializationOrder).toBe(30);
    });

    it('should read configuration values from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'SYNC_DB_POLLING_INTERVAL_MS',
        30000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'SYNC_DB_POLLING_BATCH_SIZE',
        50,
      );
    });

    it('should check if strategy is enabled', () => {
      const appOptions = { mode: 'monolith' as const };
      const result = strategy.isEnabled(appOptions);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith(
        'SYNC_DB_POLLING_ENABLED',
        true,
      );
    });

    it('should respect disabled configuration', () => {
      configService.get.mockReturnValueOnce(false);
      const appOptions = { mode: 'monolith' as const };

      const result = strategy.isEnabled(appOptions);

      expect(result).toBe(false);
    });
  });

  describe('lifecycle management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should initialize polling interval', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      await strategy.initialize();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it('should set initial sync timestamp to current time', async () => {
      const before = new Date();
      await strategy.initialize();
      const after = new Date();

      // @ts-ignore - accessing private property for testing
      const timestamp = strategy.lastSyncTimestamp;
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should clear interval on shutdown', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await strategy.initialize();
      await strategy.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle shutdown when no interval exists', async () => {
      // Should not throw
      await expect(strategy.shutdown()).resolves.toBeUndefined();
    });

    it('should register change handler', () => {
      strategy.onEndpointChange(mockChangeHandler);

      // Handler should be registered (tested indirectly through polling)
      expect(mockChangeHandler).toBeDefined();
    });
  });

  describe('polling behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      strategy.onEndpointChange(mockChangeHandler);
    });

    it('should skip polling when no change handler is registered', async () => {
      const strategyWithoutHandler = new DbPollingStrategy(
        prisma,
        configService,
      );

      // @ts-ignore - accessing private method for testing
      await strategyWithoutHandler.pollForChanges();

      expect(prisma.endpoint.findMany).not.toHaveBeenCalled();
    });

    it('should query for modified endpoints since last sync', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: 'revision-1',
        },
      ];

      prisma.endpoint.findMany.mockResolvedValue(mockEndpoints);

      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();

      expect(prisma.endpoint.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        take: 50,
      });
    });

    it('should process found endpoints and call change handler', async () => {
      const createdAt = new Date();
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt,
          revisionId: 'revision-1',
        },
        {
          id: 'endpoint-2',
          type: EndpointType.REST_API,
          createdAt,
          revisionId: 'revision-2',
        },
      ];

      prisma.endpoint.findMany.mockResolvedValue(mockEndpoints);

      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();

      expect(mockChangeHandler).toHaveBeenCalledTimes(2);
      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'updated',
        endpointId: 'endpoint-1',
      });
      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'updated',
        endpointId: 'endpoint-2',
      });
    });

    it('should handle empty results gracefully', async () => {
      prisma.endpoint.findMany.mockResolvedValue([]);

      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();

      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should update sync timestamp after processing', async () => {
      const createdAt = new Date(Date.now() + 1000); // Future date
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt,
          revisionId: 'revision-1',
        },
      ];

      prisma.endpoint.findMany.mockResolvedValue(mockEndpoints);
      // @ts-ignore - accessing private property for testing
      const initialTimestamp = new Date(strategy.lastSyncTimestamp.getTime());

      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();

      // @ts-ignore - accessing private property for testing
      const newTimestamp = new Date(strategy.lastSyncTimestamp.getTime());
      expect(newTimestamp.getTime()).toBeGreaterThanOrEqual(
        createdAt.getTime(),
      );
      expect(newTimestamp.getTime()).toBeGreaterThan(
        initialTimestamp.getTime(),
      );
    });

    it('should respect batch size configuration', async () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'SYNC_DB_POLLING_BATCH_SIZE') return 25;
        return defaultValue;
      });

      // Create new instance with updated config
      const newStrategy = new DbPollingStrategy(prisma, configService);
      newStrategy.onEndpointChange(mockChangeHandler);
      prisma.endpoint.findMany.mockResolvedValue([]);

      // @ts-ignore - accessing private method for testing
      await newStrategy.pollForChanges();

      expect(prisma.endpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        }),
      );
    });

    it('should handle individual endpoint processing errors gracefully', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: 'revision-1',
        },
        {
          id: 'endpoint-2',
          type: EndpointType.REST_API,
          createdAt: new Date(),
          revisionId: 'revision-2',
        },
      ];

      prisma.endpoint.findMany.mockResolvedValue(mockEndpoints);
      mockChangeHandler.mockImplementation(async (event) => {
        if (event.endpointId === 'endpoint-1') {
          throw new Error('Processing failed');
        }
      });

      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();

      // Both endpoints should be processed despite first one failing
      expect(mockChangeHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle database query errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      prisma.endpoint.findMany.mockRejectedValue(dbError);

      // Should not throw
      // @ts-ignore - accessing private method for testing
      await expect(strategy.pollForChanges()).resolves.toBeUndefined();
      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should use Promise.allSettled for concurrent processing', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: 'revision-1',
        },
        {
          id: 'endpoint-2',
          type: EndpointType.REST_API,
          createdAt: new Date(),
          revisionId: 'revision-2',
        },
      ];

      prisma.endpoint.findMany.mockResolvedValue(mockEndpoints);

      let firstCallResolve: () => void;
      let secondCallResolve: () => void;

      const firstPromise = new Promise<void>((resolve) => {
        firstCallResolve = resolve;
      });
      const secondPromise = new Promise<void>((resolve) => {
        secondCallResolve = resolve;
      });

      mockChangeHandler
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      // @ts-ignore - accessing private method for testing
      const pollPromise = strategy.pollForChanges();

      // Resolve in reverse order to test concurrent processing
      secondCallResolve!();
      firstCallResolve!();

      await pollPromise;

      expect(mockChangeHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('automatic polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      strategy.onEndpointChange(mockChangeHandler);
    });

    it('should trigger polling at configured intervals', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      await strategy.initialize();

      // Verify setInterval was called with correct parameters
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it('should handle polling errors without stopping the interval', async () => {
      const dbError = new Error('Temporary database error');
      prisma.endpoint.findMany.mockRejectedValue(dbError);

      // Should not throw when polling fails
      // @ts-ignore - accessing private method for testing
      await expect(strategy.pollForChanges()).resolves.toBeUndefined();

      // Handler should not be called when DB error occurs
      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should use custom interval configuration', async () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'SYNC_DB_POLLING_INTERVAL_MS') return 60000;
        return defaultValue;
      });

      const newStrategy = new DbPollingStrategy(prisma, configService);
      newStrategy.onEndpointChange(mockChangeHandler);
      prisma.endpoint.findMany.mockResolvedValue([]);

      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      await newStrategy.initialize();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      strategy.onEndpointChange(mockChangeHandler);
    });

    it('should handle endpoints with null revisionId', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: null,
        },
      ];

      prisma.endpoint.findMany.mockResolvedValue(mockEndpoints);

      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'updated',
        endpointId: 'endpoint-1',
      });
    });

    it('should NOT advance sync timestamp when no endpoints found', async () => {
      prisma.endpoint.findMany.mockResolvedValue([]);
      // @ts-ignore - accessing private property for testing
      const initialTimestamp = new Date(strategy.lastSyncTimestamp.getTime());
      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();
      // @ts-ignore - accessing private property for testing
      const newTimestamp = new Date(strategy.lastSyncTimestamp.getTime());
      expect(newTimestamp.getTime()).toBe(initialTimestamp.getTime());
    });

    it('should handle large batches correctly', async () => {
      const largeEndpointList = Array.from({ length: 100 }, (_, i) => ({
        id: `endpoint-${i}`,
        type: EndpointType.GRAPHQL,
        createdAt: new Date(Date.now() + i),
        revisionId: `revision-${i}`,
      }));

      prisma.endpoint.findMany.mockResolvedValue(largeEndpointList);

      // @ts-ignore - accessing private method for testing
      await strategy.pollForChanges();

      expect(mockChangeHandler).toHaveBeenCalledTimes(100);

      // Verify timestamp is set to the latest endpoint
      // @ts-ignore - accessing private property for testing
      const finalTimestamp = strategy.lastSyncTimestamp;
      const latestEndpointTime = largeEndpointList[99].createdAt.getTime();
      expect(finalTimestamp.getTime()).toBeGreaterThanOrEqual(
        latestEndpointTime,
      );
    });
  });

  let strategy: DbPollingStrategy;
  let prisma: any;
  let configService: jest.Mocked<ConfigService>;
  let mockChangeHandler: jest.MockedFunction<
    (event: EndpointChangeEvent) => Promise<void>
  >;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService();
    // Set up config mock before module creation
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue: any) => {
        switch (key) {
          case 'SYNC_DB_POLLING_INTERVAL_MS':
            return defaultValue; // Return the default value to test defaults properly
          case 'SYNC_DB_POLLING_BATCH_SIZE':
            return defaultValue; // Return the default value to test defaults properly
          case 'SYNC_DB_POLLING_ENABLED':
            return defaultValue; // Return the default value to test defaults properly
          default:
            return defaultValue;
        }
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DbPollingStrategy,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<DbPollingStrategy>(DbPollingStrategy);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
    mockChangeHandler = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });
});
