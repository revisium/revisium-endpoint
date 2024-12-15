import { CreateEndpointHandler } from 'src/endpoint-microservice/commands/handlers/create-endpoint.handler';
import { DeleteEndpointHandler } from 'src/endpoint-microservice/commands/handlers/delete-endpoint.handler';
import { RunAllEndpointsHandler } from 'src/endpoint-microservice/commands/handlers/run-all-endpoints.handler';
import { UpdateEndpointHandler } from 'src/endpoint-microservice/commands/handlers/update-endpoint.handler';

export const ENDPOINT_COMMANDS = [
  CreateEndpointHandler,
  DeleteEndpointHandler,
  UpdateEndpointHandler,
  RunAllEndpointsHandler,
];
