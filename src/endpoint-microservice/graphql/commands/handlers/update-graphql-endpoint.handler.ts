import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';

@CommandHandler(UpdateGraphqlEndpointCommand)
export class UpdateGraphqlEndpointHandler
  implements ICommandHandler<UpdateGraphqlEndpointCommand>
{
  private readonly logger = new Logger(UpdateGraphqlEndpointHandler.name);

  public constructor(private readonly service: GraphqlEndpointService) {}

  public async execute({
    endpointId,
  }: UpdateGraphqlEndpointCommand): Promise<void> {
    if (!this.service.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} does not exist`);
    }

    try {
      await this.service.stopEndpoint(endpointId);
      await this.service.runEndpoint(endpointId);
    } catch (error) {
      this.logger.error(error);
    }
  }
}
