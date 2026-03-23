import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/cache.service';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { NamingService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/naming.service';
import { ResolverService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/resolver.service';
import {
  FieldRefType,
  FieldType,
} from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/schema';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { capitalize } from 'src/endpoint-microservice/shared/utils/stringUtils';

@Injectable()
export class MutationsService {
  constructor(
    private readonly contextService: ContextService,
    private readonly cacheService: CacheService,
    private readonly resolver: ResolverService,
    private readonly namingService: NamingService,
  ) {}

  public createMutationFields(
    singularKey: string,
    pluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.createSharedTypes();
    this.createSingularInputTypes(options);
    this.createBulkInputTypes(options);

    // Singular mutations
    this.createCreateMutation(singularKey, options);
    this.createUpdateMutation(singularKey, options);
    this.createPatchMutation(singularKey, options);
    this.createDeleteMutation(singularKey, options);

    // Bulk mutations
    this.createBulkCreateMutation(pluralKey, options);
    this.createBulkUpdateMutation(pluralKey, options);
    this.createBulkPatchMutation(pluralKey, options);
    this.createBulkDeleteMutation(pluralKey, options);
  }

  private createSharedTypes() {
    this.createDeleteResultType();
    this.createBulkMutationResultType();
    this.createPatchOpEnum();
    this.createPatchOperationInput();
  }

  private createDeleteResultType() {
    const name = this.namingService.getDeleteResultTypeName();

    if (this.contextService.schema.types.has(name)) return;

    this.contextService.schema.addType(name).addFields([
      { type: FieldType.string, name: 'id' },
      { type: FieldType.boolean, name: 'success' },
    ]);
  }

  private createBulkMutationResultType() {
    const name = this.namingService.getBulkMutationResultTypeName();

    if (this.contextService.schema.types.has(name)) return;

    this.contextService.schema.addType(name).addFields([
      { type: FieldType.boolean, name: 'success' },
      { type: FieldType.int, name: 'count' },
    ]);
  }

  private createPatchOpEnum() {
    const name = this.namingService.getPatchOpEnumName();

    if (this.contextService.schema.getEnum(name)) return;

    this.contextService.schema.addEnum(name).addValues(['replace']);
  }

  private createPatchOperationInput() {
    const name = this.namingService.getPatchOperationTypeName();

    if (this.contextService.schema.getInput(name)) return;

    const jsonScalarName = this.contextService.schema.getScalar('JSON').name;

    this.contextService.schema.addInput(name).addFields([
      {
        type: FieldType.ref,
        refType: FieldRefType.enum,
        name: 'op',
        value: this.namingService.getPatchOpEnumName(),
        required: true,
      },
      { type: FieldType.string, name: 'path', required: true },
      {
        type: FieldType.ref,
        refType: FieldRefType.scalar,
        name: 'value',
        value: jsonScalarName,
        required: true,
      },
    ]);
  }

  private createSingularInputTypes(options: CreatingTableOptionsType) {
    const jsonScalarName = this.contextService.schema.getScalar('JSON').name;

    const idAndDataFields = [
      {
        type: FieldType.string as const,
        name: 'id',
        required: true as const,
      },
      {
        type: FieldType.ref as const,
        refType: FieldRefType.scalar as const,
        name: 'data',
        value: jsonScalarName,
        required: true as const,
      },
    ];

    const createInputName = this.namingService.getCreateInputTypeName(
      options.safetyTableId,
    );
    if (!this.contextService.schema.getInput(createInputName)) {
      this.contextService.schema
        .addInput(createInputName)
        .addFields(idAndDataFields);
    }

    const updateInputName = this.namingService.getUpdateInputTypeName(
      options.safetyTableId,
    );
    if (!this.contextService.schema.getInput(updateInputName)) {
      this.contextService.schema
        .addInput(updateInputName)
        .addFields(idAndDataFields);
    }

    const patchInputName = this.namingService.getPatchInputTypeName(
      options.safetyTableId,
    );
    if (!this.contextService.schema.getInput(patchInputName)) {
      this.contextService.schema.addInput(patchInputName).addFields([
        {
          type: FieldType.string,
          name: 'id',
          required: true,
        },
        {
          type: FieldType.refList,
          refType: FieldRefType.input,
          name: 'patches',
          value: this.namingService.getPatchOperationTypeName(),
          required: true,
        },
      ]);
    }
  }

  private createBulkInputTypes(options: CreatingTableOptionsType) {
    const jsonScalarName = this.contextService.schema.getScalar('JSON').name;

    // Create row input (id + data)
    const createRowInputName = this.namingService.getBulkCreateRowInputTypeName(
      options.pluralSafetyTableId,
    );
    if (!this.contextService.schema.getInput(createRowInputName)) {
      this.contextService.schema.addInput(createRowInputName).addFields([
        { type: FieldType.string, name: 'id', required: true },
        {
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          name: 'data',
          value: jsonScalarName,
          required: true,
        },
      ]);
    }

    // Create bulk input (rows: [RowInput])
    const createInputName = this.namingService.getBulkCreateInputTypeName(
      options.pluralSafetyTableId,
    );
    if (!this.contextService.schema.getInput(createInputName)) {
      this.contextService.schema.addInput(createInputName).addFields([
        {
          type: FieldType.refList,
          refType: FieldRefType.input,
          name: 'rows',
          value: createRowInputName,
          required: true,
        },
      ]);
    }

    // Update row input (id + data)
    const updateRowInputName = this.namingService.getBulkUpdateRowInputTypeName(
      options.pluralSafetyTableId,
    );
    if (!this.contextService.schema.getInput(updateRowInputName)) {
      this.contextService.schema.addInput(updateRowInputName).addFields([
        { type: FieldType.string, name: 'id', required: true },
        {
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          name: 'data',
          value: jsonScalarName,
          required: true,
        },
      ]);
    }

    // Update bulk input
    const updateInputName = this.namingService.getBulkUpdateInputTypeName(
      options.pluralSafetyTableId,
    );
    if (!this.contextService.schema.getInput(updateInputName)) {
      this.contextService.schema.addInput(updateInputName).addFields([
        {
          type: FieldType.refList,
          refType: FieldRefType.input,
          name: 'rows',
          value: updateRowInputName,
          required: true,
        },
      ]);
    }

    // Patch row input (id + patches)
    const patchRowInputName = this.namingService.getBulkPatchRowInputTypeName(
      options.pluralSafetyTableId,
    );
    if (!this.contextService.schema.getInput(patchRowInputName)) {
      this.contextService.schema.addInput(patchRowInputName).addFields([
        { type: FieldType.string, name: 'id', required: true },
        {
          type: FieldType.refList,
          refType: FieldRefType.input,
          name: 'patches',
          value: this.namingService.getPatchOperationTypeName(),
          required: true,
        },
      ]);
    }

    // Patch bulk input
    const patchInputName = this.namingService.getBulkPatchInputTypeName(
      options.pluralSafetyTableId,
    );
    if (!this.contextService.schema.getInput(patchInputName)) {
      this.contextService.schema.addInput(patchInputName).addFields([
        {
          type: FieldType.refList,
          refType: FieldRefType.input,
          name: 'rows',
          value: patchRowInputName,
          required: true,
        },
      ]);
    }

    // Delete bulk input (rowIds)
    const deleteInputName = this.namingService.getBulkDeleteInputTypeName(
      options.pluralSafetyTableId,
    );
    if (!this.contextService.schema.getInput(deleteInputName)) {
      this.contextService.schema.addInput(deleteInputName).addFields([
        {
          type: FieldType.stringList,
          name: 'rowIds',
          required: true,
        },
      ]);
    }
  }

  // --- Singular mutations ---

  private createCreateMutation(
    singularKey: string,
    options: CreatingTableOptionsType,
  ) {
    const root = this.cacheService.getRoot(options.table.id);

    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `create${capitalize(singularKey)}`,
      value: root.name,
      args: {
        type: FieldType.ref,
        name: 'data',
        value: this.namingService.getCreateInputTypeName(options.safetyTableId),
        required: true,
      },
      resolver: this.resolver.getCreateRowResolver(options.table),
    });
  }

  private createUpdateMutation(
    singularKey: string,
    options: CreatingTableOptionsType,
  ) {
    const root = this.cacheService.getRoot(options.table.id);

    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `update${capitalize(singularKey)}`,
      value: root.name,
      args: {
        type: FieldType.ref,
        name: 'data',
        value: this.namingService.getUpdateInputTypeName(options.safetyTableId),
        required: true,
      },
      resolver: this.resolver.getUpdateRowResolver(options.table),
    });
  }

  private createPatchMutation(
    singularKey: string,
    options: CreatingTableOptionsType,
  ) {
    const root = this.cacheService.getRoot(options.table.id);

    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `patch${capitalize(singularKey)}`,
      value: root.name,
      args: {
        type: FieldType.ref,
        name: 'data',
        value: this.namingService.getPatchInputTypeName(options.safetyTableId),
        required: true,
      },
      resolver: this.resolver.getPatchRowResolver(options.table),
    });
  }

  private createDeleteMutation(
    singularKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `delete${capitalize(singularKey)}`,
      value: this.namingService.getDeleteResultTypeName(),
      args: {
        type: FieldType.string,
        name: 'id',
        required: true,
      },
      resolver: this.resolver.getDeleteRowResolver(options.table),
    });
  }

  // --- Bulk mutations ---

  private createBulkCreateMutation(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `create${capitalize(pluralKey)}`,
      value: this.namingService.getBulkMutationResultTypeName(),
      args: {
        type: FieldType.ref,
        name: 'data',
        value: this.namingService.getBulkCreateInputTypeName(
          options.pluralSafetyTableId,
        ),
        required: true,
      },
      resolver: this.resolver.getCreateRowsResolver(options.table),
    });
  }

  private createBulkUpdateMutation(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `update${capitalize(pluralKey)}`,
      value: this.namingService.getBulkMutationResultTypeName(),
      args: {
        type: FieldType.ref,
        name: 'data',
        value: this.namingService.getBulkUpdateInputTypeName(
          options.pluralSafetyTableId,
        ),
        required: true,
      },
      resolver: this.resolver.getUpdateRowsResolver(options.table),
    });
  }

  private createBulkPatchMutation(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `patch${capitalize(pluralKey)}`,
      value: this.namingService.getBulkMutationResultTypeName(),
      args: {
        type: FieldType.ref,
        name: 'data',
        value: this.namingService.getBulkPatchInputTypeName(
          options.pluralSafetyTableId,
        ),
        required: true,
      },
      resolver: this.resolver.getPatchRowsResolver(options.table),
    });
  }

  private createBulkDeleteMutation(
    pluralKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `delete${capitalize(pluralKey)}`,
      value: this.namingService.getBulkMutationResultTypeName(),
      args: {
        type: FieldType.ref,
        name: 'data',
        value: this.namingService.getBulkDeleteInputTypeName(
          options.pluralSafetyTableId,
        ),
        required: true,
      },
      resolver: this.resolver.getDeleteRowsResolver(options.table),
    });
  }
}
