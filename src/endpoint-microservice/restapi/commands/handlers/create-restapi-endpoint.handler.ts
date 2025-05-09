import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateRestapiEndpointCommand } from 'src/endpoint-microservice/restapi/commands/impl';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';

@CommandHandler(CreateRestapiEndpointCommand)
export class CreateRestapiEndpointHandler
  implements ICommandHandler<CreateRestapiEndpointCommand>
{
  private readonly logger = new Logger(CreateRestapiEndpointHandler.name);

  public constructor(private readonly service: RestapiEndpointService) {}

  public async execute({
    endpointId,
  }: CreateRestapiEndpointCommand): Promise<void> {
    if (this.service.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} already exists`);
    }

    try {
      await this.service.runEndpoint(endpointId);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
