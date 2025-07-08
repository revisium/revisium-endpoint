import SchemaBuilder, {
  EnumRef,
  ImplementableInputObjectRef,
  ImplementableObjectRef,
  ScalarRef,
} from '@pothos/core';
import DirectivePlugin from '@pothos/plugin-directives';
import FederationPlugin from '@pothos/plugin-federation';
import {
  EnumModel,
  FieldRefType,
  FieldType,
  InputModel,
  ScalarModel,
  Schema,
  TypeModel,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';

export class SchemaToBuilderConverter {
  public readonly builder = new SchemaBuilder<{
    DefaultFieldNullability: false;
  }>({
    defaultFieldNullability: false,
    plugins: [DirectivePlugin, FederationPlugin],
  });

  private readonly inputRefs = new Map<
    string,
    { ref: ImplementableInputObjectRef<any, any>; input: InputModel }
  >();

  private readonly typeRefs = new Map<
    string,
    { ref: ImplementableObjectRef<any, any>; type: TypeModel }
  >();

  private readonly enumRefs = new Map<
    string,
    { ref: EnumRef<any, any, any>; enum: EnumModel }
  >();

  private readonly scalarRefs = new Map<
    string,
    { ref: ScalarRef<any, any, any>; scalar: ScalarModel }
  >();

  constructor(private readonly schema: Schema) {}

  public convert() {
    this.addRefs();
  }

  private addRefs() {
    this.addScalars();
    this.addEnums();
    this.addInputs();
    this.addTypes();
    this.addQuery();
  }

  private addQuery() {
    this.builder.queryType({});

    this.builder.queryFields((t) => {
      const result: any = {};

      for (const field of this.schema.query.fields.values()) {
        const defaultParams = {
          args: field.args
            ? {
                [field.args.name]: t.arg({
                  required: field.args.required,
                  type:
                    field.args.type === FieldType.string
                      ? 'String'
                      : this.getInputRef(field.args.value).ref,
                }),
              }
            : undefined,
          resolve: field.resolver,
        };

        if (field.type === FieldType.string) {
          result[field.name] = t.string(defaultParams);
        } else if (field.type === FieldType.stringList) {
          result[field.name] = t.stringList(defaultParams);
        } else if (field.type === FieldType.int) {
          result[field.name] = t.int(defaultParams);
        } else if (field.type === FieldType.intList) {
          result[field.name] = t.intList(defaultParams);
        } else if (field.type === FieldType.float) {
          result[field.name] = t.float(defaultParams);
        } else if (field.type === FieldType.floatList) {
          result[field.name] = t.floatList(defaultParams);
        } else if (field.type === FieldType.boolean) {
          result[field.name] = t.boolean(defaultParams);
        } else if (field.type === FieldType.booleanList) {
          result[field.name] = t.booleanList(defaultParams);
        } else if (field.type === FieldType.ref) {
          result[field.name] = t.field({
            type: this.getTypeRef(field.value).ref,
            ...defaultParams,
          });
        } else if (field.type === FieldType.refList) {
          result[field.name] = t.field({
            type: t.listRef(this.getTypeRef(field.value).ref),
            ...defaultParams,
          });
        }
      }

      return result;
    });
  }

  private addScalars() {
    for (const scalar of this.schema.scalars.values()) {
      // @ts-ignore
      const ref = this.builder.addScalarType(scalar.name, scalar.scalar);
      this.scalarRefs.set(scalar.name, { ref, scalar });
    }
  }

  private addInputs() {
    for (const input of this.schema.inputs.values()) {
      const ref = this.builder.inputRef(input.name);
      this.inputRefs.set(input.name, { ref, input });
    }

    for (const { ref, input } of this.inputRefs.values()) {
      this.implementInput(ref, input);
    }
  }

  private implementInput(
    ref: ImplementableInputObjectRef<any, any>,
    input: InputModel,
  ) {
    ref.implement({
      fields: (t) => {
        const result: any = {};

        for (const field of input.fields.values()) {
          if (field.type === FieldType.string) {
            result[field.name] = t.string({ required: field.required });
          } else if (field.type === FieldType.stringList) {
            result[field.name] = t.stringList({ required: field.required });
          } else if (field.type === FieldType.int) {
            result[field.name] = t.int({ required: field.required });
          } else if (field.type === FieldType.intList) {
            result[field.name] = t.intList({ required: field.required });
          } else if (field.type === FieldType.float) {
            result[field.name] = t.float({ required: field.required });
          } else if (field.type === FieldType.floatList) {
            result[field.name] = t.floatList({ required: field.required });
          } else if (field.type === FieldType.boolean) {
            result[field.name] = t.boolean({ required: field.required });
          } else if (field.type === FieldType.booleanList) {
            result[field.name] = t.booleanList({ required: field.required });
          } else if (
            field.type === FieldType.ref &&
            field.refType === FieldRefType.input
          ) {
            result[field.name] = t.field({
              type: this.getInputRef(field.value).ref,
              required: field.required,
            });
          } else if (
            field.type === FieldType.refList &&
            field.refType === FieldRefType.input
          ) {
            result[field.name] = t.field({
              type: t.listRef(this.getInputRef(field.value).ref),
              required: field.required,
            });
          } else if (
            field.type === FieldType.ref &&
            field.refType === FieldRefType.enum
          ) {
            result[field.name] = t.field({
              type: this.getEnumRef(field.value).ref,
              required: field.required,
            });
          } else if (
            field.type === FieldType.refList &&
            field.refType === FieldRefType.enum
          ) {
            result[field.name] = t.field({
              type: t.listRef(this.getEnumRef(field.value).ref),
              required: field.required,
            });
          } else if (
            field.type === FieldType.ref &&
            field.refType === FieldRefType.scalar
          ) {
            result[field.name] = t.field({
              type: this.getScalarRef(field.value).ref,
              required: field.required,
            });
          } else if (
            field.type === FieldType.refList &&
            field.refType === FieldRefType.scalar
          ) {
            result[field.name] = t.field({
              type: t.listRef(this.getScalarRef(field.value).ref),
              required: field.required,
            });
          }
        }

        return result;
      },
    });
  }

  private addEnums() {
    for (const enumModel of this.schema.enums.values()) {
      const ref = this.builder.enumType(enumModel.name, {
        values: enumModel.values,
      });

      this.enumRefs.set(enumModel.name, { ref, enum: enumModel });
    }
  }

  private addTypes() {
    for (const type of this.schema.types.values()) {
      const ref = this.builder.objectRef(type.name);
      ref.implement({ fields: () => ({}) });
      this.typeRefs.set(type.name, { ref, type });
    }

    for (const { ref, type } of this.typeRefs.values()) {
      this.implementType(ref, type);
    }
  }

  private implementType(
    ref: ImplementableObjectRef<any, any>,
    type: TypeModel,
  ) {
    for (const field of type.fields.values()) {
      const params = {
        description: field.description,
        deprecationReason: field.deprecationReason,
      };

      if (field.type === FieldType.string) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeString(field.name, { nullable: field.nullable, ...params }),
        );
      } else if (field.type === FieldType.stringList) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeStringList(field.name, { ...params }),
        );
      } else if (field.type === FieldType.float) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeFloat(field.name, { nullable: field.nullable, ...params }),
        );
      } else if (field.type === FieldType.floatList) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeFloatList(field.name, params),
        );
      } else if (field.type === FieldType.int) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeInt(field.name, { nullable: field.nullable, ...params }),
        );
      } else if (field.type === FieldType.intList) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeIntList(field.name, params),
        );
      } else if (field.type === FieldType.boolean) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeBoolean(field.name, { nullable: field.nullable, ...params }),
        );
      } else if (field.type === FieldType.booleanList) {
        this.builder.objectField(ref, field.name, (t) =>
          t.exposeBooleanList(field.name, params),
        );
      } else if (
        field.type === FieldType.ref &&
        field.refType === FieldRefType.scalar
      ) {
        this.builder.objectField(ref, field.name, (t) =>
          t.field({
            type: this.getScalarRef(field.value).ref,
            resolve: (data) => data[field.name],
            nullable: field.nullable,
            ...params,
          }),
        );
      } else if (
        field.type === FieldType.refList &&
        field.refType === FieldRefType.scalar
      ) {
        this.builder.objectField(ref, field.name, (t) =>
          t.field({
            type: t.listRef(this.getScalarRef(field.value).ref),
            resolve: (data) => data[field.name],
            nullable: field.nullable,
            ...params,
          }),
        );
      } else if (
        field.type === FieldType.ref &&
        field.refType === FieldRefType.type
      ) {
        this.builder.objectField(ref, field.name, (t) =>
          t.field({
            type: this.getTypeRef(field.value).ref,
            resolve: field.resolver
              ? field.resolver
              : (data) => data[field.name],
            nullable: field.nullable,
          }),
        );
      } else if (
        field.type === FieldType.refList &&
        field.refType === FieldRefType.type
      ) {
        this.builder.objectField(ref, field.name, (t) =>
          t.field({
            type: t.listRef(this.getTypeRef(field.value).ref),
            resolve: field.resolver
              ? field.resolver
              : (data) => data[field.name],
            nullable: field.nullable,
          }),
        );
      }
    }
  }

  private getScalarRef(name: string) {
    const ref = this.scalarRefs.get(name);

    if (!ref) {
      throw new Error(`Unable to find scalar ref ${name}`);
    }

    return ref;
  }

  private getInputRef(name: string) {
    const ref = this.inputRefs.get(name);

    if (!ref) {
      throw new Error(`Unable to find input ${name}`);
    }

    return ref;
  }

  private getEnumRef(name: string) {
    const ref = this.enumRefs.get(name);

    if (!ref) {
      throw new Error(`Unable to find enum ${name}`);
    }

    return ref;
  }

  private getTypeRef(name: string) {
    const ref = this.typeRefs.get(name);

    if (!ref) {
      throw new Error(`Unable to find type ${name}`);
    }

    return ref;
  }
}
