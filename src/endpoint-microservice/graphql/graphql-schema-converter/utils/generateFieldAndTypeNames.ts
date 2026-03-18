import { getSafetyName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getSafetyName';
import {
  hasDuplicateKeyCaseInsensitive,
  pluralize,
  toCamelCaseFieldName,
  upperFirst,
} from 'src/endpoint-microservice/shared/utils/stringUtils';

export interface FieldAndTypeNames {
  fieldName: { singular: string; plural: string };
  typeNames: { singular: string; plural: string };
}

export const generateFieldAndTypeNames = (
  tableId: string,
  allTableIds: string[],
): FieldAndTypeNames => {
  const hasDuplicate = hasDuplicateKeyCaseInsensitive(allTableIds, tableId);

  const safeName = hasDuplicate
    ? getSafetyName(tableId, 'INVALID_TABLE_NAME')
    : getSafetyName(toCamelCaseFieldName(tableId), 'INVALID_TABLE_NAME');

  const singularFieldName = safeName;
  const pluralFieldName = pluralize(safeName);

  const singularTypeName = hasDuplicate ? safeName : upperFirst(safeName);
  const pluralTypeName = pluralize(singularTypeName);

  return {
    fieldName: {
      singular: singularFieldName,
      plural: pluralFieldName,
    },
    typeNames: {
      singular: singularTypeName,
      plural: pluralTypeName,
    },
  };
};
