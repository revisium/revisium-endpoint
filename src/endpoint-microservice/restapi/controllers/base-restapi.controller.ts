import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { EndpointMiddleware } from 'src/endpoint-microservice/restapi/endpoint-middleware.interface';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { parseHeaders } from 'src/endpoint-microservice/shared/utils/parseHeaders';

export abstract class BaseRestapiController {
  constructor(
    protected readonly restapiEndpointService: RestapiEndpointService,
  ) {}

  protected getMiddlewareFromRequest(
    req: Request,
    res: Response,
  ): EndpointMiddleware | null {
    const { organizationId, projectName, branchName, postfix } = req.params;

    const middleware = this.restapiEndpointService.getEndpointMiddleware(
      organizationId,
      projectName,
      branchName,
      postfix,
    );

    if (!middleware) {
      res.status(HttpStatus.NOT_FOUND).send();
      return null;
    }

    return middleware;
  }

  protected parseHeaders(req: Request): Record<string, string> {
    return parseHeaders(req.headers);
  }
}
