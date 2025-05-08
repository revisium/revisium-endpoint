import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLSchema } from 'graphql/type';
import { join } from 'path';
import { printSchema } from 'graphql/utilities';
import { getObjectSchema, getStringSchema } from 'src/__tests__/schema.mocks';
import { GraphQLSchemaConverter } from 'src/endpoint-microservice/graphql/graphql-schema.converter';
import * as fs from 'node:fs/promises';
import { ConverterTable } from 'src/endpoint-microservice/shared/converter';

describe('GraphQL Schema Converter', () => {
  it('empty schema', async () => {
    const schema = await converter.convert([]);
    expect(printSchema(schema)).toBe('');
  });

  it('simple schema', async () => {
    const table: ConverterTable = {
      id: 'user',
      versionId: '1',
      schema: getObjectSchema({
        field: getStringSchema(),
      }),
    };

    const schema = await converter.convert([table]);
    await check(schema, 'simple-user.graphql');
  });

  async function check(schema: GraphQLSchema, schemaPath: string) {
    const file = await fs.readFile(
      join(__dirname, 'schemas', schemaPath),
      'utf8',
    );

    expect(printSchema(schema)).toBe(file);
  }

  let converter: GraphQLSchemaConverter;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphQLSchemaConverter],
    }).compile();

    converter = module.get(GraphQLSchemaConverter);
  });
});
