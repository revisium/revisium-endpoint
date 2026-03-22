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
    options: CreatingTableOptionsType,
  ) {
    this.createDeleteResultType();
    this.createInputTypes(options);
    this.createCreateMutation(singularKey, options);
    this.createUpdateMutation(singularKey, options);
    this.createDeleteMutation(singularKey, options);
  }

  private createDeleteResultType() {
    const name = this.namingService.getDeleteResultTypeName();

    if (this.contextService.schema.types.has(name)) return;

    this.contextService.schema.addType(name).addFields([
      { type: FieldType.string, name: 'id' },
      { type: FieldType.boolean, name: 'success' },
    ]);
  }

  private createInputTypes(options: CreatingTableOptionsType) {
    const createInputName = this.namingService.getCreateInputTypeName(
      options.safetyTableId,
    );
    const updateInputName = this.namingService.getUpdateInputTypeName(
      options.safetyTableId,
    );
    const jsonScalarName = this.contextService.schema.getScalar('JSON').name;

    const inputFields = [
      { type: FieldType.string as const, name: 'id', required: true as const },
      {
        type: FieldType.ref as const,
        refType: FieldRefType.scalar as const,
        name: 'data',
        value: jsonScalarName,
        required: true as const,
      },
    ];

    if (!this.contextService.schema.getInput(createInputName)) {
      this.contextService.schema
        .addInput(createInputName)
        .addFields(inputFields);
    }

    if (!this.contextService.schema.getInput(updateInputName)) {
      this.contextService.schema
        .addInput(updateInputName)
        .addFields(inputFields);
    }
  }

  private createCreateMutation(
    singularKey: string,
    options: CreatingTableOptionsType,
  ) {
    const root = this.cacheService.getRoot(options.table.id);

    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `create${singularKey.charAt(0).toUpperCase()}${singularKey.slice(1)}`,
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
      name: `update${singularKey.charAt(0).toUpperCase()}${singularKey.slice(1)}`,
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

  private createDeleteMutation(
    singularKey: string,
    options: CreatingTableOptionsType,
  ) {
    this.contextService.schema.mutation.addField({
      type: FieldType.ref,
      name: `delete${singularKey.charAt(0).toUpperCase()}${singularKey.slice(1)}`,
      value: this.namingService.getDeleteResultTypeName(),
      args: {
        type: FieldType.string,
        name: 'id',
        required: true,
      },
      resolver: this.resolver.getDeleteRowResolver(options.table),
    });
  }
}
