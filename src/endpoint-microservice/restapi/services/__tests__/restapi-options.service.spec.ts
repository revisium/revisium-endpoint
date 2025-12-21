import { Test, TestingModule } from '@nestjs/testing';
import { RestapiOptionsService } from '../restapi-options.service';

describe('RestapiOptionsService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  const clearRestapiEnvVars = (): void => {
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith('RESTAPI_')) {
        delete process.env[key];
      }
    });
  };

  beforeEach(() => {
    originalEnv = { ...process.env };
    clearRestapiEnvVars();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createService = async (): Promise<RestapiOptionsService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RestapiOptionsService],
    }).compile();

    return module.get<RestapiOptionsService>(RestapiOptionsService);
  };

  describe('getOptions', () => {
    it('should return undefined when no RESTAPI_* environment variables are set', async () => {
      const service = await createService();
      expect(service.getOptions()).toBeUndefined();
    });

    it('should return options when RESTAPI_* environment variables are set', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Custom';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: 'Custom',
      });
    });

    it('should handle all supported environment variables', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Custom';
      process.env.RESTAPI_PREFIX_FOR_COMMON = 'Common';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: 'Custom',
        prefixForCommon: 'Common',
      });
    });
  });

  describe('identifier validation', () => {
    it('should accept valid identifiers', async () => {
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
        clearRestapiEnvVars();
        process.env.RESTAPI_PREFIX_FOR_TABLES = identifier;
        const service = await createService();
        expect(service.getOptions()?.prefixForTables).toBe(identifier);
      }
    });

    it('should reject invalid identifiers', async () => {
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
        clearRestapiEnvVars();
        process.env.RESTAPI_PREFIX_FOR_TABLES = identifier;
        await expect(createService()).rejects.toThrow(
          `Invalid identifier for RESTAPI_PREFIX_FOR_TABLES: ${identifier}`,
        );
      }
    });

    it('should validate all prefix environment variables', async () => {
      const envVars = [
        'RESTAPI_PREFIX_FOR_TABLES',
        'RESTAPI_PREFIX_FOR_COMMON',
      ];

      for (const envVar of envVars) {
        clearRestapiEnvVars();
        process.env[envVar] = 'invalid-identifier';
        await expect(createService()).rejects.toThrow(
          `Invalid identifier for ${envVar}: invalid-identifier`,
        );
      }
    });
  });

  describe('integration tests', () => {
    it('should work with real environment variable scenarios', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Api';
      process.env.RESTAPI_PREFIX_FOR_COMMON = 'Common';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: 'Api',
        prefixForCommon: 'Common',
      });
    });

    it('should handle empty prefix scenario', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = '';
      process.env.RESTAPI_PREFIX_FOR_COMMON = '';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: '',
        prefixForCommon: '',
      });
    });

    it('should handle only table prefix set', async () => {
      process.env.RESTAPI_PREFIX_FOR_TABLES = 'Custom';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForTables: 'Custom',
      });
      expect(options?.prefixForCommon).toBeUndefined();
    });

    it('should handle only common prefix set', async () => {
      process.env.RESTAPI_PREFIX_FOR_COMMON = 'Shared';

      const service = await createService();
      const options = service.getOptions();
      expect(options).toEqual({
        prefixForCommon: 'Shared',
      });
      expect(options?.prefixForTables).toBeUndefined();
    });
  });
});
