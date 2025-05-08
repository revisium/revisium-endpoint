export type JsonStringSchema = {
  type: 'string';
  default: string;
  foreignKey?: string;
  readOnly?: boolean;
};

export type JsonNumberSchema = {
  type: 'number';
  default: number;
  readOnly?: boolean;
};

export type JsonBooleanSchema = {
  type: 'boolean';
  default: boolean;
  readOnly?: boolean;
};

export type JsonSchemaPrimitives =
  | JsonStringSchema
  | JsonNumberSchema
  | JsonBooleanSchema;

export type JsonObjectSchema = {
  type: 'object';
  additionalProperties: false;
  required: string[];
  properties: Record<string, SchemaTypes>;
};

export type JsonArraySchema = {
  type: 'array';
  items: SchemaTypes;
};

export type SchemaTypes =
  | JsonObjectSchema
  | JsonArraySchema
  | JsonSchemaPrimitives;
