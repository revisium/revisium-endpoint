import { Injectable, Scope } from '@nestjs/common';
import SchemaBuilder from '@pothos/core';
import DirectivePlugin from '@pothos/plugin-directives';
import FederationPlugin from '@pothos/plugin-federation';
import {
  GraphQLInputObjectType,
  GraphQLSchema,
  isInputObjectType,
  isListType,
  isNonNullType,
  isScalarType,
} from 'graphql/type';
import { GraphQLScalarType } from 'graphql/type/definition';

Injectable({ scope: Scope.TRANSIENT });
export class FederationSchemaConverter {
  private readonly builder = new SchemaBuilder({
    plugins: [DirectivePlugin, FederationPlugin],
  });

  private addTypes = new Set<string>();

  public convert(schema: GraphQLSchema): GraphQLSchema {
    const builtInTypes = Object.keys(new GraphQLSchema({}).getTypeMap());
    const types = Object.values(schema.getTypeMap()).filter(
      (type) => !builtInTypes.includes(type.name),
    );

    for (const type of types) {
      if (isScalarType(type)) {
        this.addScalarType(type);
      } else if (isInputObjectType(type)) {
        this.addInputType(type);
      }
    }

    // console.log(printSchema(this.builder.toSchema()));

    return schema;
  }

  private addInputType(type: GraphQLInputObjectType) {
    if (this.addTypes.has(type.name)) {
      return;
    }

    this.addTypes.add(type.name);

    this.builder.inputType(type.name, {
      fields: (t) => {
        const config: Record<string, any> = {};

        for (const [fieldName, fieldDef] of Object.entries(type.getFields())) {
          // unwrap NonNull
          let gqlType = fieldDef.type;
          const required = isNonNullType(gqlType);
          if (required) {
            // @ts-ignore
            gqlType = gqlType.ofType;
          }

          // handle List<T>
          const isList = isListType(gqlType);
          // @ts-ignore
          const baseType = isList ? gqlType.ofType : gqlType;

          // config for t.field()
          config[fieldName] = t.field({
            type: isList ? [baseType.name] : baseType.name,
            required,
            description: fieldDef.description ?? undefined,
            defaultValue:
              fieldDef.defaultValue === undefined
                ? undefined
                : fieldDef.defaultValue,
          });
        }

        return config;
      },
    });
  }

  private addScalarType(type: GraphQLScalarType) {
    const config = type.toConfig();

    // @ts-ignore
    this.builder.scalarType(type.name, {
      ...config,
      extensions: {
        ...config.extensions,
      },
    });
  }
}
