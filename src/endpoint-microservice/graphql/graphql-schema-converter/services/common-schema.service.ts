import { Injectable } from '@nestjs/common';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import {
  JsonFilterDtoSearchLanguageEnum,
  JsonFilterDtoSearchTypeEnum,
} from 'src/endpoint-microservice/core-api/generated/api';
import { ContextService } from './context.service';
import { NamingService } from './naming.service';
import { FieldType, FieldRefType } from './schema';

const SEARCH_LANGUAGES = Object.values(JsonFilterDtoSearchLanguageEnum);
const SEARCH_TYPES = Object.values(JsonFilterDtoSearchTypeEnum);

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

@Injectable()
export class CommonSchemaService {
  constructor(
    private readonly contextService: ContextService,
    private readonly namingService: NamingService,
  ) {}

  public createCommon(): void {
    this.addScalars();
    this.addPageInfo();
    this.addSortOrder();
    this.addOrderFieldType();
    this.addOrderFieldAggregation();
    this.addFilters();
  }

  private addScalars(): void {
    this.contextService.schema.addScalar('JSON', JSONResolver);
    this.contextService.schema.addScalar('DateTime', DateTimeResolver);
  }

  private addPageInfo(): void {
    this.contextService.schema
      .addType(this.namingService.getSystemTypeName('pageInfo'))
      .addField({
        name: 'startCursor',
        type: FieldType.string,
        nullable: true,
      })
      .addField({
        name: 'endCursor',
        type: FieldType.string,
        nullable: true,
      })
      .addField({
        name: 'hasNextPage',
        type: FieldType.boolean,
      })
      .addField({
        name: 'hasPreviousPage',
        type: FieldType.boolean,
      });
  }

  private addSortOrder(): void {
    this.contextService.schema
      .addEnum(this.namingService.getSystemTypeName('sortOrder'))
      .addValues([SortDirection.ASC, SortDirection.DESC]);
  }

  private addOrderFieldType(): void {
    this.contextService.schema
      .addEnum(this.namingService.getSystemTypeName('orderFieldType'))
      .addValues(['text', 'int', 'float', 'boolean', 'timestamp']);
  }

  private addOrderFieldAggregation(): void {
    this.contextService.schema
      .addEnum(this.namingService.getSystemTypeName('orderFieldAggregation'))
      .addValues(['min', 'max', 'avg', 'first', 'last']);
  }

  private addFilters(): void {
    this.addStringFilter();
    this.addBooleanFilter();
    this.addDateTimeFilter();
    this.addJsonFilter();
  }

  private addStringFilter(): void {
    const mode = this.contextService.schema
      .addEnum(this.namingService.getSystemFilterModeEnumName('string'))
      .addValues(['default', 'insensitive']);

    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('string'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.string,
        },
        {
          name: 'in',
          type: FieldType.stringList,
        },
        {
          name: 'notIn',
          type: FieldType.stringList,
        },
        {
          name: 'lt',
          type: FieldType.string,
        },
        {
          name: 'lte',
          type: FieldType.string,
        },
        {
          name: 'gt',
          type: FieldType.string,
        },
        {
          name: 'gte',
          type: FieldType.string,
        },
        {
          name: 'contains',
          type: FieldType.string,
        },
        {
          name: 'startsWith',
          type: FieldType.string,
        },
        {
          name: 'endsWith',
          type: FieldType.string,
        },
        {
          name: 'mode',
          type: FieldType.ref,
          refType: FieldRefType.enum,
          value: mode.name,
        },
        {
          name: 'not',
          type: FieldType.string,
        },
      ]);
  }

  private addBooleanFilter(): void {
    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('bool'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.boolean,
        },
        {
          name: 'not',
          type: FieldType.boolean,
        },
      ]);
  }

  private addDateTimeFilter(): void {
    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('dateTime'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.string,
        },
        {
          name: 'in',
          type: FieldType.stringList,
        },
        {
          name: 'notIn',
          type: FieldType.stringList,
        },
        {
          name: 'lt',
          type: FieldType.string,
        },
        {
          name: 'lte',
          type: FieldType.string,
        },
        {
          name: 'gt',
          type: FieldType.string,
        },
        {
          name: 'gte',
          type: FieldType.string,
        },
      ]);
  }

  private addJsonFilter(): void {
    const mode = this.contextService.schema
      .addEnum(this.namingService.getSystemFilterModeEnumName('json'))
      .addValues(['default', 'insensitive']);

    const searchType = this.contextService.schema
      .addEnum(this.namingService.getSystemSearchTypeEnumName())
      .addValues(SEARCH_TYPES);

    const searchLanguage = this.contextService.schema
      .addEnum(this.namingService.getSystemSearchLanguageEnumName())
      .addValues(SEARCH_LANGUAGES);

    const jsonScalar = this.contextService.schema.getScalar('JSON');

    this.contextService.schema
      .addInput(this.namingService.getSystemFilterTypeName('json'))
      .addFields([
        {
          name: 'equals',
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'path',
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'mode',
          type: FieldType.ref,
          refType: FieldRefType.enum,
          value: mode.name,
        },
        {
          name: 'string_contains',
          type: FieldType.string,
        },
        {
          name: 'string_starts_with',
          type: FieldType.string,
        },
        {
          name: 'string_ends_with',
          type: FieldType.string,
        },
        {
          name: 'array_contains',
          type: FieldType.refList,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'array_starts_with',
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'array_ends_with',
          type: FieldType.ref,
          refType: FieldRefType.scalar,
          value: jsonScalar.name,
        },
        {
          name: 'lt',
          type: FieldType.float,
        },
        {
          name: 'lte',
          type: FieldType.float,
        },
        {
          name: 'gt',
          type: FieldType.float,
        },
        {
          name: 'gte',
          type: FieldType.float,
        },
        {
          name: 'search',
          type: FieldType.string,
        },
        {
          name: 'searchLanguage',
          type: FieldType.ref,
          refType: FieldRefType.enum,
          value: searchLanguage.name,
        },
        {
          name: 'searchType',
          type: FieldType.ref,
          refType: FieldRefType.enum,
          value: searchType.name,
        },
      ]);
  }
}
