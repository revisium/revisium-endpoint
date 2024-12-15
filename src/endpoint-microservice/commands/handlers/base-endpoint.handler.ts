import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';

export abstract class BaseEndpointHandler {
  protected constructor(protected prisma: PrismaService) {}

  protected async getEndpointType(endpointId: string) {
    const result = await this.prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: { type: true },
    });
    return result?.type;
  }
}
