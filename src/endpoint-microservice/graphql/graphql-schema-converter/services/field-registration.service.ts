import { Injectable } from '@nestjs/common';
import { TypeModelField } from './schema';
import { SchemaProcessingContext } from './strategy/schema-processing-context.interface';
import { ContextService } from './context.service';

@Injectable()
export class FieldRegistrationService {
  constructor(private readonly contextService: ContextService) {}

  public registerFieldWithParent(
    context: SchemaProcessingContext,
    field: TypeModelField,
  ): void {
    if (context.parentType && context.fieldName) {
      this.contextService.schema.getType(context.parentType).addField(field);
    }
  }

  public registerFieldThunkWithParent(
    context: SchemaProcessingContext,
    fieldThunk: () => TypeModelField,
  ): void {
    if (context.parentType && context.fieldName) {
      this.contextService.schema
        .getType(context.parentType)
        .addFieldThunk(context.fieldName, fieldThunk);
    }
  }
}
