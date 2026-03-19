import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { initSwagger } from '@revisium/core';
import request from 'supertest';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import { TestAppModule } from './test-app.module';
import { runMigrations, runSeed } from './setup';

const ORGANIZATION_ID = 'admin';
const PROJECT_NAME = `e2etest${Date.now()}`;
const BRANCH_NAME = 'master';

let app: INestApplication;
let draftRevisionId: string;
let prefix: string;
let token: string;

async function apiPost(
  path: string,
  body: Record<string, any>,
  expectedStatus = 201,
) {
  const res = await request(app.getHttpServer())
    .post(path)
    .set('Authorization', `Bearer ${token}`)
    .send(body)
    .expect(expectedStatus);

  return res.body;
}

async function apiGet(path: string) {
  const res = await request(app.getHttpServer())
    .get(path)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  return res.body;
}

async function graphqlQuery(
  url: string,
  query: string,
  variables?: Record<string, any>,
) {
  const res = await request(app.getHttpServer())
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send({ query, variables });

  if (res.status !== 200) {
    throw new Error(
      `GraphQL request failed with status ${res.status}: ${JSON.stringify(res.body, null, 2)}`,
    );
  }

  if (res.body.errors?.length) {
    throw new Error(
      `GraphQL errors: ${JSON.stringify(res.body.errors, null, 2)}`,
    );
  }

  return res.body.data;
}

function getGraphqlUrl(postfix: string) {
  return `/endpoint/graphql/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/${postfix}`;
}

