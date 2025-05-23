import {
  Controller,
  Get,
  HttpStatus,
  Next,
  Param,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller(
  'endpoint/graphql/:organizationId/:projectName/:branchName/:postfix',
)
export class GraphqlEndpointController {
  constructor(private readonly endpointService: GraphqlEndpointService) {}

  @Get()
  get(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix') postfix: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const endpoint = this.endpointService.getEndpoint(
      organizationId,
      projectName,
      branchName,
      postfix,
    );

    if (!endpoint) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    const graphqlUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const url = new URL('https://studio.apollographql.com/sandbox/explorer');
    url.searchParams.set('endpoint', graphqlUrl);
    url.searchParams.set(
      'document',
      `query ExampleQuery {
  ${endpoint.table} {
    edges {
      node {
        id
      }
    }
    pageInfo {
      startCursor
      endCursor
      hasPreviousPage
      hasNextPage
    }
    totalCount
  }
}`,
    );
    url.searchParams.set(
      'headers',
      JSON.stringify({
        'Cache-Control': 'no-cache',
      }),
    );

    return res.redirect(url.toString());
  }

  @Post()
  post(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    this.run({
      organizationId,
      projectName,
      branchName,
      postfix,
      req,
      res,
      next,
    });
  }

  private run({
    organizationId,
    projectName,
    branchName,
    postfix,
    req,
    res,
    next,
  }: {
    organizationId: string;
    projectName: string;
    branchName: string;
    postfix: string | undefined;
    req: Request;
    res: Response;
    next: NextFunction;
  }) {
    const endpoint = this.endpointService.getEndpoint(
      organizationId,
      projectName,
      branchName,
      postfix,
    );

    if (!endpoint) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    endpoint.middleware(req, res, next);
  }
}
