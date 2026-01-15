import { Controller, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RestMetricsInterceptor } from 'src/endpoint-microservice/metrics/rest/rest-metrics.interceptor';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { RevisionController } from '../revision.controller';

@UseInterceptors(RestMetricsInterceptor)
@ApiExcludeController()
@Controller(
  '/endpoint/restapi/:organizationId/:projectName/:branchName/:postfix',
)
export class LegacyRevisionController extends RevisionController {
  constructor(restapiEndpointService: RestapiEndpointService) {
    super(restapiEndpointService);
  }
}
