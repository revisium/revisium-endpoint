import {
  CreatingTableOptionsType,
  ValidTableType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { generateFieldAndTypeNames } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/generateFieldAndTypeNames';
import { isEmptyObject } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isEmptyObject';
import { ConverterTable } from 'src/endpoint-microservice/shared/converter';
import { JsonSchemaStore } from '@revisium/schema-toolkit/model';

export const createValidTables = (
  tables: (ConverterTable & { store: JsonSchemaStore })[],
) => {
  const validTables = tables.filter((table) => !isEmptyObject(table.schema));

  const validTableIds = validTables.map((table) => table.id);

  return validTables.reduce<Record<string, ValidTableType>>((acc, table) => {
    const { fieldName, typeNames } = generateFieldAndTypeNames(
      table.id,
      validTableIds,
    );

    const options: CreatingTableOptionsType = {
      table,
      safetyTableId: typeNames.singular,
      pluralSafetyTableId: typeNames.plural,
    };

    acc[table.id] = {
      fieldName,
      typeNames,
      options,
    };
    return acc;
  }, {});
};
