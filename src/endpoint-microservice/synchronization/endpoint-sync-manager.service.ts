import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  CreateEndpointCommand,
  DeleteEndpointCommand,
  UpdateEndpointCommand,
} from 'src/endpoint-microservice/commands/impl';
import {
  APP_OPTIONS_TOKEN,
  AppOptions,
} from 'src/endpoint-microservice/shared/app-mode';
import { EndpointSyncStrategy } from './strategies/endpoint-sync-strategy.interface';
import { EndpointChangeEvent } from './types';

@Injectable()
export class EndpointSyncManager
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(EndpointSyncManager.name);
  private readonly syncMutex = new Map<string, Promise<void>>();
  private readonly recentEvents = new Map<string, Date>();
  private readonly enabledStrategies: EndpointSyncStrategy[] = [];

  constructor(
    @Inject(APP_OPTIONS_TOKEN) private readonly appOptions: AppOptions,
    @Inject('SYNC_STRATEGIES')
    private readonly syncStrategies: EndpointSyncStrategy[],
    private readonly commandBus: CommandBus,
  ) {}

  async onApplicationBootstrap() {
    await this.initializeSyncStrategies();
    this.logger.log(
      `Initialized ${this.enabledStrategies.length} synchronization strategies`,
    );
  }

  async onApplicationShutdown() {
    this.logger.log('Shutting down synchronization strategies...');

    const shutdownPromises = this.enabledStrategies.map(async (strategy) => {
      try {
        await strategy.shutdown();
        this.logger.log(`Shut down strategy: ${strategy.name}`);
      } catch (error) {
        this.logger.error(
          `Error shutting down strategy ${strategy.name}:`,
          error,
        );
      }
    });

    await Promise.all(shutdownPromises);
    this.syncMutex.clear();
    this.recentEvents.clear();
    this.logger.log('All synchronization strategies shut down');
  }

  private async initializeSyncStrategies() {
    // Filter and sort strategies by priority (higher priority first)
    const applicableStrategies = this.syncStrategies
      .filter((strategy) => strategy.isEnabled(this.appOptions))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      try {
        await strategy.initialize();
        strategy.onEndpointChange(this.handleEndpointChange.bind(this));
        this.enabledStrategies.push(strategy);
        this.logger.log(
          `Initialized strategy: ${strategy.name} (priority: ${strategy.priority})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to initialize strategy ${strategy.name}:`,
          error,
        );
      }
    }
  }

  private handleEndpointChange = async (
    changeEvent: EndpointChangeEvent,
  ): Promise<void> => {
    // Skip duplicate events
    if (this.isDuplicateEvent(changeEvent)) {
      this.logger.debug(
        `Skipping duplicate event: ${changeEvent.type}:${changeEvent.endpointId}`,
      );
      return;
    }

    // Prevent race conditions with mutex
    const mutexKey = `${changeEvent.type}:${changeEvent.endpointId}`;

    if (this.syncMutex.has(mutexKey)) {
      this.logger.debug(`Event already being processed: ${mutexKey}`);
      await this.syncMutex.get(mutexKey);
      return;
    }

    const syncPromise = this.processSyncEvent(changeEvent);
    this.syncMutex.set(mutexKey, syncPromise);

    try {
      await syncPromise;
    } catch (error) {
      this.logger.error(`Failed to process sync event ${mutexKey}:`, error);
    } finally {
      this.syncMutex.delete(mutexKey);
    }
  };

  private async processSyncEvent(event: EndpointChangeEvent): Promise<void> {
    this.logger.log(`Processing endpoint ${event.type}: ${event.endpointId}`);

    try {
      switch (event.type) {
        case 'created':
          await this.commandBus.execute(
            new CreateEndpointCommand(event.endpointId),
          );
          break;
        case 'updated':
          await this.commandBus.execute(
            new UpdateEndpointCommand(event.endpointId),
          );
          break;
        case 'deleted':
          await this.commandBus.execute(
            new DeleteEndpointCommand(event.endpointId, event.endpointType),
          );
          break;
        default:
          this.logger.warn(`Unknown event type: ${event.type}`);
      }

      this.logger.log(
        `Successfully processed endpoint ${event.type}: ${event.endpointId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing endpoint ${event.type} ${event.endpointId}:`,
        error,
      );
      throw error;
    }
  }

  private isDuplicateEvent(event: EndpointChangeEvent): boolean {
    const eventKey = `${event.type}:${event.endpointId}:${event.timestamp.getTime()}`;
    const lastSeen = this.recentEvents.get(eventKey);

    if (lastSeen && Date.now() - lastSeen.getTime() < 5000) {
      return true;
    }

    this.recentEvents.set(eventKey, new Date());

    // Clean up old events (older than 1 minute)
    const cutoff = Date.now() - 60000;
    for (const [key, timestamp] of this.recentEvents.entries()) {
      if (timestamp.getTime() < cutoff) {
        this.recentEvents.delete(key);
      }
    }

    return false;
  }
}
