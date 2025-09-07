import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import { EndpointSyncManager } from '../endpoint-sync-manager.service';
import { APP_OPTIONS_TOKEN } from 'src/endpoint-microservice/shared/app-mode';

describe('SynchronizationModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        EndpointSyncManager,
        {
          provide: APP_OPTIONS_TOKEN,
          useValue: { mode: 'monolith' },
        },
        {
          provide: 'SYNC_STRATEGIES',
          useValue: [],
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
    await module?.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide EndpointSyncManager', () => {
    const syncManager = module.get<EndpointSyncManager>(EndpointSyncManager);
    expect(syncManager).toBeDefined();
    expect(syncManager).toBeInstanceOf(EndpointSyncManager);
  });

  it('should provide SYNC_STRATEGIES', () => {
    const strategies = module.get('SYNC_STRATEGIES');
    expect(strategies).toBeDefined();
    expect(Array.isArray(strategies)).toBe(true);
    expect(strategies).toHaveLength(0);
  });

  it('should provide EndpointSyncManager', () => {
    const syncManager = module.get<EndpointSyncManager>(EndpointSyncManager);
    expect(syncManager).toBeDefined();
    expect(syncManager).toBeInstanceOf(EndpointSyncManager);
  });
});
