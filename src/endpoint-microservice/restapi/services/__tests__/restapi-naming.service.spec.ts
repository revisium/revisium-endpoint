import { Test, TestingModule } from '@nestjs/testing';
import { RestapiNamingService } from '../restapi-naming.service';
import { RestapiOptionsService } from '../restapi-options.service';

describe('RestapiNamingService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('RESTAPI_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createService = async (): Promise<RestapiNamingService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RestapiNamingService, RestapiOptionsService],
    }).compile();

    return module.get<RestapiNamingService>(RestapiNamingService);
  };

  describe('getUrlPaths (singular/plural like GraphQL)', () => {
    it('should return singular and plural paths without prefix', async () => {
      const service = await createService();
      const paths = service.getUrlPaths('user');
      expect(paths.singular).toBe('user');
      expect(paths.plural).toBe('users');
    });

    it('should handle table names ending with s', async () => {
      const service = await createService();
      const paths = service.getUrlPaths('users');
      expect(paths.singular).toBe('users');
      expect(paths.plural).toBe('userses');
    });

    it('should handle PascalCase table names', async () => {
      const service = await createService();
      const paths = service.getUrlPaths('BlogPost');
      expect(paths.singular).toBe('blogPost');
      expect(paths.plural).toBe('blogPosts');
    });

    it('should handle underscore in table name', async () => {
      const service = await createService();
      const paths = service.getUrlPaths('blog_post');
      expect(paths.singular).toBe('blog_post');
      expect(paths.plural).toBe('blog_posts');
    });

    it('should sanitize invalid table names', async () => {
      const service = await createService();
      const paths = service.getUrlPaths('123invalid');
      expect(paths.singular).toBe('iNVALID_TABLE_NAME_123invalid');
    });
  });

  describe('getSchemaName (with project prefix)', () => {
    it('should use project name as prefix', async () => {
      const service = await createService();
      expect(service.getSchemaName('users', 'blog')).toBe('BlogUsers');
    });

    it('should capitalize first letter of table name', async () => {
      const service = await createService();
      expect(service.getSchemaName('products', 'shop')).toBe('ShopProducts');
    });

    it('should preserve camelCase in project name', async () => {
      const service = await createService();
      expect(service.getSchemaName('users', 'myProject')).toBe(
        'MyProjectUsers',
      );
    });

    it('should use custom prefix from environment', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Api';
      const service = await createService();
      expect(service.getSchemaName('users', 'blog')).toBe('ApiUsers');
    });

    it('should handle empty prefix', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = '';
      const service = await createService();
      expect(service.getSchemaName('users', 'blog')).toBe('Users');
    });
  });

  describe('getCommonSchemaName', () => {
    it('should use project name as default prefix', async () => {
      const service = await createService();
      expect(service.getCommonSchemaName('StringFilter', 'blog')).toBe(
        'BlogStringFilter',
      );
    });

    it('should use custom prefix from environment', async () => {
      process.env.RESTAPI_PREFIX_FOR_COMMON = 'Common';
      const service = await createService();
      expect(service.getCommonSchemaName('StringFilter', 'blog')).toBe(
        'CommonStringFilter',
      );
    });

    it('should handle empty prefix', async () => {
      process.env.RESTAPI_PREFIX_FOR_COMMON = '';
      const service = await createService();
      expect(service.getCommonSchemaName('StringFilter', 'blog')).toBe(
        'StringFilter',
      );
    });
  });

  describe('getOperationId', () => {
    it('should generate get operationId', async () => {
      const service = await createService();
      expect(service.getOperationId('get', 'users')).toBe('getUsers');
    });

    it('should generate create operationId', async () => {
      const service = await createService();
      expect(service.getOperationId('create', 'users')).toBe('createUsers');
    });

    it('should generate update operationId', async () => {
      const service = await createService();
      expect(service.getOperationId('update', 'users')).toBe('updateUsers');
    });

    it('should generate delete operationId', async () => {
      const service = await createService();
      expect(service.getOperationId('delete', 'users')).toBe('deleteUsers');
    });

    it('should generate list operationId with plural', async () => {
      const service = await createService();
      expect(service.getOperationId('list', 'user')).toBe('getUsers');
    });

    it('should handle PascalCase table names', async () => {
      const service = await createService();
      expect(service.getOperationId('get', 'BlogPost')).toBe('getBlogPost');
      expect(service.getOperationId('list', 'BlogPost')).toBe('getBlogPosts');
    });
  });

  describe('getForeignKeyOperationId', () => {
    it('should generate FK operationId', async () => {
      const service = await createService();
      expect(service.getForeignKeyOperationId('user', 'post')).toBe(
        'getUserForeignKeysByPosts',
      );
    });

    it('should handle table names ending with s', async () => {
      const service = await createService();
      expect(service.getForeignKeyOperationId('users', 'posts')).toBe(
        'getUsersForeignKeysByPostses',
      );
    });
  });

  describe('getPrefixForTables', () => {
    it('should return capitalized project name when no env var set', async () => {
      const service = await createService();
      expect(service.getPrefixForTables('myProject')).toBe('MyProject');
    });

    it('should return env var value when set', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Custom';
      const service = await createService();
      expect(service.getPrefixForTables('myProject')).toBe('Custom');
    });
  });

  describe('getPrefixForCommon', () => {
    it('should return capitalized project name when no env var set', async () => {
      const service = await createService();
      expect(service.getPrefixForCommon('myProject')).toBe('MyProject');
    });

    it('should return env var value when set', async () => {
      process.env.RESTAPI_PREFIX_FOR_COMMON = 'Shared';
      const service = await createService();
      expect(service.getPrefixForCommon('myProject')).toBe('Shared');
    });
  });

  describe('createTableUrlMappings', () => {
    it('should create mappings for all tables', async () => {
      const service = await createService();
      const mappings = service.createTableUrlMappings(['user', 'post'], 'blog');

      expect(mappings).toHaveLength(2);
      expect(mappings[0]).toEqual({
        rawTableId: 'user',
        singularPath: 'user',
        pluralPath: 'users',
        schemaName: 'BlogUser',
        operationIdBase: 'User',
      });
      expect(mappings[1]).toEqual({
        rawTableId: 'post',
        singularPath: 'post',
        pluralPath: 'posts',
        schemaName: 'BlogPost',
        operationIdBase: 'Post',
      });
    });
  });

  describe('getRawTableIdBySingular', () => {
    it('should find raw table id by singular path', async () => {
      const service = await createService();
      const mappings = service.createTableUrlMappings(['user', 'post'], 'blog');

      expect(service.getRawTableIdBySingular('user', mappings)).toBe('user');
      expect(service.getRawTableIdBySingular('post', mappings)).toBe('post');
    });

    it('should return undefined for unknown singular path', async () => {
      const service = await createService();
      const mappings = service.createTableUrlMappings(['user'], 'blog');

      expect(
        service.getRawTableIdBySingular('unknown', mappings),
      ).toBeUndefined();
    });
  });

  describe('getRawTableIdByPlural', () => {
    it('should find raw table id by plural path', async () => {
      const service = await createService();
      const mappings = service.createTableUrlMappings(['user', 'post'], 'blog');

      expect(service.getRawTableIdByPlural('users', mappings)).toBe('user');
      expect(service.getRawTableIdByPlural('posts', mappings)).toBe('post');
    });

    it('should return undefined for unknown plural path', async () => {
      const service = await createService();
      const mappings = service.createTableUrlMappings(['user'], 'blog');

      expect(
        service.getRawTableIdByPlural('unknown', mappings),
      ).toBeUndefined();
    });
  });

  describe('getMapping', () => {
    it('should find mapping by raw table id', async () => {
      const service = await createService();
      const mappings = service.createTableUrlMappings(['user', 'post'], 'blog');

      const mapping = service.getMapping('user', mappings);
      expect(mapping).toBeDefined();
      expect(mapping?.schemaName).toBe('BlogUser');
    });

    it('should return undefined for unknown raw table id', async () => {
      const service = await createService();
      const mappings = service.createTableUrlMappings(['user'], 'blog');

      expect(service.getMapping('unknown', mappings)).toBeUndefined();
    });
  });

  describe('integration tests', () => {
    it('should work with independent prefixes for tables and common', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Api';
      process.env.RESTAPI_PREFIX_FOR_COMMON = 'Common';

      const service = await createService();

      expect(service.getSchemaName('users', 'blog')).toBe('ApiUsers');
      expect(service.getCommonSchemaName('StringFilter', 'blog')).toBe(
        'CommonStringFilter',
      );
    });

    it('should work with only table prefix set', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Api';

      const service = await createService();

      expect(service.getSchemaName('users', 'blog')).toBe('ApiUsers');
      expect(service.getCommonSchemaName('StringFilter', 'blog')).toBe(
        'BlogStringFilter',
      );
    });

    it('should work with only common prefix set', async () => {
      process.env.RESTAPI_PREFIX_FOR_COMMON = 'Common';

      const service = await createService();

      expect(service.getSchemaName('users', 'blog')).toBe('BlogUsers');
      expect(service.getCommonSchemaName('StringFilter', 'blog')).toBe(
        'CommonStringFilter',
      );
    });
  });
});
