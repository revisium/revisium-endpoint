import { Test } from '@nestjs/testing';
import {
  getObjectSchema,
  getStringSchema,
  getNumberSchema,
} from '@revisium/schema-toolkit/mocks';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';
import { gql } from 'src/__tests__/utils/gql';
import { graphqlQuery } from 'src/__tests__/utils/queryTest';
import { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InternalCoreApiService } from 'src/endpoint-microservice/core-api/internal-core-api.service';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointMicroserviceModule } from 'src/endpoint-microservice/endpoint-microservice.module';
import { CreateGraphqlEndpointCommand } from 'src/endpoint-microservice/graphql/commands/impl';
import { nanoid } from 'nanoid';

const ENDPOINT_ID = nanoid();
const REVISION_ID = nanoid();
const BRANCH_ID = nanoid();
const BRANCH_NAME = 'master';
const PROJECT_ID = nanoid();
const PROJECT_NAME = 'blog';
const ORGANIZATION_ID = 'org';
const USER_TABLE_ID = 'user';

const user1 = {
  id: 'user-1',
  versionId: 'v1',
  createdId: 'c1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  publishedAt: null,
  data: { name: 'Alice', age: 30 },
};

const createMockSchemaTableData = () => ({
  data: {
    edges: [
      {
        node: {
          id: USER_TABLE_ID,
          data: getObjectSchema({
            name: getStringSchema(),
            age: getNumberSchema(),
          }),
        },
      },
    ],
    totalCount: 1,
  },
  error: null,
});

const createMockInternalCoreApiService = () => ({
  initApi: jest.fn().mockResolvedValue(undefined),
  api: {
    login: jest.fn().mockResolvedValue({
      data: { accessToken: 'mock-token' },
      error: null,
    }),
    endpointRelatives: jest.fn().mockResolvedValue({
      data: {
        endpoint: { id: ENDPOINT_ID, type: 'GRAPHQL' },
        revision: { id: REVISION_ID, isHead: false, isDraft: true },
        branch: { id: BRANCH_ID, name: BRANCH_NAME },
        project: {
          id: PROJECT_ID,
          name: PROJECT_NAME,
          organizationId: ORGANIZATION_ID,
        },
      },
      error: null,
    }),
    rows: jest
      .fn()
      .mockImplementation((_revisionId: string, tableId: string) => {
        if (tableId === SystemTables.Schema)
          return Promise.resolve(createMockSchemaTableData());
        if (tableId === SystemTables.SharedSchemas)
          return Promise.resolve({
            data: { edges: [], totalCount: 0 },
            error: null,
          });
        return Promise.resolve({
          data: { edges: [], totalCount: 0 },
          error: null,
        });
      }),
    endpoints: jest.fn().mockResolvedValue({
      data: { edges: [], totalCount: 0 },
      error: null,
    }),
  },
});

const createMockProxyCoreApiService = () => ({
  api: {
    endpointRelatives: jest.fn(),
    rows: jest.fn().mockResolvedValue({
      data: {
        edges: [{ node: user1, cursor: 'c1' }],
        pageInfo: {},
        totalCount: 1,
      },
      error: null,
    }),
    row: jest.fn().mockResolvedValue({ data: user1, error: null }),
    createRow: jest.fn().mockResolvedValue({
      data: { table: {}, previousVersionTableId: '', row: user1 },
      error: null,
    }),
    updateRow: jest.fn().mockResolvedValue({
      data: { row: { ...user1, data: { name: 'Updated', age: 31 } } },
      error: null,
    }),
    deleteRow: jest.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
  },
});

describe('GraphQL Mutations', () => {
  let app: INestApplication;
  const mockInternalCoreApiService = createMockInternalCoreApiService();
  const mockProxyCoreApiService = createMockProxyCoreApiService();

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    const moduleFixture = await Test.createTestingModule({
      imports: [EndpointMicroserviceModule.forRoot({ mode: 'monolith' })],
    })
      .overrideProvider(InternalCoreApiService)
      .useValue(mockInternalCoreApiService)
      .overrideProvider(ProxyCoreApiService)
      .useValue(mockProxyCoreApiService)
      .overrideProvider(PrismaService)
      .useValue({ endpoint: { findMany: jest.fn().mockResolvedValue([]) } })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const commandBus = app.get(CommandBus);
    await commandBus.execute(
      new CreateGraphqlEndpointCommand('test-mutation-endpoint'),
    );
  });

  afterAll(async () => {
    await app.close();
  }, 10000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  function getUrl() {
    return `/endpoint/graphql/${ORGANIZATION_ID}/${PROJECT_NAME}/${BRANCH_NAME}/draft`;
  }

  it('should have mutation type in schema', async () => {
    const result = await graphqlQuery(getUrl(), {
      query: gql`
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
      app,
      token: 'test-token',
    });

    expect(result.__schema.mutationType).toBeDefined();
    expect(result.__schema.mutationType.name).toBe('Mutation');

    const fieldNames = result.__schema.mutationType.fields.map(
      (f: { name: string }) => f.name,
    );
    expect(fieldNames).toContain('createUser');
    expect(fieldNames).toContain('updateUser');
    expect(fieldNames).toContain('deleteUser');
  });

  it('should execute createUser mutation', async () => {
    const result = await graphqlQuery(getUrl(), {
      query: gql`
        mutation CreateUser($data: BlogCreateUserInput!) {
          createUser(data: $data) {
            id
            data {
              name
              age
            }
          }
        }
      `,
      variables: {
        data: { id: 'user-1', data: { name: 'Alice', age: 30 } },
      },
      app,
      token: 'test-token',
    });

    expect(result.createUser.id).toBe('user-1');
    expect(mockProxyCoreApiService.api.createRow).toHaveBeenCalledWith(
      REVISION_ID,
      USER_TABLE_ID,
      { rowId: 'user-1', data: { name: 'Alice', age: 30 } },
      { headers: { authorization: 'Bearer test-token' } },
    );
  });

  it('should execute updateUser mutation', async () => {
    const result = await graphqlQuery(getUrl(), {
      query: gql`
        mutation UpdateUser($data: BlogUpdateUserInput!) {
          updateUser(data: $data) {
            id
            data {
              name
              age
            }
          }
        }
      `,
      variables: {
        data: { id: 'user-1', data: { name: 'Updated', age: 31 } },
      },
      app,
      token: 'test-token',
    });

    expect(result.updateUser).toBeDefined();
    expect(mockProxyCoreApiService.api.updateRow).toHaveBeenCalledWith(
      REVISION_ID,
      USER_TABLE_ID,
      'user-1',
      { data: { name: 'Updated', age: 31 } },
      { headers: { authorization: 'Bearer test-token' } },
    );
  });

  it('should execute deleteUser mutation', async () => {
    const result = await graphqlQuery(getUrl(), {
      query: gql`
        mutation DeleteUser($id: String!) {
          deleteUser(id: $id) {
            id
            success
          }
        }
      `,
      variables: { id: 'user-1' },
      app,
      token: 'test-token',
    });

    expect(result.deleteUser.id).toBe('user-1');
    expect(result.deleteUser.success).toBe(true);
    expect(mockProxyCoreApiService.api.deleteRow).toHaveBeenCalledWith(
      REVISION_ID,
      USER_TABLE_ID,
      'user-1',
      { headers: { authorization: 'Bearer test-token' } },
    );
  });
});
