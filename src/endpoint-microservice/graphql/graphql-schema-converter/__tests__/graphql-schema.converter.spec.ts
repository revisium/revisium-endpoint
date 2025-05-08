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
} from 'src/__tests__/schema.mocks';
import * as fs from 'node:fs/promises';
import { ProxyCoreApiService } from 'src/endpoint-microservice/core-api/proxy-core-api.service';
import { GraphQLSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';
import { ConverterTable } from 'src/endpoint-microservice/shared/converter';

describe('GraphQL Schema Converter', () => {
  it('empty schema', async () => {
    const schema = await converter.convert({
      tables: [],
      revisionId,
    });

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

    const schema = await converter.convert({
      tables: [table],
      revisionId,
    });
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

    const schemaUserPost = await converter.convert({
      tables: [user, post],
      revisionId,
    });
    await check(schemaUserPost, 'few-tables.graphql.text');

    //
    const schemaPostUser = await converter.convert({
      tables: [post, user],
      revisionId,
    });
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
        imageIds: getArraySchema(getStringSchema()),
      }),
    };

    const schema = await converter.convert({
      tables: [table],
      revisionId,
    });
    await check(schema, 'complex.graphql.text');
  });

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
