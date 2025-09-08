import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EndpointType } from '@prisma/client';
import { Client, Notification } from 'pg';
import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';
import { EndpointChangeEvent } from '../types';
import { EndpointSyncStrategy } from './endpoint-sync-strategy.interface';

interface NotificationPayload {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: {
    id: string;
    type: string;
    revisionId: string;
    createdAt: string;
    isDeleted: boolean;
  };
}

export const NOTIFICATION_ENDPOINT_CHANGES = 'endpoint_changes';

export const ENDPOINT_TABLE = 'Endpoint';

@Injectable()
export class PgNotifyStrategy implements EndpointSyncStrategy, OnModuleDestroy {
  public readonly name = 'pg-notify';
  public readonly initializationOrder = 10;

  private readonly logger = new Logger(PgNotifyStrategy.name);

  private changeHandler?: (event: EndpointChangeEvent) => Promise<void>;

  private pgClient?: Client;

  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelayMs = 5000;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.maxReconnectAttempts = this.configService.get(
      'SYNC_PG_NOTIFY_MAX_RECONNECT_ATTEMPTS',
      5,
    );
  }

  public isEnabled(_: AppOptions): boolean {
    return this.configService.get('SYNC_PG_NOTIFY_ENABLED', true);
  }

  public async initialize(): Promise<void> {
    this.logger.log('Initializing PostgreSQL LISTEN/NOTIFY strategy');

    try {
      await this.connectToDatabase();
      await this.setupNotifications();
      this.logger.log('PostgreSQL LISTEN/NOTIFY strategy initialized');
    } catch (error) {
      this.logger.error(
        `Failed to initialize PostgreSQL LISTEN/NOTIFY: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.log('Shutting down PostgreSQL LISTEN/NOTIFY strategy');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.pgClient) {
      try {
        await this.pgClient.query(`UNLISTEN ${NOTIFICATION_ENDPOINT_CHANGES}`);
        await this.pgClient.end();
      } catch (error) {
        this.logger.warn(
          `Error during PostgreSQL client shutdown: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      this.pgClient = undefined;
    }

    this.reconnectAttempts = 0;
    this.logger.log('PostgreSQL LISTEN/NOTIFY strategy shut down');
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  public onEndpointChange(
    handler: (event: EndpointChangeEvent) => Promise<void>,
  ): void {
    this.changeHandler = handler;
  }

  private async connectToDatabase(): Promise<void> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    this.pgClient = new Client({
      connectionString: databaseUrl,
    });

    this.pgClient.on('error', (error) => {
      this.logger.error(
        `PostgreSQL client error: ${error.message}`,
        error.stack,
      );
      this.handleConnectionError();
    });

    this.pgClient.on('end', () => {
      this.logger.warn('PostgreSQL connection ended unexpectedly');
      this.handleConnectionError();
    });

    await this.pgClient.connect();
    this.reconnectAttempts = 0;
    this.logger.log('Connected to PostgreSQL for LISTEN/NOTIFY');
  }

  private async setupNotifications(): Promise<void> {
    if (!this.pgClient) {
      throw new Error('PostgreSQL client not connected');
    }

    // Set up notification handler
    this.pgClient.on('notification', (msg) => {
      this.handleNotification(msg);
    });

    // Listen for endpoint changes
    await this.pgClient.query(`LISTEN ${NOTIFICATION_ENDPOINT_CHANGES}`);
    this.logger.log(
      `Listening for ${NOTIFICATION_ENDPOINT_CHANGES} notifications`,
    );
  }

  private handleNotification(msg: Notification): void {
    if (
      !this.changeHandler ||
      msg.channel !== NOTIFICATION_ENDPOINT_CHANGES ||
      !msg.payload
    ) {
      return;
    }

    try {
      const payload: NotificationPayload = JSON.parse(msg.payload);

      if (payload.table !== ENDPOINT_TABLE) {
        return;
      }

      const event: EndpointChangeEvent = {
        type: this.mapActionToEventType(payload.action, payload.data),
        endpointId: payload.data.id,
        endpointType: payload.data.type as EndpointType,
        revisionId: payload.data.revisionId,
        timestamp: new Date(payload.data.createdAt),
      };

      this.logger.debug(
        `Received endpoint change notification: ${event.type} for ${event.endpointId}`,
      );

      this.changeHandler(event).catch((error) => {
        this.logger.error(
          `Failed to handle endpoint change event: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : error,
        );
      });
    } catch (error) {
      this.logger.error(
        `Error processing notification: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private mapActionToEventType(
    action: NotificationPayload['action'],
    data: NotificationPayload['data'],
  ): EndpointChangeEvent['type'] {
    switch (action) {
      case 'INSERT':
        return 'created';
      case 'UPDATE':
        if (data.isDeleted) {
          return 'deleted';
        }
        return 'updated';
      case 'DELETE':
        return 'deleted';
      default:
        return 'updated';
    }
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached, giving up`,
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelayMs * this.reconnectAttempts;

    this.logger.warn(
      `Connection lost, attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnect().catch((error) => {
        this.logger.error(
          `Reconnection attempt ${this.reconnectAttempts} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.handleConnectionError();
      });
    }, delay);
  }

  private async reconnect(): Promise<void> {
    if (this.pgClient) {
      try {
        await this.pgClient.end();
      } catch {
        // Ignore errors when closing broken connection
      }
      this.pgClient = undefined;
    }

    await this.connectToDatabase();
    await this.setupNotifications();

    this.logger.log(
      `Successfully reconnected to PostgreSQL (attempt ${this.reconnectAttempts})`,
    );
  }
}
