import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteRestapiEndpointCommand } from 'src/endpoint-microservice/restapi/commands/impl';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';

@CommandHandler(DeleteRestapiEndpointCommand)
export class DeleteRestapiEndpointHandler
  implements ICommandHandler<DeleteRestapiEndpointCommand>
{
  public constructor(private service: RestapiEndpointService) {}

  public async execute({
    endpointId,
  }: DeleteRestapiEndpointCommand): Promise<void> {
    if (!this.service.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} does not exist`);
    }

    await this.service.stopEndpoint(endpointId);
  }
}
