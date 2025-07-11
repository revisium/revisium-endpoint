import { Injectable } from '@nestjs/common';
import { ContextService } from './context.service';
import { NamingService } from './naming.service';
import { ResolverService } from './resolver.service';
import { FieldType, FieldRefType, TypeModelField } from './schema';
import { CreatingTableOptionsType } from '../types';

@Injectable()
export class NodeTypeBuilderService {
  constructor(
    private readonly contextService: ContextService,
    private readonly namingService: NamingService,
    private readonly resolverService: ResolverService,
  ) {}

  public createNodeType(options: CreatingTableOptionsType) {
    const typeName = this.generateNodeTypeName(options);
    const systemFields = this.createSystemFields();

    const nodeType = this.registerNodeType(typeName, systemFields);
    this.configureEntityResolution(nodeType, options);

    return {
      nodeType,
      typeName,
    };
  }

  private generateNodeTypeName(options: CreatingTableOptionsType): string {
    return this.namingService.getTypeName(options.safetyTableId, 'node');
  }

  private createSystemFields(): TypeModelField[] {
    return [
      this.createStringField('versionId'),
      this.createStringField('createdId'),
      this.createStringField('id'),
      this.createDateTimeField('createdAt'),
      this.createDateTimeField('updatedAt'),
      this.createDateTimeField('publishedAt'),
      this.createJsonField(),
    ];
  }

  private createStringField(name: string): TypeModelField {
    return {
      name,
      type: FieldType.string,
    };
  }

  private createDateTimeField(name: string): TypeModelField {
    return {
      name,
      type: FieldType.ref,
      refType: FieldRefType.scalar,
      value: 'DateTime',
    };
  }

  private createJsonField(): TypeModelField {
    return {
      name: 'json',
      type: FieldType.ref,
      refType: FieldRefType.scalar,
      value: 'JSON',
      resolver: (parent) => parent.data,
    };
  }

  private registerNodeType(typeName: string, fields: TypeModelField[]) {
    return this.contextService.schema.addType(typeName).addFields(fields);
  }

  private configureEntityResolution(
    nodeType: any,
    options: CreatingTableOptionsType,
  ): void {
    nodeType.entity = {
      keys: ['id'],
      resolve: this.resolverService.getItemReferenceResolver(options.table),
    };
  }
}
