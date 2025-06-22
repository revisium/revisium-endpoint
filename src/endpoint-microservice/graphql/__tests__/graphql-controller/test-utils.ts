import { nanoid } from 'nanoid';
import {
  getObjectSchema,
  getStringSchema,
  getNumberSchema,
  getArraySchema,
} from 'src/endpoint-microservice/shared/schema/schema.mocks';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';

export const ENDPOINT_ID = nanoid();
export const REVISION_ID = nanoid();
export const BRANCH_ID = nanoid();
export const BRANCH_NAME = 'master';
export const PROJECT_ID = nanoid();
export const PROJECT_NAME = 'blog';
export const ORGANIZATION_ID = 'org';

export const USER_TABLE_ID = 'user';
export const POST_TABLE_ID = 'post';

export const createUserSchema = () =>
  getObjectSchema({
    firstName: getStringSchema(),
    lastName: getStringSchema(),
    email: getStringSchema(),
    posts: getArraySchema(
      getObjectSchema({
        post: getStringSchema({ foreignKey: POST_TABLE_ID }),
        value: getNumberSchema(),
      }),
    ),
    address: getObjectSchema({
      city: getStringSchema(),
      street: getStringSchema(),
      zipCode: getNumberSchema(),
    }),
  });

export const createPostSchema = () =>
  getObjectSchema({
    title: getStringSchema(),
    content: getStringSchema(),
  });

export const createMockSchemaTableData = () => ({
  data: {
    edges: [
      {
        node: {
          id: USER_TABLE_ID,
          data: createUserSchema(),
        },
      },
      {
        node: {
          id: POST_TABLE_ID,
          data: createPostSchema(),
        },
      },
    ],
    totalCount: 2,
  },
  error: null,
});

export const createMockUserTableData = () => ({
  data: {
    edges: [
      {
        node: {
          id: 'user-1',
          data: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          address: {
            city: 'city 1',
            street: 'street 1',
            zipCode: 123456,
          },
        },
      },
      {
        node: {
          id: 'user-2',
          data: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
          },
        },
      },
    ],
    totalCount: 2,
  },
  error: null,
});

export const createMockPostTableData = () => ({
  data: {
    edges: [
      {
        node: {
          id: 'post-1',
          data: {
            title: 'Hello World',
            content: 'This is my first post',
          },
        },
      },
      {
        node: {
          id: 'post-2',
          data: {
            title: 'GraphQL is awesome',
            content: 'Learning about GraphQL endpoints',
          },
        },
      },
    ],
    totalCount: 2,
  },
  error: null,
});

export const createMockEmptyTableData = () => ({
  data: {
    edges: [],
    totalCount: 0,
  },
  error: null,
});

export const createRowsMock = () => {
  const mockSchemaTableData = createMockSchemaTableData();
  const mockUserTableData = createMockUserTableData();
  const mockPostTableData = createMockPostTableData();
  const mockEmptyTableData = createMockEmptyTableData();

  return jest.fn().mockImplementation((revisionId: string, tableId: string) => {
    switch (tableId) {
      case SystemTables.Schema:
        return Promise.resolve(mockSchemaTableData);
      case SystemTables.SharedSchemas:
        return Promise.resolve(mockEmptyTableData);
      case USER_TABLE_ID:
        return Promise.resolve(mockUserTableData);
      case POST_TABLE_ID:
        return Promise.resolve(mockPostTableData);
    }
  });
};

export const createMockCoreApiResponse = () => ({
  data: {
    endpoint: {
      id: ENDPOINT_ID,
      type: 'GRAPHQL',
    },
    revision: {
      id: REVISION_ID,
      isHead: true,
      isDraft: true,
    },
    branch: {
      id: BRANCH_ID,
      name: BRANCH_NAME,
    },
    project: {
      id: PROJECT_ID,
      name: PROJECT_NAME,
      organizationId: ORGANIZATION_ID,
    },
  },
  error: null,
});

export const createMockInternalCoreApiService = () => ({
  initApi: jest.fn().mockResolvedValue(undefined),
  api: {
    login: jest.fn().mockResolvedValue({
      data: { accessToken: 'mock-token' },
      error: null,
    }),
    endpointRelatives: jest.fn().mockResolvedValue(createMockCoreApiResponse()),
    rows: createRowsMock(),
    endpoints: jest.fn().mockResolvedValue({
      data: {
        edges: [],
        totalCount: 0,
      },
      error: null,
    }),
  },
});

export const createMockProxyCoreApiService = () => ({
  api: {
    endpointRelatives: jest.fn().mockResolvedValue(createMockCoreApiResponse()),
    rows: createRowsMock(),
  },
});
