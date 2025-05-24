import { DynamicModule, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EndpointEventHandler } from 'src/endpoint-microservice/events/endpoint-event.handler';
import { EndpointListenerController } from 'src/endpoint-microservice/events/endpoint-listener.controller';
import { InProcessEndpointListener } from 'src/endpoint-microservice/events/in-process-endpoint.listener';
import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';

@Module({})
export class EndpointEventsModule {
  static forRoot(options: AppOptions): DynamicModule {
    const isMonolith = options.mode === 'monolith';

    return {
      module: EndpointEventsModule,
      imports: [CqrsModule],
      providers: [
        EndpointEventHandler,
        ...(isMonolith ? [InProcessEndpointListener] : []),
      ],
      controllers: isMonolith ? [] : [EndpointListenerController],
    };
  }
}
