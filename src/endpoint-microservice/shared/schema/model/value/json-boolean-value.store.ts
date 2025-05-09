import {
  JsonBooleanStore,
  JsonValueStoreParent,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';

export class JsonBooleanValueStore {
  public readonly type = JsonSchemaTypeName.Boolean;

  public readonly index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonBooleanStore,
    public readonly rowId: string,
    public value: boolean | null = null,
  ) {
    this.index = this.schema.registerValue(this);
  }

  public getPlainValue() {
    return this.value ?? this.schema.default;
  }
}
