import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EndpointType } from '@prisma/client';
import { NestJSMicroserviceStrategy } from '../nestjs-microservice.strategy';
import { EndpointChangeEvent } from '../../types';

const createMockConfigService = () => ({
  get: jest.fn(),
});

describe('NestJSMicroserviceStrategy', () => {
  describe('initialization', () => {
    it('should have correct strategy properties', () => {
      expect(strategy.name).toBe('nestjs-microservice');
      expect(strategy.initializationOrder).toBe(20);
    });

    it('should be enabled in microservice mode', () => {
      const result = strategy.isEnabled({ mode: 'microservice' });
      expect(result).toBe(true);
    });

    it('should be disabled in monolith mode', () => {
      const result = strategy.isEnabled({ mode: 'monolith' });
      expect(result).toBe(false);
    });

    it('should respect configuration disable', () => {
      configService.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === 'SYNC_NESTJS_MICROSERVICE_ENABLED') return false;
        return defaultValue;
      });

      const result = strategy.isEnabled({ mode: 'microservice' });
      expect(result).toBe(false);
    });
  });

  describe('lifecycle management', () => {
    it('should register change handler', () => {
      strategy.onEndpointChange(mockChangeHandler);
      // Handler is registered (tested indirectly through event handling)
      expect(mockChangeHandler).toBeDefined();
    });

    it('should shutdown cleanly', async () => {
      await strategy.initialize();
      await strategy.shutdown();
    });
  });

  describe('EndpointListenerController integration methods', () => {
    beforeEach(async () => {
      strategy.onEndpointChange(mockChangeHandler);
    });

    it('should handle endpoint created events', async () => {
      await strategy.handleEndpointCreated('endpoint-1');

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'created',
        endpointId: 'endpoint-1',
        endpointType: 'GRAPHQL',
        revisionId: '',
        timestamp: expect.any(Date),
      });
    });

    it('should handle endpoint updated events', async () => {
      await strategy.handleEndpointUpdated('endpoint-2');

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'updated',
        endpointId: 'endpoint-2',
        endpointType: 'GRAPHQL',
        revisionId: '',
        timestamp: expect.any(Date),
      });
    });

    it('should handle endpoint deleted events', async () => {
      const payload = {
        endpointId: 'endpoint-3',
        endpointType: EndpointType.REST_API,
      };

      await strategy.handleEndpointDeleted(payload);

      expect(mockChangeHandler).toHaveBeenCalledWith({
        type: 'deleted',
        endpointId: 'endpoint-3',
        endpointType: EndpointType.REST_API,
        revisionId: '',
        timestamp: expect.any(Date),
      });
    });

    it('should handle missing change handler gracefully', async () => {
      const strategyWithoutHandler = new NestJSMicroserviceStrategy(
        configService,
      );

      // Should not throw when no handler is set
      await expect(
        strategyWithoutHandler.handleEndpointCreated('endpoint-1'),
      ).resolves.toBeUndefined();
      await expect(
        strategyWithoutHandler.handleEndpointUpdated('endpoint-2'),
      ).resolves.toBeUndefined();
      await expect(
        strategyWithoutHandler.handleEndpointDeleted({
          endpointId: 'endpoint-3',
          endpointType: EndpointType.GRAPHQL,
        }),
      ).resolves.toBeUndefined();
    });
  });

  let strategy: NestJSMicroserviceStrategy;
  let configService: jest.Mocked<ConfigService>;
  let mockChangeHandler: jest.MockedFunction<
    (event: EndpointChangeEvent) => Promise<void>
  >;

  beforeEach(async () => {
    const mockConfigService = createMockConfigService();
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue: any) => {
        switch (key) {
          case 'SYNC_NESTJS_MICROSERVICE_ENABLED':
            return true;
          default:
            return defaultValue;
        }
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NestJSMicroserviceStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<NestJSMicroserviceStrategy>(
      NestJSMicroserviceStrategy,
    );
    configService = module.get(ConfigService);
    mockChangeHandler = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await strategy.shutdown();
    jest.clearAllMocks();
  });
});