describe('GraphQL Endpoint E2E', () => {
  beforeAll(async () => {
    const TEST_DB_URL =
      'postgresql://revisium:password@localhost:5437/revisium-endpoint-test?schema=public';

    if (
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('revisium-endpoint-test')
    ) {
      throw new Error(
        `DATABASE_URL does not point to test database. Got: ${process.env.DATABASE_URL}`,
      );
    }

    process.env.DATABASE_URL = process.env.DATABASE_URL || TEST_DB_URL;
    process.env.REVISIUM_NO_AUTH = 'true';
    process.env.NODE_ENV = 'test';
    process.env.CORE_API_URL = `http://127.0.0.1:${process.env.PORT || 8082}`;

    runMigrations();
    runSeed();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    initSwagger(app);

    const port = process.env.PORT || 8082;
    process.env.PORT = String(port);
    await app.listen(port);

    // Initialize internal core API for endpoint operations
    const internalCoreApi = app.get(InternalCoreApiService);
    await internalCoreApi.initApi();

    // Get auth token via login (REVISIUM_NO_AUTH=true accepts any credentials)
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ emailOrUsername: 'admin', password: 'any' })
      .expect(201);
    token = loginRes.body.accessToken;

    // Determine GraphQL type prefix (project name, capitalized first letter)
    prefix = PROJECT_NAME.charAt(0).toUpperCase() + PROJECT_NAME.slice(1);

    // Create project
    await apiPost(`/api/organization/${ORGANIZATION_ID}/projects`, {
      projectName: PROJECT_NAME,
    });

    // Get draft revision
    const draft = await apiGet(
      `/api/organization/${ORGANIZATION_ID}/projects/${PROJECT_NAME}/branches/${BRANCH_NAME}/draft-revision`,
    );
    draftRevisionId = draft.id;

    // Create tables (singular names for clean GraphQL naming)
    await apiPost(`/api/revision/${draftRevisionId}/tables`, {
      tableId: 'user',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: '' },
          email: { type: 'string', default: '' },
          age: { type: 'number', default: 0 },
        },
        additionalProperties: false,
        required: ['name', 'email', 'age'],
      },
    });

    await apiPost(`/api/revision/${draftRevisionId}/tables`, {
      tableId: 'post',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', default: '' },
          content: { type: 'string', default: '' },
        },
        additionalProperties: false,
        required: ['title', 'content'],
      },
    });

    // Create rows
    await apiPost(`/api/revision/${draftRevisionId}/tables/user/create-row`, {
      rowId: 'user-1',
      data: { name: 'Alice', email: 'alice@example.com', age: 30 },
    });

    await apiPost(`/api/revision/${draftRevisionId}/tables/user/create-row`, {
      rowId: 'user-2',
      data: { name: 'Bob', email: 'bob@example.com', age: 25 },
    });

    await apiPost(`/api/revision/${draftRevisionId}/tables/post/create-row`, {
      rowId: 'post-1',
      data: { title: 'Hello World', content: 'First post' },
    });

    // Commit
    await apiPost(
      `/api/organization/${ORGANIZATION_ID}/projects/${PROJECT_NAME}/branches/${BRANCH_NAME}/create-revision`,
      { comment: 'Initial data' },
    );

    // Create GraphQL endpoint
    const headRevision = await apiGet(
      `/api/organization/${ORGANIZATION_ID}/projects/${PROJECT_NAME}/branches/${BRANCH_NAME}/head-revision`,
    );

    const endpointRes = await apiPost(
      `/api/revision/${headRevision.id}/endpoints`,
      { type: 'GRAPHQL' },
    );

    // Register endpoint in endpoint module via CommandBus
    const commandBus = app.get(CommandBus);
    await commandBus.execute(new CreateGraphqlEndpointCommand(endpointRes.id));
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 15000);

  describe('Node type queries (with system fields)', () => {
    it('should query single user by id', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUser($id: String!) {
            user(id: $id) {
              id
              data {
                name
                email
                age
              }
            }
          }
        `,
        { id: 'user-1' },
      );

      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-1');
      expect(data.user.data.name).toBe('Alice');
      expect(data.user.data.email).toBe('alice@example.com');
      expect(data.user.data.age).toBe(30);
    });

    it('should query users list with pagination', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUsers($data: ${prefix}GetUsersInput) {
            users(data: $data) {
              totalCount
              edges {
                cursor
                node {
                  id
                  data {
                    name
                    email
                  }
                }
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
            }
          }
        `,
        { data: { first: 10 } },
      );

      expect(data.users.totalCount).toBe(2);
      expect(data.users.edges).toHaveLength(2);
      expect(data.users.pageInfo).toBeDefined();

      const names = data.users.edges.map(
        (e: { node: { data: { name: string } } }) => e.node.data.name,
      );
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');
    });

    it('should include system fields on node types', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUser($id: String!) {
            user(id: $id) {
              id
              versionId
              createdId
              createdAt
              updatedAt
              json
              data {
                name
              }
            }
          }
        `,
        { id: 'user-1' },
      );

      expect(data.user.versionId).toBeDefined();
      expect(data.user.createdId).toBeDefined();
      expect(data.user.createdAt).toBeDefined();
      expect(data.user.updatedAt).toBeDefined();
      expect(data.user.json).toBeDefined();
      expect(data.user.json.name).toBe('Alice');
      expect(data.user.data.name).toBe('Alice');
    });

    it('should query single post', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetPost($id: String!) {
            post(id: $id) {
              id
              data {
                title
                content
              }
            }
          }
        `,
        { id: 'post-1' },
      );

      expect(data.post).toBeDefined();
      expect(data.post.id).toBe('post-1');
      expect(data.post.data.title).toBe('Hello World');
      expect(data.post.data.content).toBe('First post');
    });

    it('should return error for non-existent row', async () => {
      const res = await request(app.getHttpServer())
        .post(getGraphqlUrl('head'))
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: `
            query GetUser($id: String!) {
              user(id: $id) {
                id
              }
            }
          `,
          variables: { id: 'non-existent' },
        })
        .expect(200);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toBe('Row not found');
      expect(res.body.data).toBeNull();
    });
  });

  describe('Flat type queries (data only)', () => {
    it('should query single user flat', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUserFlat($id: String!) {
            userFlat(id: $id) {
              name
              email
              age
            }
          }
        `,
        { id: 'user-1' },
      );

      expect(data.userFlat).toBeDefined();
      expect(data.userFlat.name).toBe('Alice');
      expect(data.userFlat.email).toBe('alice@example.com');
      expect(data.userFlat.age).toBe(30);
    });

    it('should query users flat list', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUsersFlat($data: ${prefix}GetUsersInput) {
            usersFlat(data: $data) {
              totalCount
              edges {
                node {
                  name
                  email
                }
              }
            }
          }
        `,
        { data: { first: 10 } },
      );

      expect(data.usersFlat.totalCount).toBe(2);
      expect(data.usersFlat.edges).toHaveLength(2);
    });
  });

  describe('Pagination', () => {
    it('should support first/after cursor pagination', async () => {
      const firstPage = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUsers($data: ${prefix}GetUsersInput) {
            users(data: $data) {
              totalCount
              edges {
                cursor
                node {
                  id
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        { data: { first: 1 } },
      );

      expect(firstPage.users.edges).toHaveLength(1);
      expect(firstPage.users.totalCount).toBe(2);
      expect(firstPage.users.pageInfo.hasNextPage).toBe(true);

      const secondPage = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUsers($data: ${prefix}GetUsersInput) {
            users(data: $data) {
              edges {
                node {
                  id
                }
              }
              pageInfo {
                hasNextPage
              }
            }
          }
        `,
        { data: { first: 1, after: firstPage.users.pageInfo.endCursor } },
      );

      expect(secondPage.users.edges).toHaveLength(1);
      expect(secondPage.users.edges[0].node.id).not.toBe(
        firstPage.users.edges[0].node.id,
      );
      expect(secondPage.users.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('Filtering', () => {
    it('should filter by id with equals', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUsers($data: ${prefix}GetUsersInput) {
            users(data: $data) {
              totalCount
              edges {
                node {
                  id
                  data {
                    name
                  }
                }
              }
            }
          }
        `,
        {
          data: {
            where: {
              id: { equals: 'user-1' },
            },
          },
        },
      );

      expect(data.users.totalCount).toBe(1);
      expect(data.users.edges[0].node.id).toBe('user-1');
      expect(data.users.edges[0].node.data.name).toBe('Alice');
    });
  });

  describe('Ordering', () => {
    it('should order by id descending', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetUsers($data: ${prefix}GetUsersInput) {
            users(data: $data) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
        {
          data: {
            orderBy: [{ field: 'id', direction: 'desc' }],
          },
        },
      );

      expect(data.users.edges[0].node.id).toBe('user-2');
      expect(data.users.edges[1].node.id).toBe('user-1');
    });
  });

  describe('Introspection', () => {
    it('should support schema introspection', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          {
            __schema {
              queryType {
                name
              }
            }
          }
        `,
      );

      expect(data.__schema.queryType.name).toBe('Query');
    });
  });

  describe('Posts table', () => {
    it('should query posts list', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          query GetPosts($data: ${prefix}GetPostsInput) {
            posts(data: $data) {
              totalCount
              edges {
                node {
                  id
                  data {
                    title
                    content
                  }
                }
              }
            }
          }
        `,
        { data: { first: 10 } },
      );

      expect(data.posts.totalCount).toBe(1);
      expect(data.posts.edges[0].node.data.title).toBe('Hello World');
    });
  });
});
