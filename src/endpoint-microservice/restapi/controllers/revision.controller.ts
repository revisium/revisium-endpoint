import { Controller, Get, Req, Res, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { BaseRestapiController } from './base-restapi.controller';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller(
  '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix',
)
export class RevisionController extends BaseRestapiController {
  constructor(restapiEndpointService: RestapiEndpointService) {
    super(restapiEndpointService);
  }

  @Get()
  async getRevision(@Req() req: Request, @Res() res: Response) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getRevision(this.parseHeaders(req));
    res.json(result);
  }

  @Get('changes')
  async getRevisionChanges(@Req() req: Request, @Res() res: Response) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getRevisionChanges(this.parseHeaders(req));
    res.json(result);
  }

  @Get('tables')
  async getTables(@Req() req: Request, @Res() res: Response) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getTables(this.parseHeaders(req));
    res.json(result);
  }
}
