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
  user1,
  post1,
  post2,
  user2,
  REVISION_ID,
  POST_TABLE_ID,
} from './test-utils';

describe('graphql controller', () => {
  it('should have proper test query structure for post table and post resolvers ', async () => {
    const testQuery = getUsersQuery();

    const result = await graphqlQuery(getUrl(), {
      ...testQuery,
      app,
    });

    expect(result.users.totalCount).toBe(2);
    expect(result.users.edges[0].node.data).toStrictEqual({
      ...user1.data,
      posts: [
        {
          post: post1,
          value: 1,
        },
        {
          post: post2,
          value: 2,
        },
      ],
    });
    expect(result.users.edges[1].node.data).toStrictEqual({
      ...user2.data,
      posts: [
        {
          post: post1,
          value: 3,
        },
        {
          post: post2,
          value: 4,
        },
        {
          post: post2,
          value: 5,
        },
        {
          post: post2,
          value: 6,
        },
      ],
    });
  });

  it('should have proper caching for row requests', async () => {
    const testQuery = getUsersQuery();

    const result = await graphqlQuery(getUrl(), {
      ...testQuery,
      app,
    });

    const headers = { headers: { authorization: 'Bearer undefined' } };

    const countSecondPostsInUser = result.users.edges[1].node.data.posts.filter(
      (item) => item.post.id === 'post-2',
    ).length;
    expect(countSecondPostsInUser).toBe(3);
    expect(mockProxyCoreApiService.api.row).toHaveBeenCalledTimes(2);
    expect(mockProxyCoreApiService.api.row).toHaveBeenNthCalledWith(
      1,
      REVISION_ID,
      POST_TABLE_ID,
      'post-1',
      headers,
    );
    expect(mockProxyCoreApiService.api.row).toHaveBeenNthCalledWith(
      2,
      REVISION_ID,
      POST_TABLE_ID,
      'post-2',
      headers,
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
                  address {
                    city
                    street
                    zipCode
                  }
                  posts {
                    value
                    post {
                      id
                      data {
                        title
                        content
                      }
                    }
                  }
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

  afterEach(async () => {
    jest.clearAllMocks();
  });
});
