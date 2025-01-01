import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { parseHeaders } from 'src/endpoint-microservice/shared/utils/parseHeaders';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller()
export class RestapiEndpointController {
  constructor(private restapiEndpointService: RestapiEndpointService) {}

  @Get(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId',
  )
  async getRows(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Query('first', ParseIntPipe) first: number,
    @Query('after') after: string | undefined,
    @Req()
    req: Request,
    @Res() res: Response,
  ) {
    const endpointMiddleware =
      this.restapiEndpointService.getEndpointMiddleware(
        organizationId,
        projectName,
        branchName,
        postfix,
      );

    if (!endpointMiddleware) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    const result = await endpointMiddleware.getRows(
      parseHeaders(req.headers),
      tableId,
      first,
      after,
    );
    res.json(result);
  }

  @Get(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId/:rowId',
  )
  async getRow(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Param('rowId')
    rowId: string,
    @Req()
    req: Request,
    @Res() res: Response,
  ) {
    const endpointMiddleware =
      this.restapiEndpointService.getEndpointMiddleware(
        organizationId,
        projectName,
        branchName,
        postfix,
      );

    if (!endpointMiddleware) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    const result = await endpointMiddleware.getRow(
      parseHeaders(req.headers),
      tableId,
      rowId,
    );
    res.json(result);
  }

  @Post(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId/:rowId',
  )
  async createRow(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Param('rowId')
    rowId: string,
    @Body() data: object,
    @Req()
    req: Request,
    @Res() res: Response,
  ) {
    const endpointMiddleware =
      this.restapiEndpointService.getEndpointMiddleware(
        organizationId,
        projectName,
        branchName,
        postfix,
      );

    if (!endpointMiddleware) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    const result = await endpointMiddleware.createRow(
      parseHeaders(req.headers),
      tableId,
      rowId,
      data,
    );
    res.json(result);
  }

  @Put(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId/:rowId',
  )
  async updateRow(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Param('rowId')
    rowId: string,
    @Body() data: object,
    @Req()
    req: Request,
    @Res() res: Response,
  ) {
    const endpointMiddleware =
      this.restapiEndpointService.getEndpointMiddleware(
        organizationId,
        projectName,
        branchName,
        postfix,
      );

    if (!endpointMiddleware) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    const result = await endpointMiddleware.updateRow(
      parseHeaders(req.headers),
      tableId,
      rowId,
      data,
    );
    res.json(result);
  }

  @Delete(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId/:rowId',
  )
  async deleteRow(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Param('rowId')
    rowId: string,
    @Req()
    req: Request,
    @Res() res: Response,
  ) {
    const endpointMiddleware =
      this.restapiEndpointService.getEndpointMiddleware(
        organizationId,
        projectName,
        branchName,
        postfix,
      );

    if (!endpointMiddleware) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    const result = await endpointMiddleware.deleteRow(
      parseHeaders(req.headers),
      tableId,
      rowId,
    );
    res.json(result);
  }

  @Get(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId/:rowId/references-by/:referenceByTableId',
  )
  async getRowReferencesBy(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Param('rowId')
    rowId: string,
    @Param('referenceByTableId')
    referenceByTableId: string,
    @Query('first', ParseIntPipe) first: number,
    @Query('after') after: string | undefined,
    @Req()
    req: Request,
    @Res() res: Response,
  ) {
    const endpointMiddleware =
      this.restapiEndpointService.getEndpointMiddleware(
        organizationId,
        projectName,
        branchName,
        postfix,
      );

    if (!endpointMiddleware) {
      return res.status(HttpStatus.NOT_FOUND).send();
    }

    const result = await endpointMiddleware.getRowReferencesBy(
      parseHeaders(req.headers),
      tableId,
      rowId,
      referenceByTableId,
      first,
      after,
    );
    res.json(result);
  }
}
