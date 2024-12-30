import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';

const MAX_DOC_EXPANSION = 1;

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller()
export class SwaggerEndpointController {
  constructor(private restapiEndpointService: RestapiEndpointService) {}

  // TODO avoid unpkg.com

  @Get('/endpoint/swagger/:organizationId/:projectName/:branchName/:postfix')
  getSwagger(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
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

    const url = `/endpoint/openapi/${encodeURIComponent(organizationId)}/${encodeURIComponent(projectName)}/${encodeURIComponent(branchName)}/${postfix}/openapi.json`;
    res.send(`
    
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="SwaggerUI" />
  <title>SwaggerUI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: "${url}",
      dom_id: '#swagger-ui',
      tryItOutEnabled: true,
      filter: true,
      docExpansion: ${endpointMiddleware.countTables > MAX_DOC_EXPANSION ? '"none"' : '"list"'}
    });
  };
</script>
</body>
</html>
    
    `);
  }

  @Get(
    '/endpoint/openapi/:organizationId/:projectName/:branchName/:postfix/openapi.json',
  )
  getOpenApiJson(
    @Param('organizationId') organizationId: string,
    @Param('projectName') projectName: string,
    @Param('branchName') branchName: string,
    @Param('postfix')
    postfix: string,
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

    res.json(endpointMiddleware.openApiJson);
  }
}
