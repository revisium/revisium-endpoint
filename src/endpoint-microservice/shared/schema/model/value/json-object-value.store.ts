import {
  createJsonValueStore,
  AddedPropertyEvent,
  ChangeNameEvent,
  JsonObjectStore,
  MigratePropertyEvent,
  RemovedPropertyEvent,
  JsonValueStore,
  JsonValueStoreParent,
  JsonObject,
  JsonValue,
  JsonSchemaTypeName,
  getTransformation,
} from 'src/endpoint-microservice/shared/schema';

export class JsonObjectValueStore {
  public readonly type = JsonSchemaTypeName.Object;

  public index: number;

  public parent: JsonValueStoreParent | null = null;

  constructor(
    public readonly schema: JsonObjectStore,
    public readonly rowId: string,
    public value: Record<string, JsonValueStore>,
  ) {
    this.index = this.schema.registerValue(this);
    this.init();
  }

  public getPlainValue(): JsonObject {
    return Object.entries(this.value).reduce<Record<string, JsonValue>>(
      (result, [name, store]) => {
        result[name] = store.getPlainValue() as JsonValue;
        return result;
      },
      {},
    );
  }

  public migrateProperty(event: MigratePropertyEvent) {
    const rawValue = this.getMigratedValue(event);

    this.value[event.name] = createJsonValueStore(
      event.property,
      this.rowId,
      rawValue,
    );
  }

  public addProperty(event: AddedPropertyEvent) {
    const rawValue = this.getAddedValue(event);

    this.value[event.name] = createJsonValueStore(
      event.property,
      this.rowId,
      rawValue,
    );
  }

  public removeProperty(event: RemovedPropertyEvent) {
    delete this.value[event.name];
  }

  public changeName(event: ChangeNameEvent) {
    const itemValue = this.value[event.fromName];

    if (itemValue !== undefined) {
      delete this.value[event.fromName];
      this.value[event.toName] = itemValue;
    }
  }

  private getAddedValue(event: AddedPropertyEvent): JsonValue {
    const previousValue = event.property.getValue(this.rowId, this.index);

    if (previousValue) {
      return previousValue.getPlainValue();
    }

    return event.property.default;
  }

  private getMigratedValue(event: MigratePropertyEvent): JsonValue {
    const transformation = getTransformation(
      event.previousProperty,
      event.property,
    );

    if (transformation) {
      return transformation(
        this.value[event.name].getPlainValue(),
        event.property.default,
      ) as JsonValue;
    }

    return event.property.default;
  }

  private init() {
    for (const value of Object.values(this.value)) {
      value.parent = this;
    }
  }
}
