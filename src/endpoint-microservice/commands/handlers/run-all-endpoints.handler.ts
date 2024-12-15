import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { RunAllEndpointsCommand } from 'src/endpoint-microservice/commands/impl/run-all-endpoints.command';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql';
import { CreateRestapiEndpointCommand } from 'src/endpoint-microservice/restapi';

@CommandHandler(RunAllEndpointsCommand)
export class RunAllEndpointsHandler
  implements ICommandHandler<RunAllEndpointsCommand>
{
  constructor(
    private prisma: PrismaService,
    private commandBus: CommandBus,
  ) {}

  public async execute(): Promise<void> {
    const endpoints = await this.getAllEndpoints();

    for (const endpoint of endpoints) {
      if (endpoint.type === 'GRAPHQL') {
        await this.commandBus.execute(
          new CreateGraphqlEndpointCommand(endpoint.id),
        );
      } else if (endpoint.type === 'REST_API') {
        await this.commandBus.execute(
          new CreateRestapiEndpointCommand(endpoint.id),
        );
      }
    }
  }

  public getAllEndpoints() {
    return this.prisma.endpoint.findMany({ where: { isDeleted: false } });
  }
}
