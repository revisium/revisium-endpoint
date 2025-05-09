import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';
import {
  JsonSchemaStore,
  JsonBooleanValueStore,
  JsonRefSchema,
  JsonSchemaTypeName,
  JsonBooleanSchema,
} from 'src/endpoint-microservice/shared/schema';

export class JsonBooleanStore
  extends EventEmitter
  implements JsonBooleanSchema
{
  public readonly type = JsonSchemaTypeName.Boolean;

  public $ref: string = '';
  public name: string = '';
  public parent: JsonSchemaStore | null = null;

  public default: boolean = false;

  private readonly valuesMap: Map<string, JsonBooleanValueStore[]> = new Map<
    string,
    JsonBooleanValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {
    super();
  }

  public registerValue(value: JsonBooleanValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonBooleanValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public getPlainSchema(): JsonBooleanSchema | JsonRefSchema {
    if (this.$ref) {
      return { $ref: this.$ref };
    }

    return {
      type: this.type,
      default: this.default,
    };
  }

  private getOrCreateValues(rowId: string): JsonBooleanValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }
}
