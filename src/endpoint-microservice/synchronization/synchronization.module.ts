import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { EndpointSyncManager } from './endpoint-sync-manager.service';
import { InitialSyncService } from './services/initial-sync.service';
import { DbPollingStrategy, PgNotifyStrategy } from './strategies';

@Module({
  imports: [CqrsModule, ConfigModule, CoreApiModule, DatabaseModule],
  providers: [
    EndpointSyncManager,
    InitialSyncService,
    DbPollingStrategy,
    PgNotifyStrategy,
    {
      provide: 'SYNC_STRATEGIES',
      useFactory: (
        dbPolling: DbPollingStrategy,
        pgNotify: PgNotifyStrategy,
      ) => [pgNotify, dbPolling],
      inject: [DbPollingStrategy, PgNotifyStrategy],
    },
  ],
  exports: [EndpointSyncManager, DbPollingStrategy, PgNotifyStrategy],
})
export class SynchronizationModule {}
