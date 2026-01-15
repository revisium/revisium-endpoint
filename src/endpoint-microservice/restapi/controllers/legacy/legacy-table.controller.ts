import { Controller, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { TableController } from '../table.controller';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller(
  '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix/tables/:tableId',
)
export class LegacyTableController extends TableController {
  constructor(restapiEndpointService: RestapiEndpointService) {
    super(restapiEndpointService);
  }
}
