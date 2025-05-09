import {
  JsonStringStore,
  JsonValueStoreParent,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export class JsonStringValueStore {
  public readonly type = JsonSchemaTypeName.String;

  public readonly index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonStringStore,
    public readonly rowId: string,
    public value: string | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public get foreignKey() {
    return this.schema.foreignKey;
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
