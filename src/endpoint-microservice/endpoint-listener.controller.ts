import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EventPattern } from '@nestjs/microservices';
import { EndpointType } from '@prisma/client';
import {
  CreateEndpointCommand,
  DeleteEndpointCommand,
  UpdateEndpointCommand,
} from 'src/endpoint-microservice/commands/impl';

@Controller()
export class EndpointListenerController {
  constructor(private commandBus: CommandBus) {}

  @EventPattern('endpoint_created')
  public handleEndpointCreated(endpointId: string) {
    return this.commandBus.execute(new CreateEndpointCommand(endpointId));
  }

  @EventPattern('endpoint_deleted')
  public handleEndpointDeleted({
    endpointId,
    endpointType,
  }: {
    endpointId: string;
    endpointType: EndpointType;
  }) {
    return this.commandBus.execute(
      new DeleteEndpointCommand(endpointId, endpointType),
    );
  }

  @EventPattern('endpoint_updated')
  public handleEndpointUpdated(endpointId: string) {
    return this.commandBus.execute(new UpdateEndpointCommand(endpointId));
  }
}
