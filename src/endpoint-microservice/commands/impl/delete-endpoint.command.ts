import { EndpointType } from '@prisma/client';

export class DeleteEndpointCommand {
  public constructor(
    public readonly endpointId: string,
    public readonly endpointType: EndpointType,
  ) {}
}
