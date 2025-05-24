import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EndpointEventHandler } from 'src/endpoint-microservice/events/endpoint-event.handler';
import { EndpointListenerController } from 'src/endpoint-microservice/events/endpoint-listener.controller';
import { InProcessEndpointListener } from 'src/endpoint-microservice/events/in-process-endpoint.listener';

@Module({
  imports: [CqrsModule],
  providers: [EndpointEventHandler, InProcessEndpointListener],
  controllers: [EndpointListenerController],
})
export class EndpointEventsModule {}
