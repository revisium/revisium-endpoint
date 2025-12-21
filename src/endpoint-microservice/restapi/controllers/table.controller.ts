import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  GetTableRowsDto,
  PatchRow,
} from 'src/endpoint-microservice/core-api/generated/api';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { BaseRestapiController } from './base-restapi.controller';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller(
  '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/tables/:tableId',
)
export class TableController extends BaseRestapiController {
  constructor(restapiEndpointService: RestapiEndpointService) {
    super(restapiEndpointService);
  }

  @Get()
  async getTable(
    @Param('tableId') tableId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getTable(this.parseHeaders(req), tableId);
    res.json(result);
  }

  @Get('schema')
  async getTableSchema(
    @Param('tableId') tableId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getTableSchema(
      this.parseHeaders(req),
      tableId,
    );
    res.json(result);
  }

  @Get('changes')
  async getTableChanges(
    @Param('tableId') tableId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getTableChanges(
      this.parseHeaders(req),
      tableId,
    );
    res.json(result);
  }

  @Post('rows')
  @HttpCode(HttpStatus.OK)
  async queryRows(
    @Param('tableId') tableId: string,
    @Body() body: GetTableRowsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getRows(
      this.parseHeaders(req),
      tableId,
      body,
    );
    res.json(result);
  }

  @Put('rows')
  async bulkCreateRows(
    @Param('tableId') tableId: string,
    @Body() body: { rows: Array<{ rowId: string; data: object }> },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.bulkCreateRows(
      this.parseHeaders(req),
      tableId,
      body.rows,
    );
    res.json(result);
  }

  @Patch('rows')
  async bulkPatchRows(
    @Param('tableId') tableId: string,
    @Body() body: { rows: Array<{ rowId: string; patches: PatchRow[] }> },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.bulkPatchRows(
      this.parseHeaders(req),
      tableId,
      body.rows,
    );
    res.json(result);
  }

  @Delete('rows')
  async bulkDeleteRows(
    @Param('tableId') tableId: string,
    @Body() body: { rowIds: string[] },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.deleteRows(
      this.parseHeaders(req),
      tableId,
      body.rowIds,
    );
    res.json(result);
  }
}
