import { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { gql } from 'src/__tests__/utils/gql';
import { graphqlQuery } from 'src/__tests__/utils/queryTest';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import {
  createMockInternalCoreApiService,
  createMockProxyCoreApiService,
  ORGANIZATION_ID,
  PROJECT_NAME,
  BRANCH_NAME,
  createMockUserTableData,
} from './test-utils';

describe('graphql controller', () => {
  it('should have proper test query structure for User table', async () => {
    const testQuery = getUsersQuery();

    const result = await graphqlQuery(getUrl(), {
      ...testQuery,
      app,
    });

    expect(result.users.totalCount).toBe(2);
    expect(result.users.edges[0].node.data).toStrictEqual(
      createMockUserTableData().data.edges[0].node.data,
    );
  });

  function getUsersQuery() {
    return {
      query: gql`
        query Users($data: BlogGetUsersInput) {
          users(data: $data) {
            edges {
              node {
                data {
                  firstName
                  lastName
                  email
                }
              }
            }
            totalCount
          }
        }
      `,
      variables: {
        data: {
          first: 100,
        },
      },
    };
  }

  function getUrl() {
    return `/endpoint/graphql/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/head`;
  }

  let app: INestApplication;

  const mockInternalCoreApiService = createMockInternalCoreApiService();
  const mockProxyCoreApiService = createMockProxyCoreApiService();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EndpointMicroserviceModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(InternalCoreApiService)
      .useValue(mockInternalCoreApiService)
      .overrideProvider(ProxyCoreApiService)
      .useValue(mockProxyCoreApiService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const commandBus = app.get(CommandBus);

    await commandBus.execute(
      new CreateGraphqlEndpointCommand('test-endpoint-id'),
    );
  });

  afterAll(async () => {
    await app.close();
  });
});
