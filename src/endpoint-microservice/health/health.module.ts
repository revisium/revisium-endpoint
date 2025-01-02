import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { CoreApiModule } from 'src/endpoint-microservice/core-api/core-api.module';
import { DatabaseModule } from 'src/endpoint-microservice/database/database.module';
import { CoreApiCheck } from 'src/endpoint-microservice/health/core-api.check';
import { HealthController } from 'src/endpoint-microservice/health/health.controller';
import { CoreApiIndicator } from 'src/endpoint-microservice/health/indicators/core-api.health';
import { NotificationCheck } from 'src/endpoint-microservice/health/notification.check';
import { DatabaseCheck } from 'src/endpoint-microservice/health/database-check.service';

@Module({
  imports: [DatabaseModule, ConfigModule, CoreApiModule, TerminusModule],
  controllers: [HealthController],
  providers: [DatabaseCheck, NotificationCheck, CoreApiIndicator, CoreApiCheck],
})
export class HealthModule {}
