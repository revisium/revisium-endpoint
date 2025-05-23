import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { BaseEndpointHandler } from 'src/endpoint-microservice/commands/handlers/base-endpoint.handler';
import { DeleteEndpointCommand } from 'src/endpoint-microservice/commands/impl';
import { DeleteGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql';
import { DeleteRestapiEndpointCommand } from 'src/endpoint-microservice/restapi';

@CommandHandler(DeleteEndpointCommand)
export class DeleteEndpointHandler
  extends BaseEndpointHandler
  implements ICommandHandler<DeleteEndpointCommand>
{
  constructor(
    protected readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {
    super(prisma);
  }

  public async execute({
    endpointId,
    endpointType,
  }: DeleteEndpointCommand): Promise<void> {
    if (endpointType === 'GRAPHQL') {
      await this.commandBus.execute(
        new DeleteGraphqlEndpointCommand(endpointId),
      );
    } else if (endpointType === 'REST_API') {
      await this.commandBus.execute(
        new DeleteRestapiEndpointCommand(endpointId),
      );
    }
  }
}
