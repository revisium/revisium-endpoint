import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [InternalCoreApiService, ProxyCoreApiService],
  exports: [InternalCoreApiService, ProxyCoreApiService],
})
export class CoreApiModule {}
