import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { EndpointSyncManager } from './endpoint-sync-manager.service';
import { DbPollingStrategy } from './strategies/db-polling.strategy';

@Module({
  imports: [CqrsModule, ConfigModule, DatabaseModule],
  providers: [
    EndpointSyncManager,
    DbPollingStrategy,
    {
      provide: 'SYNC_STRATEGIES',
      useFactory: (dbPolling: DbPollingStrategy) => [dbPolling],
      inject: [DbPollingStrategy],
    },
  ],
  exports: [EndpointSyncManager, DbPollingStrategy],
})
export class SynchronizationModule {}
