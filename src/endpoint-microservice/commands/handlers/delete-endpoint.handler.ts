import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteEndpointCommand } from 'src/endpoint-microservice/commands/impl';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';

@CommandHandler(DeleteEndpointCommand)
export class DeleteEndpointHandler
  implements ICommandHandler<DeleteEndpointCommand>
{
  private readonly logger = new Logger(DeleteEndpointHandler.name);

  constructor(
    private readonly graphqlEndpointService: GraphqlEndpointService,
    private readonly restapiEndpointService: RestapiEndpointService,
  ) {}

  public async execute({ endpointId }: DeleteEndpointCommand): Promise<void> {
    if (this.graphqlEndpointService.existEndpoint(endpointId)) {
      await this.graphqlEndpointService.stopEndpoint(endpointId);
    } else if (this.restapiEndpointService.existEndpoint(endpointId)) {
      await this.restapiEndpointService.stopEndpoint(endpointId);
    } else {
      this.logger.warn(
        `Endpoint ${endpointId} not found in in-memory services`,
      );
    }
  }
}
