import { ConverterTable } from 'src/endpoint-microservice/shared/converter';
import {
  getArraySchema,
  getBooleanSchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from '@revisium/schema-toolkit/mocks';

export const getComplexSchema = (): ConverterTable[] => {
  const user: ConverterTable = {
    id: 'user',
    versionId: '1',
    schema: getObjectSchema({
      post: getStringSchema({ foreignKey: 'post' }),
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

  const post: ConverterTable = {
    id: 'post',
    versionId: '1',
    schema: getObjectSchema({
      name: getStringSchema(),
    }),
  };

  return [user, post];
};
