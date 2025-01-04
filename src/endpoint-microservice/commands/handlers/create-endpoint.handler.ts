import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { BaseEndpointHandler } from 'src/endpoint-microservice/commands/handlers/base-endpoint.handler';
import { CreateEndpointCommand } from 'src/endpoint-microservice/commands/impl';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql';
import { CreateRestapiEndpointCommand } from 'src/endpoint-microservice/restapi';

@CommandHandler(CreateEndpointCommand)
export class CreateEndpointHandler
  extends BaseEndpointHandler
  implements ICommandHandler<CreateEndpointCommand>
{
  constructor(
    protected readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {
    super(prisma);
  }

  public async execute({ endpointId }: CreateEndpointCommand): Promise<void> {
    const type = await this.getEndpointType(endpointId);

    if (type === 'GRAPHQL') {
      await this.commandBus.execute(
        new CreateGraphqlEndpointCommand(endpointId),
      );
    } else if (type === 'REST_API') {
      await this.commandBus.execute(
        new CreateRestapiEndpointCommand(endpointId),
      );
    }
  }
}
