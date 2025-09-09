import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateRestapiEndpointCommand } from 'src/endpoint-microservice/restapi/commands/impl';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';

@CommandHandler(UpdateRestapiEndpointCommand)
export class UpdateRestapiEndpointHandler
  implements ICommandHandler<UpdateRestapiEndpointCommand>
{
  public constructor(private readonly service: RestapiEndpointService) {}

  public async execute({
    endpointId,
  }: UpdateRestapiEndpointCommand): Promise<void> {
    await this.service.stopEndpoint(endpointId);
    await this.service.runEndpoint(endpointId);
  }
}
