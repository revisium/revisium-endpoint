import {
  JsonNumberStore,
  JsonValueStoreParent,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export class JsonNumberValueStore {
  public readonly type = JsonSchemaTypeName.Number;

  public readonly index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonNumberStore,
    public readonly rowId: string,
    public value: number | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
