import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PatchRow } from 'src/endpoint-microservice/core-api/generated/api';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { BaseRestapiController } from './base-restapi.controller';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller(
  '/endpoint/rest/:organizationId/:projectName/:branchName/:postfix/tables/:tableId/row/:rowId',
)
export class RowController extends BaseRestapiController {
  constructor(restapiEndpointService: RestapiEndpointService) {
    super(restapiEndpointService);
  }

  @Get()
  async getRow(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getRow(
      this.parseHeaders(req),
      tableId,
      rowId,
    );
    res.json(result);
  }

  @Post()
  async createRow(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() body: { data: object },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.createRow(
      this.parseHeaders(req),
      tableId,
      rowId,
      body.data,
    );
    res.json(result);
  }

  @Put()
  async updateRow(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() body: { data: object },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.updateRow(
      this.parseHeaders(req),
      tableId,
      rowId,
      body.data,
    );
    res.json(result);
  }

  @Patch()
  async patchRow(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Body() body: { patches: PatchRow[] },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.patchRow(
      this.parseHeaders(req),
      tableId,
      rowId,
      body.patches,
    );
    res.json(result);
  }

  @Delete()
  async deleteRow(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.deleteRow(
      this.parseHeaders(req),
      tableId,
      rowId,
    );
    res.json(result);
  }

  @Get('changes')
  async getRowChanges(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getRowChanges(
      this.parseHeaders(req),
      tableId,
      rowId,
    );
    res.json(result);
  }

  @Get('foreign-keys-by/:foreignKeyByTableId')
  async getRowForeignKeysBy(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Param('foreignKeyByTableId') foreignKeyByTableId: string,
    @Query('first', ParseIntPipe) first: number,
    @Query('after') after: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.getRowForeignKeysBy(
      this.parseHeaders(req),
      tableId,
      rowId,
      foreignKeyByTableId,
      first,
      after,
    );
    res.json(result);
  }

  @Post('files/:fileId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('tableId') tableId: string,
    @Param('rowId') rowId: string,
    @Param('fileId') fileId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 50 })],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const middleware = this.getMiddlewareFromRequest(req, res);
    if (!middleware) return;

    const result = await middleware.uploadFile(
      this.parseHeaders(req),
      tableId,
      rowId,
      fileId,
      file,
    );
    res.json(result);
  }
}
