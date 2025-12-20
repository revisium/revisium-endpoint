import { nanoid } from 'nanoid';
import {
  getObjectSchema,
  getStringSchema,
  getNumberSchema,
} from '@revisium/schema-toolkit/mocks';
import { SystemTables } from 'src/endpoint-microservice/shared/system-tables.consts';
import {
  OrderByDto,
  RowWhereInputDto,
} from 'src/endpoint-microservice/core-api/generated/api';

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
    age: getNumberSchema(),
  });

export const createPostSchema = () =>
  getObjectSchema({
    title: getStringSchema(),
    content: getStringSchema(),
    views: getNumberSchema(),
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

export const user1 = {
  id: 'user-1',
  versionId: 'v1',
  createdAt: '2024-01-01T00:00:00Z',
  readonly: false,
  data: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    age: 30,
  },
};

export const user2 = {
  id: 'user-2',
  versionId: 'v2',
  createdAt: '2024-01-02T00:00:00Z',
  readonly: false,
  data: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    age: 25,
  },
};

export const user3 = {
  id: 'user-3',
  versionId: 'v3',
  createdAt: '2024-01-03T00:00:00Z',
  readonly: true,
  data: {
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@example.com',
    age: 35,
  },
};

export const allUsers = [user1, user2, user3];

export const createMockUserTableData = (
  orderBy?: OrderByDto[],
  where?: RowWhereInputDto,
) => {
  let filteredUsers = [...allUsers];

  if (where) {
    if (where.id?.equals) {
      filteredUsers = filteredUsers.filter((u) => u.id === where.id?.equals);
    }
    if (where.id?.contains) {
      filteredUsers = filteredUsers.filter((u) =>
        u.id.includes(where.id?.contains as string),
      );
    }
    if (where.id?.startsWith) {
      filteredUsers = filteredUsers.filter((u) =>
        u.id.startsWith(where.id?.startsWith as string),
      );
    }
    if (where.readonly?.equals !== undefined) {
      filteredUsers = filteredUsers.filter(
        (u) => u.readonly === where.readonly?.equals,
      );
    }
    if (where.data) {
      const dataFilter = where.data;
      if (dataFilter.path && dataFilter.gte !== undefined) {
        const path = dataFilter.path as string;
        filteredUsers = filteredUsers.filter((u) => {
          const value = (u.data as Record<string, unknown>)[path];
          return (
            typeof value === 'number' && value >= (dataFilter.gte as number)
          );
        });
      }
      if (dataFilter.path && dataFilter.string_contains) {
        const path = dataFilter.path as string;
        filteredUsers = filteredUsers.filter((u) => {
          const value = (u.data as Record<string, unknown>)[path];
          return (
            typeof value === 'string' &&
            value.includes(dataFilter.string_contains as string)
          );
        });
      }
    }
  }

  if (orderBy && orderBy.length > 0) {
    const sortField = orderBy[0];
    filteredUsers.sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (sortField.field === 'id') {
        aVal = a.id;
        bVal = b.id;
      } else if (sortField.field === 'createdAt') {
        aVal = a.createdAt;
        bVal = b.createdAt;
      } else if (sortField.field === 'data' && sortField.path) {
        aVal = (a.data as Record<string, unknown>)[sortField.path];
        bVal = (b.data as Record<string, unknown>)[sortField.path];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortField.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortField.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }

  return {
    data: {
      edges: filteredUsers.map((user) => ({
        cursor: user.id,
        node: user,
      })),
      pageInfo: {
        startCursor: filteredUsers[0]?.id || null,
        endCursor: filteredUsers[filteredUsers.length - 1]?.id || null,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      totalCount: filteredUsers.length,
    },
    error: null,
  };
};

export const createMockEmptyTableData = () => ({
  data: {
    edges: [],
    pageInfo: {
      startCursor: null,
      endCursor: null,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    totalCount: 0,
  },
  error: null,
});

export const createRowsMock = () => {
  const mockSchemaTableData = createMockSchemaTableData();
  const mockEmptyTableData = createMockEmptyTableData();

  return jest.fn().mockImplementation(
    (
      revisionId: string,
      tableId: string,
      params?: {
        first?: number;
        after?: string;
        orderBy?: OrderByDto[];
        where?: RowWhereInputDto;
      },
    ) => {
      switch (tableId) {
        case SystemTables.Schema:
          return Promise.resolve(mockSchemaTableData);
        case SystemTables.SharedSchemas:
          return Promise.resolve(mockEmptyTableData);
        case USER_TABLE_ID:
          return Promise.resolve(
            createMockUserTableData(params?.orderBy, params?.where),
          );
        case POST_TABLE_ID:
          return Promise.resolve(mockEmptyTableData);
        default:
          return Promise.resolve(mockEmptyTableData);
      }
    },
  );
};

export const createRowMock = () => {
  return jest
    .fn()
    .mockImplementation(
      (revisionId: string, tableId: string, rowId: string) => {
        if (tableId === USER_TABLE_ID) {
          const user = allUsers.find((u) => u.id === rowId);
          return Promise.resolve({ data: user || null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    );
};

export const createMockCoreApiResponse = () => ({
  data: {
    endpoint: {
      id: ENDPOINT_ID,
      type: 'REST_API',
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
    row: createRowMock(),
    revision: jest.fn().mockResolvedValue({
      data: { isDraft: true },
      error: null,
    }),
    tableForeignKeysBy: jest.fn().mockResolvedValue({
      data: { edges: [] },
      error: null,
    }),
    tables: jest.fn().mockResolvedValue({
      data: { totalCount: 2 },
      error: null,
    }),
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
    row: createRowMock(),
    revision: jest.fn().mockResolvedValue({
      data: { isDraft: true },
      error: null,
    }),
    tableForeignKeysBy: jest.fn().mockResolvedValue({
      data: { edges: [] },
      error: null,
    }),
  },
});

export const createMockPrismaService = () => ({
  endpoint: {
    findMany: jest.fn().mockResolvedValue([]),
    findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: ENDPOINT_ID,
      type: 'REST_API',
      revision: {
        id: REVISION_ID,
        isHead: true,
        isDraft: true,
        branch: {
          id: BRANCH_ID,
          name: BRANCH_NAME,
          project: {
            id: PROJECT_ID,
            name: PROJECT_NAME,
            organizationId: ORGANIZATION_ID,
          },
        },
      },
    }),
  },
});
