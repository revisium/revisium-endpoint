import { nanoid } from 'nanoid';
import { EventEmitter } from 'node:events';
import {
  JsonSchemaStore,
  JsonStringValueStore,
  JsonRefSchema,
  JsonSchemaTypeName,
  JsonStringSchema,
} from 'src/endpoint-microservice/shared/schema';
import { addSharedFieldsFromState } from 'src/endpoint-microservice/shared/schema/lib/addSharedFieldsFromStore';

export class JsonStringStore extends EventEmitter implements JsonStringSchema {
  public readonly type = JsonSchemaTypeName.String;

  public $ref: string = '';
  public name: string = '';
  public parent: JsonSchemaStore | null = null;

  public default: string = '';
  public readOnly?: boolean;
  public title?: string;
  public description?: string;
  public deprecated?: boolean;
  public foreignKey?: string;
  public pattern?: string;
  public enum?: string[];
  public format?: JsonStringSchema['format'];
  public contentMediaType?: JsonStringSchema['contentMediaType'];

  private readonly valuesMap: Map<string, JsonStringValueStore[]> = new Map<
    string,
    JsonStringValueStore[]
  >();

  constructor(public readonly nodeId: string = nanoid()) {
    super();
  }

  public registerValue(value: JsonStringValueStore): number {
    const length = this.getOrCreateValues(value.rowId).push(value);
    return length - 1;
  }

  public getValue(
    rowId: string,
    index: number = 0,
  ): JsonStringValueStore | undefined {
    return this.getOrCreateValues(rowId)[index];
  }

  public getPlainSchema(options?: {
    skip$Ref?: boolean;
  }): JsonStringSchema | JsonRefSchema {
    if (this.$ref && options?.skip$Ref !== true) {
      return addSharedFieldsFromState({ $ref: this.$ref }, this);
    }

    return addSharedFieldsFromState(
      {
        type: this.type,
        default: this.default,
        ...(this.foreignKey ? { foreignKey: this.foreignKey } : {}),
        ...(this.readOnly ? { readOnly: this.readOnly } : {}),
        ...(this.pattern ? { pattern: this.pattern } : {}),
        ...(this.enum ? { enum: this.enum } : {}),
        ...(this.format ? { format: this.format } : {}),
        ...(this.contentMediaType
          ? { contentMediaType: this.contentMediaType }
          : {}),
      },
      this,
    );
  }

  private getOrCreateValues(rowId: string): JsonStringValueStore[] {
    let values = this.valuesMap.get(rowId);

    if (!values) {
      values = [];
      this.valuesMap.set(rowId, values);
    }

    return values;
  }
}
