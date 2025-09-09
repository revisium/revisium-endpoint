import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EndpointType } from '@prisma/client';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { InitialSyncService } from '../initial-sync.service';
import { EndpointChangeEvent } from '../../types';

const createMockPrismaService = () => {
  const mockFindMany = jest.fn().mockResolvedValue([]);
  return {
    endpoint: {
      findMany: mockFindMany,
    },
  } as any;
};

const createMockConfigService = () => ({
  get: jest.fn(),
});

describe('InitialSyncService', () => {
  let service: InitialSyncService;
  let prisma: any;
  let configService: jest.Mocked<ConfigService>;
  let mockChangeHandler: jest.MockedFunction<
    (event: EndpointChangeEvent) => Promise<void>
  >;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService();
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue: any) => {
        switch (key) {
          case 'SYNC_INITIAL_BATCH_SIZE':
            return defaultValue;
          default:
            return defaultValue;
        }
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InitialSyncService,
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

    service = module.get<InitialSyncService>(InitialSyncService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
    mockChangeHandler = jest.fn();

    // Reset all mocks for each test
    jest.clearAllMocks();

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performInitialSync', () => {
    it('should read configuration values from ConfigService', async () => {
      prisma.endpoint.findMany.mockResolvedValue([]);

      await service.performInitialSync(mockChangeHandler);

      expect(configService.get).toHaveBeenCalledWith(
        'SYNC_INITIAL_BATCH_SIZE',
        100,
      );
    });

    it('should process endpoints in batches', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: 'revision-1',
          isDeleted: false,
        },
        {
          id: 'endpoint-2',
          type: EndpointType.REST_API,
          createdAt: new Date(),
          revisionId: 'revision-2',
          isDeleted: false,
        },
      ];

      prisma.endpoint.findMany
        .mockResolvedValueOnce(mockEndpoints)
        .mockResolvedValueOnce([]);

      await service.performInitialSync(mockChangeHandler);

      expect(prisma.endpoint.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.endpoint.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'asc',
        },
        skip: 0,
        take: 100,
      });
      expect(prisma.endpoint.findMany).toHaveBeenNthCalledWith(2, {
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'asc',
        },
        skip: 100,
        take: 100,
      });
    });

    it('should call change handler for each endpoint', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: 'revision-1',
          isDeleted: false,
        },
        {
          id: 'endpoint-2',
          type: EndpointType.REST_API,
          createdAt: new Date(),
          revisionId: 'revision-2',
          isDeleted: false,
        },
      ];

      prisma.endpoint.findMany
        .mockResolvedValueOnce(mockEndpoints)
        .mockResolvedValueOnce([]);

      await service.performInitialSync(mockChangeHandler);

      expect(mockChangeHandler).toHaveBeenCalledTimes(2);
      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'created',
        endpointId: 'endpoint-1',
      });
      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'created',
        endpointId: 'endpoint-2',
      });
    });

    it('should handle empty database gracefully', async () => {
      prisma.endpoint.findMany.mockResolvedValue([]);

      await service.performInitialSync(mockChangeHandler);

      expect(prisma.endpoint.findMany).toHaveBeenCalledTimes(1);
      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should continue processing if individual endpoint fails', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: 'revision-1',
          isDeleted: false,
        },
        {
          id: 'endpoint-2',
          type: EndpointType.REST_API,
          createdAt: new Date(),
          revisionId: 'revision-2',
          isDeleted: false,
        },
      ];

      prisma.endpoint.findMany
        .mockResolvedValueOnce(mockEndpoints)
        .mockResolvedValueOnce([]);

      mockChangeHandler.mockImplementation(async (event) => {
        if (event.endpointId === 'endpoint-1') {
          throw new Error('Handler failed');
        }
      });

      // Should not throw
      await expect(
        service.performInitialSync(mockChangeHandler),
      ).resolves.toBeUndefined();

      expect(mockChangeHandler).toHaveBeenCalledTimes(2);
    });

    it('should respect custom batch size configuration', async () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'SYNC_INITIAL_BATCH_SIZE') return 50;
        return defaultValue;
      });

      // Create new service instance with updated config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InitialSyncService,
          {
            provide: PrismaService,
            useValue: prisma,
          },
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const newService = module.get<InitialSyncService>(InitialSyncService);

      prisma.endpoint.findMany.mockResolvedValue([]);

      await newService.performInitialSync(mockChangeHandler);

      expect(prisma.endpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should handle multiple batches correctly', async () => {
      const firstBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `endpoint-${i}`,
        type: EndpointType.GRAPHQL,
        createdAt: new Date(),
        revisionId: `revision-${i}`,
        isDeleted: false,
      }));

      const secondBatch = Array.from({ length: 50 }, (_, i) => ({
        id: `endpoint-${100 + i}`,
        type: EndpointType.REST_API,
        createdAt: new Date(),
        revisionId: `revision-${100 + i}`,
        isDeleted: false,
      }));

      prisma.endpoint.findMany
        .mockResolvedValueOnce(firstBatch)
        .mockResolvedValueOnce(secondBatch)
        .mockResolvedValueOnce([]);

      await service.performInitialSync(mockChangeHandler);

      expect(prisma.endpoint.findMany).toHaveBeenCalledTimes(3);
      expect(mockChangeHandler).toHaveBeenCalledTimes(150);

      // Check pagination parameters
      expect(prisma.endpoint.findMany).toHaveBeenNthCalledWith(1, {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        skip: 0,
        take: 100,
      });
      expect(prisma.endpoint.findMany).toHaveBeenNthCalledWith(2, {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        skip: 100,
        take: 100,
      });
      expect(prisma.endpoint.findMany).toHaveBeenNthCalledWith(3, {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        skip: 200,
        take: 100,
      });
    });

    it('should handle database query errors', async () => {
      const error = new Error('Database connection failed');
      prisma.endpoint.findMany.mockRejectedValue(error);

      await expect(
        service.performInitialSync(mockChangeHandler),
      ).rejects.toThrow('Database connection failed');

      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should use Promise.allSettled for concurrent processing within batches', async () => {
      const mockEndpoints = [
        {
          id: 'endpoint-1',
          type: EndpointType.GRAPHQL,
          createdAt: new Date(),
          revisionId: 'revision-1',
          isDeleted: false,
        },
        {
          id: 'endpoint-2',
          type: EndpointType.REST_API,
          createdAt: new Date(),
          revisionId: 'revision-2',
          isDeleted: false,
        },
      ];

      prisma.endpoint.findMany
        .mockResolvedValueOnce(mockEndpoints)
        .mockResolvedValueOnce([]);

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

      const syncPromise = service.performInitialSync(mockChangeHandler);

      // Resolve in reverse order to test concurrent processing
      secondCallResolve!();
      firstCallResolve!();

      await syncPromise;

      expect(mockChangeHandler).toHaveBeenCalledTimes(2);
    });

    it('should filter out deleted endpoints', async () => {
      prisma.endpoint.findMany.mockResolvedValue([]);

      await service.performInitialSync(mockChangeHandler);

      expect(prisma.endpoint.findMany).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'asc',
        },
        skip: 0,
        take: 100,
      });
    });

    it('should order endpoints by creation date ascending', async () => {
      prisma.endpoint.findMany.mockResolvedValue([]);

      await service.performInitialSync(mockChangeHandler);

      expect(prisma.endpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'asc',
          },
        }),
      );
    });
  });
});
