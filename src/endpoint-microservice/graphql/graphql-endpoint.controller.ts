import {
  Controller,
  Get,
  HttpStatus,
  Next,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';

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
    @Param('postfix')
    postfix: string,
    @Req()
    req: Request,
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
    const endpointMiddleware = this.endpointService.getEndpointMiddleware(
      organizationId,
      projectName,
      branchName,
      postfix,
    );

    if (!endpointMiddleware) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    endpointMiddleware(req, res, next);
  }
}
