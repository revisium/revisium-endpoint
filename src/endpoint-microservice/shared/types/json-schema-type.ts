export type JsonSchemaStringType = { type: 'string'; default: string };

export type JsonSchemaNumberType = { type: 'number'; default: number };

export type JsonSchemaBooleanType = { type: 'boolean'; default: boolean };

export type JsonSchemaUnionPrimitives =
  | JsonSchemaStringType
  | JsonSchemaNumberType
  | JsonSchemaBooleanType;

export type JsonSchemaObjectType = {
  type: 'object';
  additionalProperties: false;
  required: string[];
  properties: Record<string, JsonSchemaType>;
};

export type JsonArraySchema = {
  type: 'array';
  items: JsonSchemaType;
};

export type JsonSchemaType =
  | JsonSchemaObjectType
  | JsonArraySchema
  | JsonSchemaUnionPrimitives;
