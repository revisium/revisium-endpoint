import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';

@CommandHandler(CreateGraphqlEndpointCommand)
export class CreateGraphqlEndpointHandler
  implements ICommandHandler<CreateGraphqlEndpointCommand>
{
  public constructor(private readonly service: GraphqlEndpointService) {}

  public async execute({
    endpointId,
  }: CreateGraphqlEndpointCommand): Promise<void> {
    if (this.service.existEndpoint(endpointId)) {
      throw new Error(`${endpointId} already exists`);
    }

    await this.service.runEndpoint(endpointId);
  }
}
