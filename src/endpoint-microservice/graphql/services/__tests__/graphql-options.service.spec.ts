import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLOptionsService } from '../graphql-options.service';

describe('GraphQLOptionsService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('GRAPHQL_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createService = async (): Promise<GraphQLOptionsService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphQLOptionsService],
    }).compile();

    return module.get<GraphQLOptionsService>(GraphQLOptionsService);
  };

  describe('getOptions', () => {
    it('should return undefined when no GRAPHQL_* environment variables are set', async () => {
      const service = await createService();
      expect(service.getOptions()).toBeUndefined();
    });

    it('should return options when GRAPHQL_* environment variables are set', async () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = 'Custom';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        hideNodeTypes: true,
        flatPostfix: 'Custom',
      });
    });

    it('should handle all supported environment variables', async () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'false';
      process.env.GRAPHQL_FLAT_POSTFIX = 'Flat';
      process.env.GRAPHQL_NODE_POSTFIX = '';
      process.env.GRAPHQL_PREFIX_FOR_TABLES = 'Custom';
      process.env.GRAPHQL_PREFIX_FOR_COMMON = 'Common';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        hideNodeTypes: true,
        hideFlatTypes: false,
        flatPostfix: 'Flat',
        nodePostfix: '',
        prefixForTables: 'Custom',
        prefixForCommon: 'Common',
      });
    });
  });

  describe('boolean validation', () => {
    it('should parse valid boolean values', async () => {
      const testCases = [
        { input: 'true', expected: true },
        { input: 'TRUE', expected: true },
        { input: 'True', expected: true },
        { input: '1', expected: true },
        { input: 'false', expected: false },
        { input: 'FALSE', expected: false },
        { input: 'False', expected: false },
        { input: '0', expected: false },
        { input: ' true ', expected: true },
        { input: ' false ', expected: false },
      ];

      for (const { input, expected } of testCases) {
        Object.keys(process.env).forEach((key) => {
          if (key.startsWith('GRAPHQL_')) {
            delete process.env[key];
          }
        });

        process.env.GRAPHQL_HIDE_NODE_TYPES = input;
        const service = await createService();
        expect(service.getOptions()?.hideNodeTypes).toBe(expected);
      }
    });

    it('should throw error for invalid boolean values', async () => {
      const invalidValues = ['yes', 'no', 'invalid', '2', 'truthy', 'falsy'];

      for (const value of invalidValues) {
        Object.keys(process.env).forEach((key) => {
          if (key.startsWith('GRAPHQL_')) {
            delete process.env[key];
          }
        });

        process.env.GRAPHQL_HIDE_NODE_TYPES = value;
        await expect(createService()).rejects.toThrow(
          `Invalid boolean value for GRAPHQL_HIDE_NODE_TYPES: ${value}. Expected: true, false, 1, or 0`,
        );
      }
    });
  });

  describe('GraphQL identifier validation', () => {
    it('should accept valid GraphQL identifiers', async () => {
      const validIdentifiers = [
        '',
        '_',
        'A',
        'abc',
        'ABC',
        '_abc',
        'a123',
        '_a123b_',
        'MyCustomPrefix',
      ];

      for (const identifier of validIdentifiers) {
        Object.keys(process.env).forEach((key) => {
          if (key.startsWith('GRAPHQL_')) {
            delete process.env[key];
          }
        });

        process.env.GRAPHQL_PREFIX_FOR_TABLES = identifier;
        const service = await createService();
        expect(service.getOptions()?.prefixForTables).toBe(identifier);
      }
    });

    it('should reject invalid GraphQL identifiers', async () => {
      const invalidIdentifiers = [
        '123',
        '123abc',
        'abc-def',
        'abc def',
        'abc.def',
        'abc@def',
        'abc#def',
        'abc$def',
      ];

      for (const identifier of invalidIdentifiers) {
        Object.keys(process.env).forEach((key) => {
          if (key.startsWith('GRAPHQL_')) {
            delete process.env[key];
          }
        });

        process.env.GRAPHQL_PREFIX_FOR_TABLES = identifier;
        await expect(createService()).rejects.toThrow(
          `Invalid GraphQL identifier for GRAPHQL_PREFIX_FOR_TABLES: ${identifier}`,
        );
      }
    });

    it('should validate all prefix/postfix environment variables', async () => {
      const envVars = [
        'GRAPHQL_FLAT_POSTFIX',
        'GRAPHQL_NODE_POSTFIX',
        'GRAPHQL_PREFIX_FOR_TABLES',
        'GRAPHQL_PREFIX_FOR_COMMON',
      ];

      for (const envVar of envVars) {
        Object.keys(process.env).forEach((key) => {
          if (key.startsWith('GRAPHQL_')) {
            delete process.env[key];
          }
        });

        process.env[envVar] = 'invalid-identifier';
        await expect(createService()).rejects.toThrow(
          `Invalid GraphQL identifier for ${envVar}: invalid-identifier`,
        );
      }
    });
  });

  describe('postfix mutual exclusivity validation', () => {
    it('should allow flatPostfix with non-empty value', async () => {
      process.env.GRAPHQL_FLAT_POSTFIX = 'Custom';

      const service = await createService();
      expect(service.getOptions()?.flatPostfix).toBe('Custom');
    });

    it('should allow nodePostfix with non-empty value', async () => {
      process.env.GRAPHQL_NODE_POSTFIX = 'Detailed';

      const service = await createService();
      expect(service.getOptions()?.nodePostfix).toBe('Detailed');
    });

    it('should allow one empty and one non-empty postfix', async () => {
      process.env.GRAPHQL_FLAT_POSTFIX = '';
      process.env.GRAPHQL_NODE_POSTFIX = 'Custom';

      const service = await createService();
      const options = service.getOptions();
      expect(options?.flatPostfix).toBe('');
      expect(options?.nodePostfix).toBe('Custom');
    });

    it('should allow both non-empty postfixes', async () => {
      process.env.GRAPHQL_FLAT_POSTFIX = 'Flat';
      process.env.GRAPHQL_NODE_POSTFIX = 'Node';

      const service = await createService();
      const options = service.getOptions();
      expect(options?.flatPostfix).toBe('Flat');
      expect(options?.nodePostfix).toBe('Node');
    });

    it('should reject both postfixes being empty', async () => {
      process.env.GRAPHQL_FLAT_POSTFIX = '';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      await expect(createService()).rejects.toThrow(
        'GRAPHQL_FLAT_POSTFIX and GRAPHQL_NODE_POSTFIX cannot both be empty at the same time. At least one must have a value or be undefined.',
      );
    });

    it('should reject flat postfix being empty when node postfix is undefined', async () => {
      process.env.GRAPHQL_FLAT_POSTFIX = '';

      await expect(createService()).rejects.toThrow(
        'Conflicting postfix configuration: at least one postfix must have a value when the other is empty.',
      );
    });

    it('should reject node postfix being empty when flat postfix is undefined', async () => {
      process.env.GRAPHQL_NODE_POSTFIX = '';

      await expect(createService()).rejects.toThrow(
        'Conflicting postfix configuration: at least one postfix must have a value when the other is empty.',
      );
    });

    it('should allow undefined postfixes (not set)', async () => {
      const service = await createService();
      expect(service.getOptions()).toBeUndefined();
    });

    it('should allow flat postfix empty when node types are hidden', async () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = '';

      const service = await createService();
      const options = service.getOptions();
      expect(options?.hideNodeTypes).toBe(true);
      expect(options?.flatPostfix).toBe('');
    });

    it('should allow node postfix empty when flat types are hidden', async () => {
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'true';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      const service = await createService();
      const options = service.getOptions();
      expect(options?.hideFlatTypes).toBe(true);
      expect(options?.nodePostfix).toBe('');
    });

    it('should allow both postfixes empty when both types are hidden', async () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = '';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      const service = await createService();
      const options = service.getOptions();
      expect(options?.hideNodeTypes).toBe(true);
      expect(options?.hideFlatTypes).toBe(true);
      expect(options?.flatPostfix).toBe('');
      expect(options?.nodePostfix).toBe('');
    });

    it('should allow flat postfix empty and node undefined when node types are hidden', async () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = '';

      const service = await createService();
      const options = service.getOptions();
      expect(options?.hideNodeTypes).toBe(true);
      expect(options?.flatPostfix).toBe('');
      expect(options?.nodePostfix).toBeUndefined();
    });

    it('should allow node postfix empty and flat undefined when flat types are hidden', async () => {
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'true';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      const service = await createService();
      const options = service.getOptions();
      expect(options?.hideFlatTypes).toBe(true);
      expect(options?.nodePostfix).toBe('');
      expect(options?.flatPostfix).toBeUndefined();
    });
  });

  describe('integration tests', () => {
    it('should work with real environment variable scenarios', async () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'false';

      let service = await createService();
      let options = service.getOptions();
      expect(options).toEqual({
        hideNodeTypes: true,
        hideFlatTypes: false,
      });

      Object.keys(process.env).forEach((key) => {
        if (key.startsWith('GRAPHQL_')) {
          delete process.env[key];
        }
      });

      process.env.GRAPHQL_PREFIX_FOR_TABLES = 'Custom';
      process.env.GRAPHQL_FLAT_POSTFIX = 'Flattened';
      process.env.GRAPHQL_NODE_POSTFIX = 'Detailed';

      service = await createService();
      options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: 'Custom',
        flatPostfix: 'Flattened',
        nodePostfix: 'Detailed',
      });
    });

    it('should handle microservice startup scenario', async () => {
      process.env.GRAPHQL_PREFIX_FOR_TABLES = '';
      process.env.GRAPHQL_PREFIX_FOR_COMMON = '';
      process.env.GRAPHQL_FLAT_POSTFIX = 'Custom';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: '',
        prefixForCommon: '',
        flatPostfix: 'Custom',
        nodePostfix: '',
      });
    });

    it('should handle hide flag scenarios correctly', async () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      let service = await createService();
      let options = service.getOptions();
      expect(options).toEqual({
        hideNodeTypes: true,
        nodePostfix: '',
      });

      Object.keys(process.env).forEach((key) => {
        if (key.startsWith('GRAPHQL_')) {
          delete process.env[key];
        }
      });

      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = '';
      process.env.GRAPHQL_PREFIX_FOR_TABLES = 'Custom';

      service = await createService();
      options = service.getOptions();
      expect(options).toEqual({
        hideFlatTypes: true,
        flatPostfix: '',
        prefixForTables: 'Custom',
      });
    });
  });
});
