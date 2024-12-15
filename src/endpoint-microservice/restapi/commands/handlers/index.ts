import { CreateRestapiEndpointHandler } from 'src/endpoint-microservice/restapi/commands/handlers/create-restapi-endpoint.handler';
import { DeleteRestapiEndpointHandler } from 'src/endpoint-microservice/restapi/commands/handlers/delete-restapi-endpoint.handler';
import { UpdateRestapiEndpointHandler } from 'src/endpoint-microservice/restapi/commands/handlers/update-restapi-endpoint.handler';

export const REST_API_COMMANDS = [
  CreateRestapiEndpointHandler,
  DeleteRestapiEndpointHandler,
  UpdateRestapiEndpointHandler,
];
