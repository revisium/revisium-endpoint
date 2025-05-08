import { Injectable } from '@nestjs/common';
import { GraphQLSchema } from 'graphql/type';
import {
  Converter,
  ConverterTable,
} from 'src/endpoint-microservice/shared/converter';

@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  constructor() {}

  public async convert(tables: ConverterTable[]): Promise<GraphQLSchema> {
    const schema = new GraphQLSchema({});

    await new Promise((resolve) => setTimeout(resolve, 1));

    return schema;
  }
}
