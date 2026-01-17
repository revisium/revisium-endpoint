import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLocalStorage } from 'node:async_hooks';
import { GraphQLSchema } from 'graphql/type';
import { ClsService } from 'nestjs-cls';
import { join } from 'path';
import { printSchema } from 'graphql/utilities';
import { GraphqlCachedRowsClsStore } from 'src/endpoint-microservice/graphql/graphql-cls.types';
import { getComplexSchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/__tests__/utils';
import { GRAPHQL_SCHEMA_CONVERTER_SERVICES } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services';
import {
  getArraySchema,
  getBooleanSchema,
  getNumberSchema,
  getObjectSchema,
  getRefSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';
import * as fs from 'node:fs/promises';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { GraphQLSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';
import {
  ConverterContextType,
  ConverterTable,
} from 'src/endpoint-microservice/shared/converter';
import { SystemSchemaIds } from '@revisium/schema-toolkit/consts';

describe('GraphQL Schema Converter', () => {
  it('empty schema', async () => {
    const schema = await converter.convert(
      getContext({
        tables: [],
      }),
    );

    await check(schema, 'empty.graphql.text');
  });

  it('simple schema', async () => {
    const table: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const schema = await converter.convert(
      getContext({
        tables: [table],
      }),
    );
    await check(schema, 'simple.graphql.text');
  });

  it('lower case for table', async () => {
    const table: ConverterTable = {
      id: 'USER',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const schema = await converter.convert(
      getContext({
        tables: [table],
      }),
    );
    await check(schema, 'simple.graphql.text');
  });

  it('camelCase table name with deprecated alias', async () => {
    const table: ConverterTable = {
      id: 'MyTable',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const schema = await converter.convert(
      getContext({
        tables: [table],
      }),
    );
    await check(schema, 'camel-case-table.graphql.text');
  });

  it('few tables', async () => {
    const user: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const post: ConverterTable = {
      id: 'post',
      versionId: '1',
      schema: getObjectSchema({
        title: getStringSchema(),
      }),
    };

    const schemaUserPost = await converter.convert(
      getContext({
        tables: [user, post],
      }),
    );
    await check(schemaUserPost, 'few-tables.graphql.text');

    //
    const schemaPostUser = await converter.convert(
      getContext({
        tables: [post, user],
      }),
    );
    await check(schemaPostUser, 'few-tables.graphql.text');
  });

  it('complex schema', async () => {
    const schema = await converter.convert(
      getContext({
        tables: [...getComplexSchema()],
      }),
    );
    await check(schema, 'complex.graphql.text');
  });

  it('invalid project name', async () => {
    const table: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const schema = await converter.convert(
      getContext({
        tables: [table],
        projectName: '1',
      }),
    );
    await check(schema, 'invalid-project-name.graphql.text');
  });

  it('invalid table name', async () => {
    const table: ConverterTable = {
      id: '---user',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const schema = await converter.convert(
      getContext({
        tables: [table],
      }),
    );
    await check(schema, 'invalid-table-name.graphql.text');
  });

  it('invalid field name', async () => {
    const table: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        ['--name']: getObjectSchema({
          nestedField: getStringSchema(),
        }),
        field: getObjectSchema({
          otherNestedField: getStringSchema(),
        }),
      }),
    };

    const schema = await converter.convert(
      getContext({
        tables: [table],
      }),
    );
    await check(schema, 'invalid-field-name.graphql.text');
  });

  it('empty object', async () => {
    const user: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const post: ConverterTable = {
      id: 'post',
      versionId: '1',
      schema: getObjectSchema({}),
    };

    const schemaUserPost = await converter.convert(
      getContext({
        tables: [user, post],
      }),
    );
    await check(schemaUserPost, 'empty-object.graphql.text');
  });

  it('nested empty object', async () => {
    const user: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const post: ConverterTable = {
      id: 'post',
      versionId: '1',
      schema: getObjectSchema({
        nested: getObjectSchema({}),
      }),
    };

    const schemaUserPost = await converter.convert(
      getContext({
        tables: [user, post],
      }),
    );
    await check(schemaUserPost, 'nested-empty-object.graphql.text');
  });

  it('nested empty object with field', async () => {
    const user: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        name: getStringSchema(),
      }),
    };

    const post: ConverterTable = {
      id: 'post',
      versionId: '1',
      schema: getObjectSchema({
        field: getStringSchema(),
        nested: getObjectSchema({}),
      }),
    };

    const schemaUserPost = await converter.convert(
      getContext({
        tables: [user, post],
      }),
    );
    await check(schemaUserPost, 'nested-empty-object-with-field.graphql.text');
  });

  describe('root', () => {
    it('string root', async () => {
      const table: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getStringSchema(),
      };

      const schema = await converter.convert(
        getContext({
          tables: [table],
        }),
      );
      await check(schema, 'root/string.graphql.text');
    });

    it('number root', async () => {
      const table: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getNumberSchema(),
      };

      const schema = await converter.convert(
        getContext({
          tables: [table],
        }),
      );
      await check(schema, 'root/number.graphql.text');
    });

    it('boolean root', async () => {
      const table: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getBooleanSchema(),
      };

      const schema = await converter.convert(
        getContext({
          tables: [table],
        }),
      );
      await check(schema, 'root/boolean.graphql.text');
    });

    it('array string root', async () => {
      const table: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getArraySchema(getStringSchema()),
      };

      const schema = await converter.convert(
        getContext({
          tables: [table],
          revisionId,
        }),
      );
      await check(schema, 'root/array-string.graphql.text');
    });

    it('array array object root', async () => {
      const table: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getArraySchema(
          getArraySchema(
            getObjectSchema({
              name: getStringSchema(),
            }),
          ),
        ),
      };

      const schema = await converter.convert(
        getContext({
          tables: [table],
          revisionId,
        }),
      );
      await check(schema, 'root/array-array-object.graphql.text');
    });
  });

  describe('unique', () => {
    it('similar table', async () => {
      const user1: ConverterTable = {
        id: 'uSer',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
        }),
      };

      const user2: ConverterTable = {
        id: 'UsER',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [user1, user2],
        }),
      );
      await check(schema, 'unique/similar-table.graphql.text');
    });

    it('similar field', async () => {
      const user: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getObjectSchema({
          naMe: getObjectSchema({
            name: getStringSchema(),
          }),
          NAmE: getObjectSchema({
            name: getStringSchema(),
          }),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [user],
        }),
      );
      await check(schema, 'unique/similar-field.graphql.text');
    });
  });

  describe('foreign key', () => {
    it('simple', async () => {
      const user: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getObjectSchema({
          post: getStringSchema({ foreignKey: 'post' }),
        }),
      };

      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [user, post],
        }),
      );
      await check(schema, 'foreign-key/simple.graphql.text');
    });

    it('array object', async () => {
      const user: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
          posts: getArraySchema(
            getObjectSchema({
              title: getStringSchema(),
              postId: getStringSchema({ foreignKey: 'post' }),
            }),
          ),
        }),
      };

      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [user, post],
        }),
      );
      await check(schema, 'foreign-key/array-object.graphql.text');
    });

    it('array string', async () => {
      const user: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getObjectSchema({
          posts: getArraySchema(getStringSchema({ foreignKey: 'post' })),
        }),
      };

      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [user, post],
        }),
      );
      await check(schema, 'foreign-key/array-string.graphql.text');
    });

    it('root string', async () => {
      const user: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getStringSchema({ foreignKey: 'post' }),
      };

      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [user, post],
        }),
      );
      await check(schema, 'foreign-key/root-string.graphql.text');
    });

    it('root array string', async () => {
      const user: ConverterTable = {
        id: 'user',
        versionId: '1',
        schema: getArraySchema(getStringSchema({ foreignKey: 'post' })),
      };

      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          name: getStringSchema(),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [user, post],
        }),
      );
      await check(schema, 'foreign-key/root-array-string.graphql.text');
    });
  });

  describe('description and deprecated', () => {
    it('description', async () => {
      const name = getStringSchema();
      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          name,
        }),
      };

      name.description = 'description';

      const schema = await converter.convert(
        getContext({
          tables: [post],
        }),
      );
      await check(schema, 'shared-fields/description.graphql.text');
    });

    it('description and deprecated', async () => {
      const name = getStringSchema();
      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          name,
        }),
      };

      name.description = 'description';
      name.deprecated = true;

      const schema = await converter.convert(
        getContext({
          tables: [post],
        }),
      );
      await check(schema, 'shared-fields/description-deprecated.graphql.text');
    });

    it('nested description', async () => {
      const name = getStringSchema();
      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          nested: getObjectSchema({
            name,
          }),
        }),
      };

      name.description = 'description';

      const schema = await converter.convert(
        getContext({
          tables: [post],
        }),
      );
      await check(schema, 'shared-fields/nested-description.graphql.text');
    });
  });

  describe('refs', () => {
    it('file', async () => {
      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          file: getRefSchema(SystemSchemaIds.File),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [post],
        }),
      );
      await check(schema, 'refs/file.graphql.text');
    });

    it('id', async () => {
      const post: ConverterTable = {
        id: 'post',
        versionId: '1',
        schema: getObjectSchema({
          customId: getRefSchema(SystemSchemaIds.RowId),
        }),
      };

      const schema = await converter.convert(
        getContext({
          tables: [post],
        }),
      );
      await check(schema, 'refs/custom-id.graphql.text');
    });
  });

  describe('options', () => {
    it('hide flat', async () => {
      const schema = await converter.convert(
        getContext({
          tables: [...getComplexSchema()],
          options: {
            hideFlatTypes: true,
          },
        }),
      );
      await check(schema, 'options/hide-flat.graphql.text');
    });

    it('hide node', async () => {
      const schema = await converter.convert(
        getContext({
          tables: [...getComplexSchema()],
          options: {
            hideNodeTypes: true,
          },
        }),
      );
      await check(schema, 'options/hide-node.graphql.text');
    });

    it('prefix for table', async () => {
      await check(
        await converter.convert(
          getContext({
            tables: [...getComplexSchema()],
            options: {
              prefixForTables: '',
            },
          }),
        ),
        'options/prefix-for-table-1.graphql.text',
      );

      await check(
        await converter.convert(
          getContext({
            tables: [...getComplexSchema()],
            options: {
              prefixForTables: 'Custom',
            },
          }),
        ),
        'options/prefix-for-table-2.graphql.text',
      );
    });

    it('prefix for common', async () => {
      await check(
        await converter.convert(
          getContext({
            tables: [...getComplexSchema()],
            options: {
              prefixForCommon: '',
            },
          }),
        ),
        'options/prefix-for-common-1.graphql.text',
      );

      await check(
        await converter.convert(
          getContext({
            tables: [...getComplexSchema()],
            options: {
              prefixForCommon: 'Custom',
            },
          }),
        ),
        'options/prefix-for-common-2.graphql.text',
      );
    });

    it('postfix', async () => {
      await check(
        await converter.convert(
          getContext({
            tables: [...getComplexSchema()],
            options: {
              prefixForCommon: '',
              prefixForTables: '',
              flatPostfix: '',
              nodePostfix: 'Detailed',
            },
          }),
        ),
        'options/postfix-1.graphql.text',
      );

      await check(
        await converter.convert(
          getContext({
            tables: [...getComplexSchema()],
            options: {
              prefixForCommon: '',
              prefixForTables: '',
              flatPostfix: 'Custom',
              nodePostfix: '',
            },
          }),
        ),
        'options/postfix-2.graphql.text',
      );

      await check(
        await converter.convert(
          getContext({
            tables: [...getComplexSchema()],
            options: {
              flatPostfix: 'Custom',
              nodePostfix: 'Detailed',
            },
          }),
        ),
        'options/postfix-3.graphql.text',
      );
    });
  });

  function getContext(
    data: Partial<ConverterContextType>,
  ): ConverterContextType {
    return {
      tables: [],
      projectId: '1',
      projectName: 'project',
      endpointId: '1',
      isDraft: false,
      revisionId: '1',
      ...data,
    };
  }

  async function check(schema: GraphQLSchema, schemaPath: string) {
    const fullPath = join(__dirname, 'schemas', schemaPath);
    let file: string;

    try {
      file = await fs.readFile(fullPath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.writeFile(fullPath, printSchema(schema), 'utf8');
        console.log(`Snapshot created: ${fullPath}`);
        return;
      }
      throw err;
    }

    const normalizeLineEndings = (str: string) =>
      str.replace(/\r\n|\r/g, '\n').trim();

    expect(normalizeLineEndings(printSchema(schema))).toBe(
      normalizeLineEndings(file),
    );
  }
  const revisionId = '1';
  let converter: GraphQLSchemaConverter;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphQLSchemaConverter,
        ...GRAPHQL_SCHEMA_CONVERTER_SERVICES,
        ProxyCoreApiService,
        {
          provide: AsyncLocalStorage,
          useValue: new AsyncLocalStorage(),
        },
        {
          provide: ClsService<GraphqlCachedRowsClsStore>,
          useValue: { cachedRows: new Map() },
        },
      ],
    })
      .overrideProvider(ProxyCoreApiService)
      .useValue({})
      .compile();

    converter = module.get(GraphQLSchemaConverter);
  });
});
