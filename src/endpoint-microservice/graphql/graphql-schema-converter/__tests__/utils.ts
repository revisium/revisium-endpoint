import { ConverterTable } from 'src/endpoint-microservice/shared/converter';
import {
  getArraySchema,
  getBooleanSchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from 'src/endpoint-microservice/shared/schema';

export const getComplexSchema = (): ConverterTable => ({
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
});
