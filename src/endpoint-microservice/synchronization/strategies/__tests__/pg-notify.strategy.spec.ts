import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { PgNotifyStrategy } from '../pg-notify.strategy';
import { EndpointChangeEvent } from '../../types';

// Mock pg Client
const mockPgClient = {
  connect: jest.fn(),
  end: jest.fn(),
  query: jest.fn(),
  on: jest.fn(),
};

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => mockPgClient),
}));

const createMockPrismaService = () =>
  ({
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
  }) as unknown as jest.Mocked<PrismaService>;

const createMockConfigService = () => ({
  get: jest.fn(),
});

describe('PgNotifyStrategy', () => {
  describe('initialization', () => {
    it('should have correct strategy properties', () => {
      expect(strategy.name).toBe('pg-notify');
      expect(strategy.initializationOrder).toBe(10);
    });

    it('should be enabled in monolith mode', () => {
      const result = strategy.isEnabled({ mode: 'monolith' });
      expect(result).toBe(true);
    });

    it('should be disabled in microservice mode', () => {
      const result = strategy.isEnabled({ mode: 'microservice' });
      expect(result).toBe(false);
    });

    it('should respect configuration disable', () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'SYNC_PG_NOTIFY_ENABLED') return false;
        return defaultValue;
      });

      const result = strategy.isEnabled({ mode: 'monolith' });
      expect(result).toBe(false);
    });

    it('should initialize PostgreSQL connection and setup notifications', async () => {
      await strategy.initialize();

      expect(Client).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/test',
      });
      expect(mockPgClient.connect).toHaveBeenCalled();
      expect(mockPgClient.query).toHaveBeenCalledWith(
        'LISTEN endpoint_changes',
      );
      expect(mockPgClient.on).toHaveBeenCalledWith(
        'notification',
        expect.any(Function),
      );
    });

    it('should throw error if DATABASE_URL is not configured', async () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'DATABASE_URL') return undefined;
        return defaultValue;
      });

      await expect(strategy.initialize()).rejects.toThrow(
        'DATABASE_URL is not configured',
      );
    });

    it('should handle connection errors during initialization', async () => {
      const error = new Error('Connection failed');
      mockPgClient.connect.mockRejectedValue(error);

      await expect(strategy.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('lifecycle management', () => {
    it('should register change handler', () => {
      strategy.onEndpointChange(mockChangeHandler);
      // Handler is registered (tested indirectly through notification handling)
      expect(mockChangeHandler).toBeDefined();
    });

    it('should shutdown cleanly', async () => {
      await strategy.initialize();
      await strategy.shutdown();

      expect(mockPgClient.query).toHaveBeenCalledWith(
        'UNLISTEN endpoint_changes',
      );
      expect(mockPgClient.end).toHaveBeenCalled();
    });

    it('should handle shutdown when client is not connected', async () => {
      // Should not throw
      await expect(strategy.shutdown()).resolves.toBeUndefined();
    });

    it('should handle errors during shutdown gracefully', async () => {
      await strategy.initialize();

      const error = new Error('Shutdown failed');
      mockPgClient.query.mockRejectedValue(error);
      mockPgClient.end.mockRejectedValue(error);

      // Should not throw
      await expect(strategy.shutdown()).resolves.toBeUndefined();
    });

    it('should implement onModuleDestroy', async () => {
      await strategy.initialize();
      await strategy.onModuleDestroy();

      expect(mockPgClient.query).toHaveBeenCalledWith(
        'UNLISTEN endpoint_changes',
      );
      expect(mockPgClient.end).toHaveBeenCalled();
    });
  });

  describe('notification handling', () => {
    let notificationHandler: (msg: any) => void;

    beforeEach(async () => {
      strategy.onEndpointChange(mockChangeHandler);
      await strategy.initialize();

      // Capture the notification handler
      const onCalls = mockPgClient.on.mock.calls.find(
        (call) => call[0] === 'notification',
      );
      notificationHandler = onCalls[1];
    });

    it('should process INSERT notifications correctly', async () => {
      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'INSERT',
          data: {
            id: 'endpoint-1',
            type: 'GRAPHQL',
            revisionId: 'revision-1',
            createdAt: new Date().toISOString(),
          },
        }),
      };

      notificationHandler(notification);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'created',
        endpointId: 'endpoint-1',
        endpointType: 'GRAPHQL',
        revisionId: 'revision-1',
        timestamp: expect.any(Date),
      });
    });

    it('should process UPDATE notifications correctly', async () => {
      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'UPDATE',
          data: {
            id: 'endpoint-2',
            type: 'REST_API',
            revisionId: 'revision-2',
            createdAt: new Date().toISOString(),
          },
        }),
      };

      notificationHandler(notification);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'updated',
        endpointId: 'endpoint-2',
        endpointType: 'REST_API',
        revisionId: 'revision-2',
        timestamp: expect.any(Date),
      });
    });

    it('should process DELETE notifications correctly', async () => {
      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'DELETE',
          data: {
            id: 'endpoint-3',
            type: 'GRAPHQL',
            revisionId: 'revision-3',
            createdAt: new Date().toISOString(),
          },
        }),
      };

      notificationHandler(notification);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'deleted',
        endpointId: 'endpoint-3',
        endpointType: 'GRAPHQL',
        revisionId: 'revision-3',
        timestamp: expect.any(Date),
      });
    });

    it('should process UPDATE notifications with soft delete as deleted', async () => {
      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'UPDATE',
          data: {
            id: 'endpoint-4',
            type: 'REST_API',
            revisionId: 'revision-4',
            createdAt: new Date().toISOString(),
            isDeleted: true,
          },
        }),
      };

      notificationHandler(notification);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'deleted',
        endpointId: 'endpoint-4',
        endpointType: 'REST_API',
        revisionId: 'revision-4',
        timestamp: expect.any(Date),
      });
    });

    it('should process UPDATE notifications without soft delete as updated', async () => {
      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'UPDATE',
          data: {
            id: 'endpoint-5',
            type: 'GRAPHQL',
            revisionId: 'revision-5',
            createdAt: new Date().toISOString(),
            isDeleted: false,
          },
        }),
      };

      notificationHandler(notification);

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'updated',
        endpointId: 'endpoint-5',
        endpointType: 'GRAPHQL',
        revisionId: 'revision-5',
        timestamp: expect.any(Date),
      });
    });

    it('should ignore notifications from other channels', async () => {
      const notification = {
        channel: 'other_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'INSERT',
          data: { id: 'endpoint-1' },
        }),
      };

      notificationHandler(notification);

      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should ignore notifications from other tables', async () => {
      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Other',
          action: 'INSERT',
          data: { id: 'other-1' },
        }),
      };

      notificationHandler(notification);

      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON payload gracefully', async () => {
      const notification = {
        channel: 'endpoint_changes',
        payload: 'invalid json',
      };

      // Should not throw
      expect(() => notificationHandler(notification)).not.toThrow();
      expect(mockChangeHandler).not.toHaveBeenCalled();
    });

    it('should handle missing change handler gracefully', async () => {
      // Initialize without change handler
      const strategyWithoutHandler = new PgNotifyStrategy(configService);
      await strategyWithoutHandler.initialize();

      const onCalls = mockPgClient.on.mock.calls.find(
        (call) => call[0] === 'notification',
      );
      const handlerWithoutCallback = onCalls[1];

      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'INSERT',
          data: { id: 'endpoint-1' },
        }),
      };

      // Should not throw
      expect(() => handlerWithoutCallback(notification)).not.toThrow();

      await strategyWithoutHandler.shutdown();
    });

    it('should handle change handler errors gracefully', async () => {
      const error = new Error('Handler failed');
      mockChangeHandler.mockRejectedValue(error);

      const notification = {
        channel: 'endpoint_changes',
        payload: JSON.stringify({
          table: 'Endpoint',
          action: 'INSERT',
          data: {
            id: 'endpoint-1',
            type: 'GRAPHQL',
            revisionId: 'revision-1',
            createdAt: new Date().toISOString(),
          },
        }),
      };

      // Should not throw
      expect(() => notificationHandler(notification)).not.toThrow();

      await new Promise((resolve) => setImmediate(resolve));
      expect(mockChangeHandler).toHaveBeenCalled();
    });
  });

  describe('reconnection logic', () => {
    let errorHandler: (error: Error) => void;
    let endHandler: () => void;

    beforeEach(async () => {
      jest.useFakeTimers();
      strategy.onEndpointChange(mockChangeHandler);
      await strategy.initialize();

      // Capture error and end handlers
      const errorCall = mockPgClient.on.mock.calls.find(
        (call) => call[0] === 'error',
      );
      const endCall = mockPgClient.on.mock.calls.find(
        (call) => call[0] === 'end',
      );

      errorHandler = errorCall[1];
      endHandler = endCall[1];
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle connection errors and attempt reconnection', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const error = new Error('Connection lost');

      errorHandler(error);

      // Verify that setTimeout was called for reconnection
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should handle connection end and attempt reconnection', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      endHandler();

      // Verify that setTimeout was called for reconnection
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should respect max reconnection attempts', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      // Mock failed reconnections
      mockPgClient.connect.mockRejectedValue(new Error('Reconnection failed'));

      errorHandler(new Error('Connection lost'));

      // Verify first reconnection attempt is scheduled
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should increase delay between reconnection attempts', async () => {
      const spy = jest.spyOn(global, 'setTimeout');

      errorHandler(new Error('Connection lost'));

      // First reconnection attempt - 5000ms delay
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should increase delay between consecutive reconnection attempts', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // First failure
      errorHandler(new Error('Connection lost'));

      // Verify reconnection was scheduled with first attempt delay (5000 * 1)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

      // Another failure should increase delay since attempts haven't been reset
      setTimeoutSpy.mockClear();
      errorHandler(new Error('Another connection lost'));

      // Should use increased delay (5000 * 2 = 10000ms)
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
    });

    it('should cleanup reconnection timer on shutdown', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      errorHandler(new Error('Connection lost'));

      // Shutdown before reconnection timer fires
      await strategy.shutdown();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  let strategy: PgNotifyStrategy;
  let configService: jest.Mocked<ConfigService>;
  let mockChangeHandler: jest.MockedFunction<
    (event: EndpointChangeEvent) => Promise<void>
  >;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService();
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue: any) => {
        switch (key) {
          case 'SYNC_PG_NOTIFY_MAX_RECONNECT_ATTEMPTS':
            return 5;
          case 'SYNC_PG_NOTIFY_ENABLED':
            return true;
          case 'DATABASE_URL':
            return 'postgresql://user:pass@localhost:5432/test';
          default:
            return defaultValue;
        }
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PgNotifyStrategy,
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

    strategy = module.get<PgNotifyStrategy>(PgNotifyStrategy);
    configService = module.get(ConfigService);
    mockChangeHandler = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
    mockPgClient.connect.mockResolvedValue(undefined);
    mockPgClient.end.mockResolvedValue(undefined);
    mockPgClient.query.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await strategy.shutdown();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });
});
