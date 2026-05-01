import { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { gql } from 'src/__tests__/utils/gql';
import { graphqlQuery } from 'src/__tests__/utils/queryTest';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
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
  USER_TABLE_ID,
  createMockPrismaService,
} from './test-utils';

describe('graphql controller', () => {
  it('should have proper test list query structure for user table and post resolvers ', async () => {
    const testQuery = getUsersQuery();

    const result = await graphqlQuery(getUrl(), {
      ...testQuery,
      app,
      token: 'test-token',
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

    checkCachingRowsForList(result.users.edges[1].node.data.posts);
  });

  it('should have proper test list query structure for user table and post resolvers (flat)', async () => {
    const testQuery = getUsersFlatQuery();

    const result = await graphqlQuery(getUrl(), {
      ...testQuery,
      app,
      token: 'test-token',
    });

    expect(result.usersFlat.totalCount).toBe(2);
    expect(result.usersFlat.edges[0].node).toStrictEqual({
      ...user1.data,
      posts: [
        {
          post: post1.data,
          value: 1,
        },
        {
          post: post2.data,
          value: 2,
        },
      ],
    });
    expect(result.usersFlat.edges[1].node).toStrictEqual({
      ...user2.data,
      posts: [
        {
          post: post1.data,
          value: 3,
        },
        {
          post: post2.data,
          value: 4,
        },
        {
          post: post2.data,
          value: 5,
        },
        {
          post: post2.data,
          value: 6,
        },
      ],
    });

    checkCachingRowsForList(result.usersFlat.edges[1].node.posts);
  });

  it('should have proper test row query structure for user table and post resolvers', async () => {
    const testQuery = getUserQuery('user-2');

    const result = await graphqlQuery(getUrl(), {
      ...testQuery,
      app,
      token: 'test-token',
    });

    expect(result.user.data).toStrictEqual({
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

    checkCachingRows(result.user.data.posts);
  });

  it('should have proper test row query structure for user table and post resolvers (flat)', async () => {
    const testQuery = getUserFlatQuery('user-2');

    const result = await graphqlQuery(getUrl(), {
      ...testQuery,
      app,
      token: 'test-token',
    });

    expect(result.userFlat).toStrictEqual({
      ...user2.data,
      posts: [
        {
          post: post1.data,
          value: 3,
        },
        {
          post: post2.data,
          value: 4,
        },
        {
          post: post2.data,
          value: 5,
        },
        {
          post: post2.data,
          value: 6,
        },
      ],
    });

    checkCachingRows(result.userFlat.posts);
  });

  describe('Auth error mapping for resolvers', () => {
    it('should map upstream 403 + non-JSON body to FORBIDDEN', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 403,
      });

      const res = await request(app.getHttpServer())
        .post(getUrl())
        .set('Authorization', 'Bearer test-token')
        .send(getUserQuery(user1.id))
        .expect(200);

      const body = res.body as {
        data: unknown;
        errors: Array<{
          message: string;
          extensions: Record<string, unknown>;
        }>;
      };

      expect(body.errors).toBeDefined();
      expect(body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(body.errors[0].extensions.statusCode).toBe(403);
      expect(body.errors[0].extensions).not.toHaveProperty('originalError');
      expect(body.errors[0].message).not.toMatch(/Unexpected token/);
    });

    it('should map upstream 401 + non-JSON body to UNAUTHENTICATED', async () => {
      mockProxyCoreApiService.api.row.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 401,
      });

      const res = await request(app.getHttpServer())
        .post(getUrl())
        .set('Authorization', 'Bearer test-token')
        .send(getUserQuery(user1.id))
        .expect(200);

      expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect(res.body.errors[0].extensions.statusCode).toBe(401);
    });
  });

  describe('Auth preflight for schema/meta requests', () => {
    it('should block POST { __typename } when preflight fails', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      const res = await request(app.getHttpServer())
        .post(getUrl())
        .send({ query: '{ __typename }' })
        .expect(403);

      expect(res.body.data).toBeUndefined();
      expect(res.body.statusCode).toBe(403);
    });

    it('should allow POST { __typename } when preflight passes', async () => {
      const res = await request(app.getHttpServer())
        .post(getUrl())
        .set('Authorization', 'Bearer test-token')
        .send({ query: '{ __typename }' })
        .expect(200);

      expect(res.body.data).toEqual({ __typename: 'Query' });
    });

    it('should block introspection when preflight fails', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      await request(app.getHttpServer())
        .post(getUrl())
        .send({
          query: '{ __schema { queryType { name } } }',
        })
        .expect(403);
    });

    it('should preserve upstream status when core returns HTML on preflight', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: new SyntaxError('Unexpected token < in JSON'),
        status: 401,
      });

      const res = await request(app.getHttpServer())
        .post(getUrl())
        .send({ query: '{ __typename }' })
        .expect(401);

      expect(res.body).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('should block GET explorer redirect when preflight fails', async () => {
      mockProxyCoreApiService.api.revision.mockResolvedValueOnce({
        data: null,
        error: { message: 'Forbidden', statusCode: 403 },
        status: 403,
      });

      await request(app.getHttpServer()).get(getUrl()).expect(403);
    });

    it('should redirect on GET when preflight passes', async () => {
      await request(app.getHttpServer())
        .get(getUrl())
        .set('Authorization', 'Bearer test-token')
        .expect(302);
    });
  });

  function checkCachingRowsForList(posts: any) {
    const headers = { headers: { authorization: 'Bearer test-token' } };

    const countSecondPostsInUser = posts.filter(
      (item: any) => item.post.id === 'post-2',
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
  }

  function checkCachingRows(posts: any) {
    const headers = { headers: { authorization: 'Bearer test-token' } };

    const countSecondPostsInUser = posts.filter(
      (item: any) => item.post.id === 'post-2',
    ).length;
    expect(countSecondPostsInUser).toBe(3);
    expect(mockProxyCoreApiService.api.row).toHaveBeenCalledTimes(3);
    expect(mockProxyCoreApiService.api.row).toHaveBeenNthCalledWith(
      1,
      REVISION_ID,
      USER_TABLE_ID,
      'user-2',
      headers,
    );
    expect(mockProxyCoreApiService.api.row).toHaveBeenNthCalledWith(
      2,
      REVISION_ID,
      POST_TABLE_ID,
      'post-1',
      headers,
    );
    expect(mockProxyCoreApiService.api.row).toHaveBeenNthCalledWith(
      3,
      REVISION_ID,
      POST_TABLE_ID,
      'post-2',
      headers,
    );
  }

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
                        id
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

  function getUsersFlatQuery() {
    return {
      query: gql`
        query Users($data: BlogGetUsersInput) {
          usersFlat(data: $data) {
            edges {
              node {
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
                    title
                    content
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

  function getUserQuery(userId: string) {
    return {
      query: gql`
        query User($id: String!) {
          user(id: $id) {
            id
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
                    id
                    title
                    content
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        id: userId,
      },
    };
  }

  function getUserFlatQuery(userId: string) {
    return {
      query: gql`
        query User($id: String!) {
          userFlat(id: $id) {
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
                title
                content
              }
            }
          }
        }
      `,
      variables: {
        id: userId,
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
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [EndpointMicroserviceModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(InternalCoreApiService)
      .useValue(mockInternalCoreApiService)
      .overrideProvider(ProxyCoreApiService)
      .useValue(mockProxyCoreApiService)
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
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
  }, 10000);

  afterEach(() => {
    jest.clearAllMocks();
  });
});
