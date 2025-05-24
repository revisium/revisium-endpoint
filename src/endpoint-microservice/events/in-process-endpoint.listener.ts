import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EndpointType } from '@prisma/client';
import { EndpointEventHandler } from 'src/endpoint-microservice/events/endpoint-event.handler';

@Injectable()
export class InProcessEndpointListener {
  constructor(private readonly handler: EndpointEventHandler) {}

  @OnEvent('endpoint_created') onCreate(id: string) {
    return this.handler.handleCreated(id);
  }

  @OnEvent('endpoint_updated') onUpdate(id: string) {
    return this.handler.handleUpdated(id);
  }

  @OnEvent('endpoint_deleted') onDelete(payload: {
    endpointId: string;
    endpointType: EndpointType;
  }) {
    return this.handler.handleDeleted(payload);
  }
}
