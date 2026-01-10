import { Test, TestingModule } from '@nestjs/testing';
import { DeleteEndpointHandler } from '../delete-endpoint.handler';
import { DeleteEndpointCommand } from '../../impl';
import { GraphqlEndpointService } from 'src/endpoint-microservice/graphql/graphql-endpoint.service';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';

describe('DeleteEndpointHandler', () => {
  let handler: DeleteEndpointHandler;
  let graphqlEndpointService: jest.Mocked<GraphqlEndpointService>;
  let restapiEndpointService: jest.Mocked<RestapiEndpointService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteEndpointHandler,
        {
          provide: GraphqlEndpointService,
          useValue: {
            existEndpoint: jest.fn(),
            stopEndpoint: jest.fn(),
          },
        },
        {
          provide: RestapiEndpointService,
          useValue: {
            existEndpoint: jest.fn(),
            stopEndpoint: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<DeleteEndpointHandler>(DeleteEndpointHandler);
    graphqlEndpointService = module.get(GraphqlEndpointService);
    restapiEndpointService = module.get(RestapiEndpointService);
  });

  describe('execute', () => {
    const endpointId = 'test-endpoint-id';

    it('should stop GraphQL endpoint when it exists in memory', async () => {
      graphqlEndpointService.existEndpoint.mockReturnValue(true);
      restapiEndpointService.existEndpoint.mockReturnValue(false);

      await handler.execute(new DeleteEndpointCommand(endpointId));

      expect(graphqlEndpointService.existEndpoint).toHaveBeenCalledWith(
        endpointId,
      );
      expect(graphqlEndpointService.stopEndpoint).toHaveBeenCalledWith(
        endpointId,
      );
      expect(restapiEndpointService.stopEndpoint).not.toHaveBeenCalled();
    });

    it('should stop REST API endpoint when it exists in memory', async () => {
      graphqlEndpointService.existEndpoint.mockReturnValue(false);
      restapiEndpointService.existEndpoint.mockReturnValue(true);

      await handler.execute(new DeleteEndpointCommand(endpointId));

      expect(graphqlEndpointService.existEndpoint).toHaveBeenCalledWith(
        endpointId,
      );
      expect(restapiEndpointService.existEndpoint).toHaveBeenCalledWith(
        endpointId,
      );
      expect(restapiEndpointService.stopEndpoint).toHaveBeenCalledWith(
        endpointId,
      );
      expect(graphqlEndpointService.stopEndpoint).not.toHaveBeenCalled();
    });

    it('should not stop any endpoint if not found in memory', async () => {
      graphqlEndpointService.existEndpoint.mockReturnValue(false);
      restapiEndpointService.existEndpoint.mockReturnValue(false);

      await handler.execute(new DeleteEndpointCommand(endpointId));

      expect(graphqlEndpointService.stopEndpoint).not.toHaveBeenCalled();
      expect(restapiEndpointService.stopEndpoint).not.toHaveBeenCalled();
    });

    it('should prioritize GraphQL when endpoint exists in both services', async () => {
      graphqlEndpointService.existEndpoint.mockReturnValue(true);
      restapiEndpointService.existEndpoint.mockReturnValue(true);

      await handler.execute(new DeleteEndpointCommand(endpointId));

      expect(graphqlEndpointService.stopEndpoint).toHaveBeenCalledWith(
        endpointId,
      );
      expect(restapiEndpointService.stopEndpoint).not.toHaveBeenCalled();
    });
  });
});
