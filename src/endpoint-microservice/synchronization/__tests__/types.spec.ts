import { EndpointType } from '@prisma/client';
import { EndpointChangeEvent, DEFAULT_SYNC_CONFIG, SyncConfig } from '../types';

describe('Synchronization Types', () => {
  describe('EndpointChangeEvent', () => {
    it('should create valid endpoint change event', () => {
      const event: EndpointChangeEvent = {
        type: 'created',
        endpointId: 'test-endpoint-id',
        endpointType: EndpointType.GRAPHQL,
        revisionId: 'test-revision-id',
        version: 1,
        timestamp: new Date(),
      };

      expect(event.type).toBe('created');
      expect(event.endpointId).toBe('test-endpoint-id');
      expect(event.endpointType).toBe(EndpointType.GRAPHQL);
      expect(event.revisionId).toBe('test-revision-id');
      expect(event.version).toBe(1);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should create minimal endpoint change event', () => {
      const event: EndpointChangeEvent = {
        type: 'deleted',
        endpointId: 'test-endpoint-id',
        endpointType: EndpointType.REST_API,
        timestamp: new Date(),
      };

      expect(event.type).toBe('deleted');
      expect(event.endpointId).toBe('test-endpoint-id');
      expect(event.endpointType).toBe(EndpointType.REST_API);
      expect(event.revisionId).toBeUndefined();
      expect(event.version).toBeUndefined();
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should support all event types', () => {
      const types: EndpointChangeEvent['type'][] = [
        'created',
        'updated',
        'deleted',
      ];

      types.forEach((type) => {
        const event: EndpointChangeEvent = {
          type,
          endpointId: 'test-endpoint',
          endpointType: EndpointType.GRAPHQL,
          timestamp: new Date(),
        };

        expect(event.type).toBe(type);
      });
    });
  });

  describe('SyncConfig', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_SYNC_CONFIG).toBeDefined();
      expect(DEFAULT_SYNC_CONFIG.strategies).toBeDefined();
      expect(DEFAULT_SYNC_CONFIG.mutex).toBeDefined();
    });

    it('should have all required strategy configurations', () => {
      const config = DEFAULT_SYNC_CONFIG;

      expect(config.strategies.pgNotify).toEqual({
        enabled: true,
        maxReconnectAttempts: 5,
      });

      expect(config.strategies.nestjsMicroservice).toEqual({
        enabled: true,
      });

      expect(config.strategies.dbPolling).toEqual({
        enabled: true,
        intervalMs: 30000,
        batchSize: 50,
      });

      expect(config.strategies.fallbackCheck).toEqual({
        enabled: true,
        cacheTtlMs: 60000,
      });
    });

    it('should have valid mutex configuration', () => {
      expect(DEFAULT_SYNC_CONFIG.mutex).toEqual({
        timeoutMs: 30000,
      });
    });

    it('should allow custom configuration', () => {
      const customConfig: SyncConfig = {
        strategies: {
          pgNotify: {
            enabled: false,
            maxReconnectAttempts: 10,
          },
          nestjsMicroservice: {
            enabled: false,
          },
          dbPolling: {
            enabled: true,
            intervalMs: 60000,
            batchSize: 100,
          },
          fallbackCheck: {
            enabled: false,
            cacheTtlMs: 120000,
          },
        },
        mutex: {
          timeoutMs: 60000,
        },
      };

      expect(customConfig.strategies.pgNotify.enabled).toBe(false);
      expect(customConfig.strategies.pgNotify.maxReconnectAttempts).toBe(10);
      expect(customConfig.strategies.dbPolling.intervalMs).toBe(60000);
      expect(customConfig.mutex.timeoutMs).toBe(60000);
    });
  });
});
