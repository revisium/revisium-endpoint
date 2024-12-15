import { CreateGraphqlEndpointHandler } from 'src/endpoint-microservice/graphql/commands/handlers/create-graphql-endpoint.handler';
import { DeleteGraphqlEndpointHandler } from 'src/endpoint-microservice/graphql/commands/handlers/delete-graphql-endpoint.handler';
import { UpdateGraphqlEndpointHandler } from 'src/endpoint-microservice/graphql/commands/handlers/update-graphql-endpoint.handler';

export const GRAPHQL_COMMANDS = [
  CreateGraphqlEndpointHandler,
  DeleteGraphqlEndpointHandler,
  UpdateGraphqlEndpointHandler,
];
