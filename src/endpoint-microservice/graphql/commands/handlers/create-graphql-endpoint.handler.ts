import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';

@CommandHandler(CreateGraphqlEndpointCommand)
export class CreateGraphqlEndpointHandler implements ICommandHandler<CreateGraphqlEndpointCommand> {
  private readonly logger = new Logger(CreateGraphqlEndpointHandler.name);

  public constructor(private readonly service: GraphqlEndpointService) {}

  public async execute({
    endpointId,
  }: CreateGraphqlEndpointCommand): Promise<void> {
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
