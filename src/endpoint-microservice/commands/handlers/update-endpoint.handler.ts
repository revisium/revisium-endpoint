import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { BaseEndpointHandler } from 'src/endpoint-microservice/commands/handlers/base-endpoint.handler';
import { UpdateEndpointCommand } from 'src/endpoint-microservice/commands/impl';
import { UpdateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql';
import { UpdateRestapiEndpointCommand } from 'src/endpoint-microservice/restapi';

@CommandHandler(UpdateEndpointCommand)
export class UpdateEndpointHandler
  extends BaseEndpointHandler
  implements ICommandHandler<UpdateEndpointCommand>
{
  constructor(
    protected prisma: PrismaService,
    private commandBus: CommandBus,
  ) {
    super(prisma);
  }

  public async execute({ endpointId }: UpdateEndpointCommand): Promise<void> {
    const type = await this.getEndpointType(endpointId);

    if (type === 'GRAPHQL') {
      await this.commandBus.execute(
        new UpdateGraphqlEndpointCommand(endpointId),
      );
    } else if (type === 'REST_API') {
      await this.commandBus.execute(
        new UpdateRestapiEndpointCommand(endpointId),
      );
    }
  }
}
