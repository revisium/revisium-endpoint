import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';
import {
  JsonSchemaStore,
  JsonNumberValueStore,
  JsonNumberSchema,
  JsonRefSchema,
  JsonSchemaTypeName,
} from 'src/endpoint-microservice/shared/schema';
import { addSharedFieldsFromState } from 'src/endpoint-microservice/shared/schema/lib/addSharedFieldsFromStore';

export class JsonNumberStore extends EventEmitter implements JsonNumberSchema {
  public readonly type = JsonSchemaTypeName.Number;

  public $ref: string = '';
  public name: string = '';
  public parent: JsonSchemaStore | null = null;

  public default: number = 0;
  public readOnly?: boolean;
  public title?: string;
  public description?: string;
  public deprecated?: boolean;

  private readonly valuesMap: Map<string, JsonNumberValueStore[]> = new Map<
    string,
    JsonNumberValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {
    super();
  }

  public registerValue(value: JsonNumberValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonNumberValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public getPlainSchema(options?: {
    skip$Ref?: boolean;
  }): JsonNumberSchema | JsonRefSchema {
    if (this.$ref && options?.skip$Ref !== true) {
      return addSharedFieldsFromState({ $ref: this.$ref }, this);
    }

    return addSharedFieldsFromState(
      {
        type: this.type,
        default: this.default,
        ...(this.readOnly ? { readOnly: this.readOnly } : {}),
      },
      this,
    );
  }

  private getOrCreateValues(rowId: string): JsonNumberValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }
}
