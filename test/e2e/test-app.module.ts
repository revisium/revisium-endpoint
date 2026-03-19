import { Module } from '@nestjs/common';
import { CoreModule } from '@revisium/core';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';

@Module({
  imports: [
    CoreModule.forRoot({ mode: 'monolith' }),
    EndpointMicroserviceModule.forRoot({ mode: 'monolith' }),
  ],
})
export class TestAppModule {}
