import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';

@CommandHandler(DeleteGraphqlEndpointCommand)
export class DeleteGraphqlEndpointHandler implements ICommandHandler<DeleteGraphqlEndpointCommand> {
  public constructor(private readonly service: GraphqlEndpointService) {}

  public async execute({
    endpointId,
  }: DeleteGraphqlEndpointCommand): Promise<void> {
    if (!this.service.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} does not exist`);
    }

    await this.service.stopEndpoint(endpointId);
  }
}
