import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { EndpointSyncManager } from './endpoint-sync-manager.service';
import {
  DbPollingStrategy,
  PgNotifyStrategy,
  NestJSMicroserviceStrategy,
} from './strategies';

@Module({
  imports: [CqrsModule, ConfigModule, DatabaseModule],
  providers: [
    EndpointSyncManager,
    DbPollingStrategy,
    PgNotifyStrategy,
    NestJSMicroserviceStrategy,
    {
      provide: 'SYNC_STRATEGIES',
      useFactory: (
        dbPolling: DbPollingStrategy,
        pgNotify: PgNotifyStrategy,
        nestjsMs: NestJSMicroserviceStrategy,
      ) => [pgNotify, nestjsMs, dbPolling],
      inject: [DbPollingStrategy, PgNotifyStrategy, NestJSMicroserviceStrategy],
    },
  ],
  exports: [
    EndpointSyncManager,
    DbPollingStrategy,
    PgNotifyStrategy,
    NestJSMicroserviceStrategy,
  ],
})
export class SynchronizationModule {}
