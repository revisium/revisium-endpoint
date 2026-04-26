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
let internalKey: string;

async function apiPost(
  path: string,
  body: Record<string, any>,
  expectedStatus = 201,
) {
  const res = await request(app.getHttpServer())
    .post(path)
    .set('X-Internal-Api-Key', internalKey)
    .send(body)
    .expect(expectedStatus);

  return res.body;
}

async function apiGet(path: string) {
  const res = await request(app.getHttpServer())
    .get(path)
    .set('X-Internal-Api-Key', internalKey)
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
    .set('X-Internal-Api-Key', internalKey)
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

    // Force test DATABASE_URL (overrides any ambient .env value)
    process.env.DATABASE_URL = TEST_DB_URL;
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

    // Core's InternalKeyBootstrapService auto-generates and exports the key
    // into process.env on module init; reuse it for all e2e API calls.
    internalKey = process.env.INTERNAL_API_KEY_ENDPOINT as string;

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

    // Create draft endpoint for mutations
    const newDraft = await apiGet(
      `/api/organization/${ORGANIZATION_ID}/projects/${PROJECT_NAME}/branches/${BRANCH_NAME}/draft-revision`,
    );
    const draftEndpointRes = await apiPost(
      `/api/revision/${newDraft.id}/endpoints`,
      { type: 'GRAPHQL' },
    );

    // Register both endpoints in endpoint module via CommandBus
    const commandBus = app.get(CommandBus);
    await commandBus.execute(new CreateGraphqlEndpointCommand(endpointRes.id));
    await commandBus.execute(
      new CreateGraphqlEndpointCommand(draftEndpointRes.id),
    );
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
        .set('X-Internal-Api-Key', internalKey)
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
      expect(res.body.errors[0].message).toEqual(expect.any(String));
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

  describe('Mutations (draft endpoint)', () => {
    it('should have mutation type on draft endpoint', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          {
            __schema {
              mutationType {
                name
                fields {
                  name
                }
              }
            }
          }
        `,
      );

      expect(data.__schema.mutationType).toBeDefined();
      expect(data.__schema.mutationType.name).toBe('Mutation');

      const fieldNames = data.__schema.mutationType.fields.map(
        (f: { name: string }) => f.name,
      );
      // Singular
      expect(fieldNames).toContain('createUser');
      expect(fieldNames).toContain('updateUser');
      expect(fieldNames).toContain('patchUser');
      expect(fieldNames).toContain('deleteUser');
      expect(fieldNames).toContain('createPost');
      expect(fieldNames).toContain('updatePost');
      expect(fieldNames).toContain('patchPost');
      expect(fieldNames).toContain('deletePost');
      // Bulk
      expect(fieldNames).toContain('createUsers');
      expect(fieldNames).toContain('updateUsers');
      expect(fieldNames).toContain('patchUsers');
      expect(fieldNames).toContain('deleteUsers');
      expect(fieldNames).toContain('createPosts');
      expect(fieldNames).toContain('updatePosts');
      expect(fieldNames).toContain('patchPosts');
      expect(fieldNames).toContain('deletePosts');
    });

    it('should NOT have mutation type on head endpoint', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('head'),
        `
          {
            __schema {
              mutationType {
                name
              }
            }
          }
        `,
      );

      expect(data.__schema.mutationType).toBeNull();
    });

    it('should create a row via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation CreateUser($data: ${prefix}CreateUserInput!) {
            createUser(data: $data) {
              id
              data {
                name
                email
                age
              }
            }
          }
        `,
        {
          data: {
            id: 'user-3',
            data: { name: 'Charlie', email: 'charlie@example.com', age: 35 },
          },
        },
      );

      expect(data.createUser).toBeDefined();
      expect(data.createUser.id).toBe('user-3');
      expect(data.createUser.data.name).toBe('Charlie');
      expect(data.createUser.data.email).toBe('charlie@example.com');
      expect(data.createUser.data.age).toBe(35);
    });

    it('should update a row via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation UpdateUser($data: ${prefix}UpdateUserInput!) {
            updateUser(data: $data) {
              id
              data {
                name
                email
                age
              }
            }
          }
        `,
        {
          data: {
            id: 'user-3',
            data: {
              name: 'Charlie Updated',
              email: 'charlie2@example.com',
              age: 36,
            },
          },
        },
      );

      expect(data.updateUser).toBeDefined();
      expect(data.updateUser.id).toBe('user-3');
      expect(data.updateUser.data.name).toBe('Charlie Updated');
      expect(data.updateUser.data.age).toBe(36);
    });

    it('should patch a row via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation PatchUser($data: ${prefix}PatchUserInput!) {
            patchUser(data: $data) {
              id
              data {
                name
                email
                age
              }
            }
          }
        `,
        {
          data: {
            id: 'user-3',
            patches: [
              { op: 'replace', path: 'name', value: 'Charlie Patched' },
            ],
          },
        },
      );

      expect(data.patchUser).toBeDefined();
      expect(data.patchUser.id).toBe('user-3');
      expect(data.patchUser.data.name).toBe('Charlie Patched');
    });

    it('should delete a row via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation DeleteUser($id: String!) {
            deleteUser(id: $id) {
              id
              success
            }
          }
        `,
        { id: 'user-3' },
      );

      expect(data.deleteUser).toBeDefined();
      expect(data.deleteUser.id).toBe('user-3');
      expect(data.deleteUser.success).toBe(true);
    });

    it('should bulk create rows via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation CreateUsers($data: ${prefix}CreateUsersInput!) {
            createUsers(data: $data) {
              success
              count
            }
          }
        `,
        {
          data: {
            rows: [
              {
                id: 'user-bulk-1',
                data: { name: 'Bulk1', email: 'bulk1@test.com', age: 20 },
              },
              {
                id: 'user-bulk-2',
                data: { name: 'Bulk2', email: 'bulk2@test.com', age: 21 },
              },
            ],
          },
        },
      );

      expect(data.createUsers.success).toBe(true);
      expect(data.createUsers.count).toBe(2);
    });

    it('should bulk update rows via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation UpdateUsers($data: ${prefix}UpdateUsersInput!) {
            updateUsers(data: $data) {
              success
              count
            }
          }
        `,
        {
          data: {
            rows: [
              {
                id: 'user-bulk-1',
                data: {
                  name: 'Bulk1 Updated',
                  email: 'bulk1@test.com',
                  age: 22,
                },
              },
              {
                id: 'user-bulk-2',
                data: {
                  name: 'Bulk2 Updated',
                  email: 'bulk2@test.com',
                  age: 23,
                },
              },
            ],
          },
        },
      );

      expect(data.updateUsers.success).toBe(true);
      expect(data.updateUsers.count).toBe(2);
    });

    it('should bulk patch rows via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation PatchUsers($data: ${prefix}PatchUsersInput!) {
            patchUsers(data: $data) {
              success
              count
            }
          }
        `,
        {
          data: {
            rows: [
              {
                id: 'user-bulk-1',
                patches: [
                  { op: 'replace', path: 'name', value: 'Bulk1 Patched' },
                ],
              },
              {
                id: 'user-bulk-2',
                patches: [
                  { op: 'replace', path: 'name', value: 'Bulk2 Patched' },
                ],
              },
            ],
          },
        },
      );

      expect(data.patchUsers.success).toBe(true);
      expect(data.patchUsers.count).toBe(2);
    });

    it('should bulk delete rows via mutation', async () => {
      const data = await graphqlQuery(
        getGraphqlUrl('draft'),
        `
          mutation DeleteUsers($data: ${prefix}DeleteUsersInput!) {
            deleteUsers(data: $data) {
              success
              count
            }
          }
        `,
        {
          data: { rowIds: ['user-bulk-1', 'user-bulk-2'] },
        },
      );

      expect(data.deleteUsers.success).toBe(true);
      expect(data.deleteUsers.count).toBe(2);
    });
  });
});
