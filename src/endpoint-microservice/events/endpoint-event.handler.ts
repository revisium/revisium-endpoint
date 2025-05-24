import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EndpointType } from '@prisma/client';
import {
  CreateEndpointCommand,
  DeleteEndpointCommand,
  UpdateEndpointCommand,
} from 'src/endpoint-microservice/commands/impl';

@Injectable()
export class EndpointEventHandler {
  constructor(private readonly commandBus: CommandBus) {}

  public handleCreated(id: string) {
    return this.commandBus.execute(new CreateEndpointCommand(id));
  }

  public handleUpdated(id: string) {
    return this.commandBus.execute(new UpdateEndpointCommand(id));
  }

  public handleDeleted(input: {
    endpointId: string;
    endpointType: EndpointType;
  }) {
    return this.commandBus.execute(
      new DeleteEndpointCommand(input.endpointId, input.endpointType),
    );
  }
}
