import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { EndpointType } from '@prisma/client';
import { EndpointEventHandler } from 'src/endpoint-microservice/events/endpoint-event.handler';

@Controller()
export class EndpointListenerController {
  constructor(private readonly handler: EndpointEventHandler) {}

  @EventPattern('endpoint_created') handleCreated(id: string) {
    return this.handler.handleCreated(id);
  }

  @EventPattern('endpoint_updated') handleUpdated(id: string) {
    return this.handler.handleUpdated(id);
  }

  @EventPattern('endpoint_deleted') handleDeleted(payload: {
    endpointId: string;
    endpointType: EndpointType;
  }) {
    return this.handler.handleDeleted(payload);
  }
}
