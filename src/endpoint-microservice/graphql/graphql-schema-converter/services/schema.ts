import { GraphQLScalarType } from 'graphql/type';

abstract class BaseFieldModel<T extends { name: string }> {
  public readonly fields = new Map<string, T>();

  public addField(field: T): this {
    if (this.fields.has(field.name)) {
      throw new Error(`Field with name "${field.name}" already exists`);
    }

    this.fields.set(field.name, field);

    return this;
  }

  public addFields(fields: T[]): this {
    for (const field of fields) {
      this.addField(field);
    }

    return this;
  }
}

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
) & {
  name: string;
  args: ArgsType | undefined;
  resolver: (...args: any[]) => any;
  deprecationReason?: string;
};

export class QueryModel extends BaseFieldModel<QueryModelField> {}

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
) & {
  name: string;
  nullable?: true;
  description?: string;
  deprecationReason?: string;
  resolver?: (...args: any[]) => any;
};

export type TypeModelFieldThunk = () => TypeModelField;

export type TypeModelEntity = {
  keys: string[];
  resolve: (...args: any[]) => any;
};

export class TypeModel extends BaseFieldModel<TypeModelField> {
  private readonly fieldThunks = new Map<string, TypeModelFieldThunk>();

  public entity: TypeModelEntity | null = null;

  constructor(public readonly name: string) {
    super();
  }

  public addFieldThunk(name: string, fieldThunk: TypeModelFieldThunk) {
    if (this.fieldThunks.has(name)) {
      throw new Error(`Field thunk with name "${name}" already exists`);
    }

    this.fieldThunks.set(name, fieldThunk);

    return this;
  }

  public resolveThunks() {
    for (const [name, thunk] of this.fieldThunks) {
      const field = thunk();
      this.fields.set(name, field);
    }
    this.fieldThunks.clear();
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

export class InputModel extends BaseFieldModel<InputModelField> {
  constructor(public readonly name: string) {
    super();
  }
}

export class EnumModel {
  public readonly values: string[] = [];

  constructor(public readonly name: string) {}

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
    public readonly name: string,
    public readonly scalar: GraphQLScalarType,
  ) {}
}

export class Schema {
  public readonly query = new QueryModel();

  public readonly types = new Map<string, TypeModel>();
  public readonly inputs = new Map<string, InputModel>();
  public readonly enums = new Map<string, EnumModel>();
  public readonly scalars = new Map<string, ScalarModel>();

  public addType(name: string) {
    if (this.types.has(name)) {
      throw new Error(`Type with name "${name}" already exists`);
    }

    const model = new TypeModel(name);

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

    const model = new InputModel(name);

    this.inputs.set(model.name, model);

    return model;
  }

  public getInput(name: string) {
    return this.inputs.get(name);
  }

  public addEnum(name: string) {
    if (this.enums.has(name)) {
      throw new Error(`Enum with name "${name}" already exists`);
    }

    const model = new EnumModel(name);

    this.enums.set(model.name, model);

    return model;
  }

  public getEnum(name: string) {
    return this.enums.get(name);
  }

  public addScalar(name: string, scalar: GraphQLScalarType) {
    if (this.scalars.has(name)) {
      throw new Error(`Scalar with name "${name}" already exists`);
    }

    const model = new ScalarModel(name, scalar);

    this.scalars.set(model.name, model);

    return model;
  }

  public getScalar(name: string) {
    const scalar = this.scalars.get(name);

    if (!scalar) {
      throw new Error(`Scalar with name "${name}" does not exist`);
    }

    return scalar;
  }

  public resolveAllThunks() {
    for (const type of this.types.values()) {
      type.resolveThunks();
    }
  }
}
