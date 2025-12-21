import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { GetTableRowsDto } from 'src/endpoint-microservice/core-api/generated/api';
import { EndpointMiddleware } from 'src/endpoint-microservice/restapi/endpoint-middleware.interface';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { parseHeaders } from 'src/endpoint-microservice/shared/utils/parseHeaders';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller()
export class RestapiEndpointController {
  constructor(
    private readonly restapiEndpointService: RestapiEndpointService,
  ) {}

  private resolveTableId(
    middleware: EndpointMiddleware,
    urlPath: string,
  ): string {
    const rawTableId = middleware.resolveTableId(urlPath);
    if (!rawTableId) {
      throw new BadRequestException(`Table "${urlPath}" not found`);
    }
    return rawTableId;
  }

  @Post(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId',
  )
  @HttpCode(HttpStatus.OK)
  async getRows(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Body() body: GetTableRowsDto,
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

    const rawTableId = this.resolveTableId(endpointMiddleware, tableId);

    const result = await endpointMiddleware.getRows(
      parseHeaders(req.headers),
      rawTableId,
      body,
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

    const rawTableId = this.resolveTableId(endpointMiddleware, tableId);

    const result = await endpointMiddleware.getRow(
      parseHeaders(req.headers),
      rawTableId,
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

    const rawTableId = this.resolveTableId(endpointMiddleware, tableId);

    const result = await endpointMiddleware.createRow(
      parseHeaders(req.headers),
      rawTableId,
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

    const rawTableId = this.resolveTableId(endpointMiddleware, tableId);

    const result = await endpointMiddleware.updateRow(
      parseHeaders(req.headers),
      rawTableId,
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

    const rawTableId = this.resolveTableId(endpointMiddleware, tableId);

    const result = await endpointMiddleware.deleteRow(
      parseHeaders(req.headers),
      rawTableId,
      rowId,
    );
    res.json(result);
  }

  @Get(
    '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/:tableId/:rowId/foreign-keys-by/:foreignKeyByTableId',
  )
  async getRowForeignKeysBy(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
    @Param('tableId')
    tableId: string,
    @Param('rowId')
    rowId: string,
    @Param('foreignKeyByTableId')
    foreignKeyByTableId: string,
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

    const rawTableId = this.resolveTableId(endpointMiddleware, tableId);
    const rawForeignKeyByTableId = this.resolveTableId(
      endpointMiddleware,
      foreignKeyByTableId,
    );

    const result = await endpointMiddleware.getRowForeignKeysBy(
      parseHeaders(req.headers),
      rawTableId,
      rowId,
      rawForeignKeyByTableId,
      first,
      after,
    );
    res.json(result);
  }
}
