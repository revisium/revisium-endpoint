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
    const { organizationId, projectName, branchName, postfix } =
      req.params as Record<string, string>;

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
    const headers = parseHeaders(req.headers);

    if (!headers['x-api-key'] && !headers.authorization && req.query.api_key) {
      headers['x-api-key'] = req.query.api_key as string;
    }

    return headers;
  }
}
