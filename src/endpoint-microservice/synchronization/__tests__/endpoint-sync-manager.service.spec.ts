import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { EndpointType } from 'src/__generated__/client';
import { EndpointSyncManager } from '../endpoint-sync-manager.service';
import { EndpointSyncStrategy } from '../strategies/endpoint-sync-strategy.interface';
import { EndpointChangeEvent } from '../types';
import {
  APP_OPTIONS_TOKEN,
  AppOptions,
} from 'src/endpoint-microservice/shared/app-mode';
import {
  CreateEndpointCommand,
  DeleteEndpointCommand,
  UpdateEndpointCommand,
} from 'src/endpoint-microservice/commands/impl';
import { InitialSyncService } from '../services/initial-sync.service';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';

describe('EndpointSyncManager', () => {
  let service: EndpointSyncManager;
  let commandBus: jest.Mocked<CommandBus>;
  let mockStrategy1: jest.Mocked<EndpointSyncStrategy>;
  let mockStrategy2: jest.Mocked<EndpointSyncStrategy>;
  let originalNodeEnv: string | undefined;

  const appOptions: AppOptions = { mode: 'monolith' };

  beforeEach(async () => {
    // Store original NODE_ENV and ensure test environment doesn't skip initialization
    originalNodeEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    mockStrategy1 = {
      name: 'strategy1',
      initializationOrder: 100,
      isEnabled: jest.fn().mockReturnValue(true),
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      onEndpointChange: jest.fn(),
    };

    mockStrategy2 = {
      name: 'strategy2',
      initializationOrder: 50,
      isEnabled: jest.fn().mockReturnValue(true),
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      onEndpointChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndpointSyncManager,
        {
          provide: APP_OPTIONS_TOKEN,
          useValue: appOptions,
        },
        {
          provide: 'SYNC_STRATEGIES',
          useValue: [mockStrategy1, mockStrategy2],
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: InitialSyncService,
          useValue: {
            syncAllEndpoints: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: InternalCoreApiService,
          useValue: {
            initApi: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<EndpointSyncManager>(EndpointSyncManager);
    commandBus = module.get(CommandBus);

    // Suppress logger output in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should initialize all enabled strategies sorted by priority', async () => {
      await service.onApplicationBootstrap();

      expect(mockStrategy1.isEnabled).toHaveBeenCalledWith(appOptions);
      expect(mockStrategy2.isEnabled).toHaveBeenCalledWith(appOptions);
      expect(mockStrategy1.initialize).toHaveBeenCalled();
      expect(mockStrategy2.initialize).toHaveBeenCalled();
      expect(mockStrategy1.onEndpointChange).toHaveBeenCalled();
      expect(mockStrategy2.onEndpointChange).toHaveBeenCalled();

      // @ts-ignore - accessing private property for testing
      const enabledStrategies = service.enabledStrategies;
      expect(enabledStrategies).toHaveLength(2);
      // Should be sorted by initializationOrder (lower number first)
      expect(enabledStrategies[0].name).toBe('strategy2'); // order: 50
      expect(enabledStrategies[1].name).toBe('strategy1'); // order: 100
    });

    it('should skip disabled strategies', async () => {
      mockStrategy1.isEnabled.mockReturnValue(false);

      await service.onApplicationBootstrap();

      expect(mockStrategy1.initialize).not.toHaveBeenCalled();
      expect(mockStrategy2.initialize).toHaveBeenCalled();

      // @ts-ignore - accessing private property for testing
      const enabledStrategies = service.enabledStrategies;
      expect(enabledStrategies).toHaveLength(1);
      expect(enabledStrategies[0].name).toBe('strategy2');
    });

    it('should continue initializing other strategies if one fails', async () => {
      mockStrategy1.initialize.mockRejectedValue(new Error('Strategy1 failed'));

      await service.onApplicationBootstrap();

      expect(mockStrategy1.initialize).toHaveBeenCalled();
      expect(mockStrategy2.initialize).toHaveBeenCalled();

      // @ts-ignore - accessing private property for testing
      const enabledStrategies = service.enabledStrategies;
      expect(enabledStrategies).toHaveLength(1);
      expect(enabledStrategies[0].name).toBe('strategy2');
    });
  });

  describe('onApplicationShutdown', () => {
    beforeEach(async () => {
      await service.onApplicationBootstrap();
    });

    it('should shutdown all enabled strategies', async () => {
      await service.onApplicationShutdown();

      expect(mockStrategy1.shutdown).toHaveBeenCalled();
      expect(mockStrategy2.shutdown).toHaveBeenCalled();
    });

    it('should continue shutting down other strategies if one fails', async () => {
      mockStrategy1.shutdown.mockRejectedValue(
        new Error('Strategy1 shutdown failed'),
      );

      await service.onApplicationShutdown();

      expect(mockStrategy1.shutdown).toHaveBeenCalled();
      expect(mockStrategy2.shutdown).toHaveBeenCalled();
    });
  });

  describe('handleEndpointChange', () => {
    let changeHandler: (event: EndpointChangeEvent) => Promise<void>;

    beforeEach(async () => {
      await service.onApplicationBootstrap();
      // Get the change handler that was passed to the strategy
      changeHandler = mockStrategy1.onEndpointChange.mock.calls[0][0];
    });

    it('should process endpoint created event', async () => {
      const event: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint1',
      };

      await changeHandler(event);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateEndpointCommand('endpoint1'),
      );
    });

    it('should process endpoint updated event', async () => {
      const event: EndpointChangeEvent = {
        type: 'updated',
        endpointId: 'endpoint1',
      };

      await changeHandler(event);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateEndpointCommand('endpoint1'),
      );
    });

    it('should process endpoint deleted event', async () => {
      const event: EndpointChangeEvent = {
        type: 'deleted',
        endpointId: 'endpoint1',
      };

      await changeHandler(event);

      expect(commandBus.execute).toHaveBeenCalledWith(
        new DeleteEndpointCommand('endpoint1'),
      );
    });

    it('should prevent race conditions with mutex', async () => {
      const event: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint1',
      };

      // Simulate slow command execution
      commandBus.execute.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      // Start two concurrent events for the same endpoint
      const promise1 = changeHandler(event);
      const promise2 = changeHandler(event);

      expect(
        // @ts-ignore - accessing private property for testing
        Array.from((service as any).syncMutex.keys()).some((key: string) =>
          key.includes('endpoint1'),
        ),
      ).toBe(true);

      await Promise.all([promise1, promise2]);

      // Should only execute once due to mutex
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(
        // @ts-ignore - accessing private property for testing
        Array.from((service as any).syncMutex.keys()).some((key: string) =>
          key.includes('endpoint1'),
        ),
      ).toBe(false);
    });

    it('should skip duplicate events', async () => {
      const event: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint1',
      };

      // Send the same event twice
      await changeHandler(event);
      await changeHandler(event);

      // Should only execute once due to deduplication
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should use enhanced mutex keys with endpoint type', async () => {
      const event1: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint1',
      };

      const event2: EndpointChangeEvent = {
        type: 'updated',
        endpointId: 'endpoint1', // Same ID, different type
      };

      // Both should be processed since they have different event types
      await changeHandler(event1);
      await changeHandler(event2);

      expect(commandBus.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle unknown event types gracefully', async () => {
      const event = {
        type: 'unknown' as any,
        endpointId: 'endpoint1',
        endpointType: EndpointType.GRAPHQL,
        timestamp: new Date(),
      };

      // Should not throw
      await expect(changeHandler(event)).resolves.toBeUndefined();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('should handle command execution errors', async () => {
      const event: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint1',
      };

      commandBus.execute.mockRejectedValue(new Error('Command failed'));

      // Should not throw but should log error
      await expect(changeHandler(event)).resolves.toBeUndefined();
      expect(commandBus.execute).toHaveBeenCalledWith(
        new CreateEndpointCommand('endpoint1'),
      );
    });

    it('should clean up old events from recent events cache', async () => {
      const oldEvent: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint1',
      };

      const recentEvent: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint2',
      };

      // Process old event first
      await changeHandler(oldEvent);
      // Then process recent event (this should trigger cleanup)
      await changeHandler(recentEvent);

      // Both events should be processed (not considered duplicates)
      expect(commandBus.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      await service.onApplicationBootstrap();
    });

    it('should return enabled strategies', () => {
      // @ts-ignore - accessing private property for testing
      const strategies = service.enabledStrategies;
      expect(strategies).toHaveLength(2);
      expect(strategies.map((s) => s.name)).toEqual(['strategy2', 'strategy1']);
    });

    it('should report pending sync status', async () => {
      const event: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'endpoint1',
      };

      // Mock slow command execution
      commandBus.execute.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const changeHandler = mockStrategy1.onEndpointChange.mock.calls[0][0];
      const syncPromise = changeHandler(event);

      expect(
        // @ts-ignore - accessing private property for testing
        Array.from((service as any).syncMutex.keys()).some((key: string) =>
          key.includes('endpoint1'),
        ),
      ).toBe(true);
      expect(
        // @ts-ignore - accessing private property for testing
        Array.from(service.syncMutex.keys()).some((key) =>
          key.includes('endpoint2'),
        ),
      ).toBe(false);

      await syncPromise;

      expect(
        // @ts-ignore - accessing private property for testing
        Array.from((service as any).syncMutex.keys()).some((key: string) =>
          key.includes('endpoint1'),
        ),
      ).toBe(false);
    });
  });
});
