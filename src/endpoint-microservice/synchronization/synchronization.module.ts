import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EndpointSyncManager } from './endpoint-sync-manager.service';

@Module({
  imports: [CqrsModule],
  providers: [
    EndpointSyncManager,
    {
      provide: 'SYNC_STRATEGIES',
      useFactory: () => [],
      inject: [],
    },
  ],
  exports: [EndpointSyncManager],
})
export class SynchronizationModule {}
