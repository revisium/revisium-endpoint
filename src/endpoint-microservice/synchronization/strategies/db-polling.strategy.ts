import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Endpoint } from '@prisma/client';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';
import { EndpointChangeEvent } from '../types';
import { EndpointSyncStrategy } from './endpoint-sync-strategy.interface';

@Injectable()
export class DbPollingStrategy implements EndpointSyncStrategy {
  public readonly name = 'db-polling';
  public readonly initializationOrder = 30;

  private readonly logger = new Logger(DbPollingStrategy.name);

  private changeHandler?: (event: EndpointChangeEvent) => Promise<void>;

  private pollingInterval?: NodeJS.Timeout;
  private lastSyncTimestamp = new Date();
  private readonly batchSize: number;
  private readonly intervalMs: number;
  private isPolling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.intervalMs = this.configService.get(
      'SYNC_DB_POLLING_INTERVAL_MS',
      30000,
    );
    this.batchSize = this.configService.get('SYNC_DB_POLLING_BATCH_SIZE', 50);
  }

  public isEnabled(_: AppOptions): boolean {
    return this.configService.get('SYNC_DB_POLLING_ENABLED', true);
  }

  public async initialize(): Promise<void> {
    this.logger.log(
      `Initializing database polling with ${this.intervalMs}ms interval`,
    );

    // Set initial sync timestamp to now to avoid processing all historical records
    this.lastSyncTimestamp = new Date();

    this.pollingInterval = setInterval(() => {
      this.pollForChanges().catch((error) => {
        this.logger.error(
          `Database polling failed: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : error,
        );
      });
    }, this.intervalMs);

    this.logger.log('Database polling strategy initialized');
  }

  public async shutdown(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      this.logger.log('Database polling strategy shut down');
    }
  }

  public onEndpointChange(
    handler: (event: EndpointChangeEvent) => Promise<void>,
  ): void {
    this.changeHandler = handler;
  }

  private async pollForChanges(): Promise<void> {
    if (!this.changeHandler) {
      return;
    }

    if (this.isPolling) return;

    this.isPolling = true;

    try {
      const currentTimestamp = new Date();

      const modifiedEndpoints = await this.getEndpoints();

      if (modifiedEndpoints.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${modifiedEndpoints.length} modified endpoints during polling`,
      );

      await this.processEndpoints(modifiedEndpoints);

      const latestTimestamp =
        modifiedEndpoints[modifiedEndpoints.length - 1].createdAt;
      this.lastSyncTimestamp = new Date(
        Math.max(latestTimestamp.getTime(), currentTimestamp.getTime()),
      );

      this.logger.log(
        `Completed polling cycle, processed ${modifiedEndpoints.length} endpoints`,
      );
    } catch (error) {
      this.logger.error(
        `Error during database polling: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : error,
      );
    } finally {
      this.isPolling = false;
    }
  }

  private async processEndpoints(endpoints: Endpoint[]) {
    const processPromises = endpoints.map(async (endpoint) => {
      const event: EndpointChangeEvent = {
        type: 'updated',
        endpointId: endpoint.id,
      };

      try {
        await this.changeHandler?.(event);
      } catch (error) {
        this.logger.error(
          `Failed to process endpoint ${endpoint.id}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : error,
        );
      }
    });

    await Promise.allSettled(processPromises);
  }

  private getEndpoints() {
    return this.prisma.endpoint.findMany({
      where: {
        createdAt: {
          gt: this.lastSyncTimestamp,
        },
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: this.batchSize,
    });
  }
}
