import { GraphQLScalarType } from 'graphql/type';

export type ArgsType = (
  | { type: FieldType.string }
  | { type: FieldType.ref; value: string }
) & { name: string; required?: true };

export type QueryModelField = (
  | { type: FieldType.string }
  | { type: FieldType.stringList }
  | { type: FieldType.float }
  | { type: FieldType.floatList }
  | { type: FieldType.int }
  | { type: FieldType.intList }
  | { type: FieldType.boolean }
  | { type: FieldType.booleanList }
  | { type: FieldType.ref; value: string }
  | { type: FieldType.refList; value: string }
) & { name: string; args: ArgsType | undefined };

export class QueryModel {
  public fields = new Map<string, QueryModelField>();

  constructor(private readonly schema: Schema) {}

  public addField(field: QueryModelField) {
    if (this.fields.has(field.name)) {
      throw new Error(`Field with name "${field.name}" already exists`);
    }

    this.fields.set(field.name, field);

    return this;
  }
}

export enum FieldRefType {
  enum = 'enum',
  scalar = 'scalar',
  type = 'type',
  input = 'input',
}

export enum FieldType {
  string = 'string',
  stringList = 'stringList',
  float = 'float',
  floatList = 'floatList',
  int = 'int',
  intList = 'intList',
  boolean = 'boolean',
  booleanList = 'booleanList',
  ref = 'ref',
  refList = 'refList',
}

export type TypeModelField = (
  | { type: FieldType.string }
  | { type: FieldType.stringList }
  | { type: FieldType.float }
  | { type: FieldType.floatList }
  | { type: FieldType.int }
  | { type: FieldType.intList }
  | { type: FieldType.boolean }
  | { type: FieldType.booleanList }
  | { type: FieldType.ref; refType: FieldRefType; value: string }
  | { type: FieldType.refList; refType: FieldRefType; value: string }
) & { name: string; nullable?: true };

export class TypeModel {
  public fields = new Map<string, TypeModelField>();

  constructor(
    private readonly schema: Schema,
    public readonly name: string,
  ) {}

  public addField(field: TypeModelField) {
    if (this.fields.has(field.name)) {
      throw new Error(`Field with name "${field.name}" already exists`);
    }

    this.fields.set(field.name, field);

    return this;
  }

  public addFields(fields: TypeModelField[]) {
    for (const field of fields) {
      this.addField(field);
    }

    return this;
  }
}

export type InputModelField = (
  | { type: FieldType.string }
  | { type: FieldType.stringList }
  | { type: FieldType.float }
  | { type: FieldType.floatList }
  | { type: FieldType.int }
  | { type: FieldType.intList }
  | { type: FieldType.boolean }
  | { type: FieldType.booleanList }
  | { type: FieldType.ref; refType: FieldRefType; value: string }
  | { type: FieldType.refList; refType: FieldRefType; value: string }
) & { name: string; required?: true };

export class InputModel {
  public fields = new Map<string, InputModelField>();

  constructor(
    private readonly schema: Schema,
    public readonly name: string,
  ) {}

  public addField(field: InputModelField) {
    if (this.fields.has(field.name)) {
      throw new Error(`Field with name "${field.name}" already exists`);
    }

    this.fields.set(field.name, field);

    return this;
  }

  public addFields(fields: InputModelField[]) {
    for (const field of fields) {
      this.addField(field);
    }

    return this;
  }
}

export class EnumModel {
  public readonly values: string[] = [];

  constructor(
    private readonly schema: Schema,
    public readonly name: string,
  ) {}

  public addValue(value: string) {
    this.values.push(value);

    return this;
  }

  public addValues(values: string[]) {
    this.values.push(...values);

    return this;
  }
}

export class ScalarModel {
  constructor(
    private readonly schema: Schema,
    public readonly name: string,
    public readonly scalar: GraphQLScalarType,
  ) {}
}

export class Schema {
  public readonly query = new QueryModel(this);

  public readonly types = new Map<string, TypeModel>();
  public readonly inputs = new Map<string, InputModel>();
  public readonly enums = new Map<string, EnumModel>();
  public readonly scalars = new Map<string, ScalarModel>();

  public addType(name: string) {
    if (this.types.has(name)) {
      throw new Error(`Type with name "${name}" already exists`);
    }

    const model = new TypeModel(this, name);

    this.types.set(model.name, model);

    return model;
  }

  public getType(name: string) {
    const type = this.types.get(name);

    if (!type) {
      throw new Error(`Type with name "${name}" does not exist`);
    }

    return type;
  }

  public addInput(name: string) {
    if (this.inputs.has(name)) {
      throw new Error(`Input with name "${name}" already exists`);
    }

    const model = new InputModel(this, name);

    this.inputs.set(model.name, model);

    return model;
  }

  public getInput(model: TypeModel) {
    return this.inputs.get(model.name);
  }

  public addEnum(name: string) {
    if (this.enums.has(name)) {
      throw new Error(`Enum with name "${name}" already exists`);
    }

    const model = new EnumModel(this, name);

    this.enums.set(model.name, model);

    return model;
  }

  public getEnum(model: TypeModel) {
    return this.enums.get(model.name);
  }

  public addScalar(name: string, scalar: GraphQLScalarType) {
    if (this.scalars.has(name)) {
      throw new Error(`Scalar with name "${name}" already exists`);
    }

    const model = new ScalarModel(this, name, scalar);

    this.scalars.set(model.name, model);

    return model;
  }

  public getScalar(name: string) {
    const scalar = this.scalars.get(name);

    if (!scalar) {
      throw new Error(`Scalar with name "${name}" does not exists`);
    }

    return scalar;
  }
}
