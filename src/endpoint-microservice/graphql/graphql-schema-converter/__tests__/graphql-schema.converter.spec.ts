import { Test, TestingModule } from '@nestjs/testing';
import { AsyncLocalStorage } from 'async_hooks';
import { GraphQLSchema } from 'graphql/type';
import { join } from 'path';
import { printSchema } from 'graphql/utilities';
import {
  getArraySchema,
  getBooleanSchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from 'src/endpoint-microservice/shared/schema';
import * as fs from 'node:fs/promises';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { GraphQLSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';
import {
  ConverterContextType,
  ConverterTable,
} from 'src/endpoint-microservice/shared/converter';

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
    await check(schema, 'simple-user.graphql.text');
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
    await check(schema, 'simple-user.graphql.text');
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
    const table: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        firstName: getStringSchema(),
        lastName: getStringSchema(),
        age: getNumberSchema(),
        adult: getBooleanSchema(),
        address: getObjectSchema({
          zipCode: getNumberSchema(),
          city: getStringSchema(),
          nestedAddress: getObjectSchema({
            zipCode: getStringSchema(),
          }),
        }),
        posts: getArraySchema(
          getObjectSchema({ title: getStringSchema(), id: getStringSchema() }),
        ),
        array: getArraySchema(
          getArraySchema(
            getArraySchema(
              getObjectSchema({
                nested: getStringSchema(),
              }),
            ),
          ),
        ),
        imageIds: getArraySchema(getStringSchema()),
      }),
    };

    const schema = await converter.convert(
      getContext({
        tables: [table],
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
      await check(schema, 'unique/table-id.graphql.text');
    });

    it('similar field', async () => {
      const user: ConverterTable = {
        id: 'uSer',
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
      await check(schema, 'unique/field.graphql.text');
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
    const file = await fs.readFile(
      join(__dirname, 'schemas', schemaPath),
      'utf8',
    );

    expect(printSchema(schema)).toBe(file);
  }

  const revisionId = '1';
  let converter: GraphQLSchemaConverter;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphQLSchemaConverter,
        ProxyCoreApiService,
        {
          provide: AsyncLocalStorage,
          useValue: new AsyncLocalStorage(),
        },
      ],
    })
      .overrideProvider(ProxyCoreApiService)
      .useValue({})
      .compile();

    converter = module.get(GraphQLSchemaConverter);
  });
});
