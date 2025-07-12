import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLOptionsService } from '../graphql-options.service';

describe('GraphQLOptionsService', () => {
  let service: GraphQLOptionsService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };

    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('GRAPHQL_')) {
        delete process.env[key];
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphQLOptionsService],
    }).compile();

    service = module.get<GraphQLOptionsService>(GraphQLOptionsService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getOptions', () => {
    it('should return undefined when no GRAPHQL_* environment variables are set', () => {
      service.onApplicationBootstrap();
      expect(service.getOptions()).toBeUndefined();
    });

    it('should return options when GRAPHQL_* environment variables are set', () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = 'Custom';

      service.onApplicationBootstrap();

      const options = service.getOptions();
      expect(options).toEqual({
        hideNodeTypes: true,
        flatPostfix: 'Custom',
      });
    });

    it('should handle all supported environment variables', () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'false';
      process.env.GRAPHQL_FLAT_POSTFIX = 'Flat';
      process.env.GRAPHQL_NODE_POSTFIX = '';
      process.env.GRAPHQL_PREFIX_FOR_TABLES = 'Custom';
      process.env.GRAPHQL_PREFIX_FOR_COMMON = 'Common';

      service.onApplicationBootstrap();

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
    it('should parse valid boolean values', () => {
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

      testCases.forEach(({ input, expected }) => {
        process.env.GRAPHQL_HIDE_NODE_TYPES = input;
        service.onApplicationBootstrap();
        expect(service.getOptions()?.hideNodeTypes).toBe(expected);
      });
    });

    it('should throw error for invalid boolean values', () => {
      const invalidValues = ['yes', 'no', 'invalid', '2', 'truthy', 'falsy'];

      invalidValues.forEach((value) => {
        process.env.GRAPHQL_HIDE_NODE_TYPES = value;
        expect(() => service.onApplicationBootstrap()).toThrow(
          `Invalid boolean value for GRAPHQL_HIDE_NODE_TYPES: ${value}. Expected: true, false, 1, or 0`,
        );
      });
    });
  });

  describe('GraphQL identifier validation', () => {
    it('should accept valid GraphQL identifiers', () => {
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

      validIdentifiers.forEach((identifier) => {
        process.env.GRAPHQL_PREFIX_FOR_TABLES = identifier;
        expect(() => service.onApplicationBootstrap()).not.toThrow();
        service.onApplicationBootstrap();
        expect(service.getOptions()?.prefixForTables).toBe(identifier);
      });
    });

    it('should reject invalid GraphQL identifiers', () => {
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

      invalidIdentifiers.forEach((identifier) => {
        process.env.GRAPHQL_PREFIX_FOR_TABLES = identifier;
        expect(() => service.onApplicationBootstrap()).toThrow(
          `Invalid GraphQL identifier for GRAPHQL_PREFIX_FOR_TABLES: ${identifier}`,
        );
      });
    });

    it('should validate all prefix/postfix environment variables', () => {
      const envVars = [
        'GRAPHQL_FLAT_POSTFIX',
        'GRAPHQL_NODE_POSTFIX',
        'GRAPHQL_PREFIX_FOR_TABLES',
        'GRAPHQL_PREFIX_FOR_COMMON',
      ];

      envVars.forEach((envVar) => {
        process.env[envVar] = 'invalid-identifier';
        expect(() => service.onApplicationBootstrap()).toThrow(
          `Invalid GraphQL identifier for ${envVar}: invalid-identifier`,
        );
        delete process.env[envVar];
      });
    });
  });

  describe('postfix mutual exclusivity validation', () => {
    it('should allow flatPostfix with non-empty value', () => {
      process.env.GRAPHQL_FLAT_POSTFIX = 'Custom';
      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      expect(service.getOptions()?.flatPostfix).toBe('Custom');
    });

    it('should allow nodePostfix with non-empty value', () => {
      process.env.GRAPHQL_NODE_POSTFIX = 'Detailed';
      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      expect(service.getOptions()?.nodePostfix).toBe('Detailed');
    });

    it('should allow one empty and one non-empty postfix', () => {
      process.env.GRAPHQL_FLAT_POSTFIX = '';
      process.env.GRAPHQL_NODE_POSTFIX = 'Custom';
      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options?.flatPostfix).toBe('');
      expect(options?.nodePostfix).toBe('Custom');
    });

    it('should allow both non-empty postfixes', () => {
      process.env.GRAPHQL_FLAT_POSTFIX = 'Flat';
      process.env.GRAPHQL_NODE_POSTFIX = 'Node';
      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options?.flatPostfix).toBe('Flat');
      expect(options?.nodePostfix).toBe('Node');
    });

    it('should reject both postfixes being empty', () => {
      process.env.GRAPHQL_FLAT_POSTFIX = '';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).toThrow(
        'GRAPHQL_FLAT_POSTFIX and GRAPHQL_NODE_POSTFIX cannot both be empty at the same time. At least one must have a value or be undefined.',
      );
    });

    it('should reject flat postfix being empty when node postfix is undefined', () => {
      process.env.GRAPHQL_FLAT_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).toThrow(
        'Conflicting postfix configuration: at least one postfix must have a value when the other is empty.',
      );
    });

    it('should reject node postfix being empty when flat postfix is undefined', () => {
      process.env.GRAPHQL_NODE_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).toThrow(
        'Conflicting postfix configuration: at least one postfix must have a value when the other is empty.',
      );
    });

    it('should allow undefined postfixes (not set)', () => {
      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      expect(service.getOptions()).toBeUndefined();
    });

    it('should allow flat postfix empty when node types are hidden', () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options?.hideNodeTypes).toBe(true);
      expect(options?.flatPostfix).toBe('');
    });

    it('should allow node postfix empty when flat types are hidden', () => {
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'true';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options?.hideFlatTypes).toBe(true);
      expect(options?.nodePostfix).toBe('');
    });

    it('should allow both postfixes empty when both types are hidden', () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = '';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options?.hideNodeTypes).toBe(true);
      expect(options?.hideFlatTypes).toBe(true);
      expect(options?.flatPostfix).toBe('');
      expect(options?.nodePostfix).toBe('');
    });

    it('should allow flat postfix empty and node undefined when node types are hidden', () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_FLAT_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options?.hideNodeTypes).toBe(true);
      expect(options?.flatPostfix).toBe('');
      expect(options?.nodePostfix).toBeUndefined();
    });

    it('should allow node postfix empty and flat undefined when flat types are hidden', () => {
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'true';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options?.hideFlatTypes).toBe(true);
      expect(options?.nodePostfix).toBe('');
      expect(options?.flatPostfix).toBeUndefined();
    });
  });

  describe('integration tests', () => {
    it('should work with real environment variable scenarios', () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_HIDE_FLAT_TYPES = 'false';

      service.onApplicationBootstrap();
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

      service.onApplicationBootstrap();
      options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: 'Custom',
        flatPostfix: 'Flattened',
        nodePostfix: 'Detailed',
      });
    });

    it('should handle microservice startup scenario', () => {
      process.env.GRAPHQL_PREFIX_FOR_TABLES = '';
      process.env.GRAPHQL_PREFIX_FOR_COMMON = '';
      process.env.GRAPHQL_FLAT_POSTFIX = 'Custom';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: '',
        prefixForCommon: '',
        flatPostfix: 'Custom',
        nodePostfix: '',
      });
    });

    it('should handle hide flag scenarios correctly', () => {
      process.env.GRAPHQL_HIDE_NODE_TYPES = 'true';
      process.env.GRAPHQL_NODE_POSTFIX = '';

      expect(() => service.onApplicationBootstrap()).not.toThrow();

      service.onApplicationBootstrap();
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

      service.onApplicationBootstrap();
      options = service.getOptions();
      expect(options).toEqual({
        hideFlatTypes: true,
        flatPostfix: '',
        prefixForTables: 'Custom',
      });
    });
  });
});
