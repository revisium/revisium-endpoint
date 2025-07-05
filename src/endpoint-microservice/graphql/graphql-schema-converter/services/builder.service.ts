import SchemaBuilder from '@pothos/core';
import DirectivePlugin from '@pothos/plugin-directives';
import FederationPlugin from '@pothos/plugin-federation';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { SortDirection } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types/sortDirection';
import { getProjectName } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/getProjectName';

interface BuilderServiceOptions {
  projectName: string;
}

interface PageInfo {
  startCursor?: string;
  endCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class BuilderService {
  public readonly builder = new SchemaBuilder<{
    Scalars: {
      JSON: {
        Input: unknown;
        Output: unknown;
      };
      DateTime: {
        Input: Date;
        Output: Date;
      };
    };
  }>({
    plugins: [DirectivePlugin, FederationPlugin],
  });

  public readonly json = this.builder.addScalarType('JSON', JSONResolver);
  public readonly date = this.builder.addScalarType(
    'DateTime',
    DateTimeResolver,
  );

  constructor(private readonly options: BuilderServiceOptions) {
    this.init();
  }

  private init() {
    this.addPageInfo();
    this.addSortOrder();
    this.addFilters();
  }

  private addPageInfo() {
    this.builder.objectRef<PageInfo>(this.getName('PageInfo')).implement({
      fields: (t) => ({
        startCursor: t.exposeString('startCursor', {}),
        endCursor: t.exposeString('endCursor', {}),
        hasNextPage: t.exposeBoolean('hasNextPage', { nullable: false }),
        hasPreviousPage: t.exposeBoolean('hasPreviousPage', {
          nullable: false,
        }),
      }),
    });
  }

  private addSortOrder() {
    this.builder.enumType(this.getName('SortOrder'), {
      values: [SortDirection.ASC, SortDirection.DESC],
    });
  }

  private addFilters() {
    this.addStringFilter();
    this.addBooleanFilter();
    this.addDateTimeFilter();
    this.addJsonFilter();
  }

  private addStringFilter() {
    const mode = this.builder.enumType(this.getName('FilterStringMode'), {
      values: ['default', 'insensitive'],
    });

    this.builder.inputType(this.getName('StringFilter'), {
      fields: (t) => ({
        equals: t.string(),
        in: t.stringList(),
        notIn: t.stringList(),
        lt: t.string(),
        lte: t.string(),
        gt: t.string(),
        gte: t.string(),
        contains: t.string(),
        startsWith: t.string(),
        endsWith: t.string(),
        mode: t.field({
          type: mode,
        }),
        not: t.string(),
      }),
    });
  }

  private addBooleanFilter() {
    this.builder.inputType(this.getName('BoolFilter'), {
      fields: (t) => ({
        equals: t.boolean(),
        not: t.boolean(),
      }),
    });
  }

  private addDateTimeFilter() {
    this.builder.inputType(this.getName('DateTimeFilter'), {
      fields: (t) => ({
        equals: t.string(),
        in: t.stringList(),
        notIn: t.stringList(),
        lt: t.string(),
        lte: t.string(),
        gt: t.string(),
        gte: t.string(),
      }),
    });
  }

  private addJsonFilter() {
    const mode = this.builder.enumType(this.getName('FilterJsonMode'), {
      values: ['default', 'insensitive'],
    });

    this.builder.inputType(this.getName('JsonFilter'), {
      fields: (t) => ({
        equals: t.field({
          type: this.json,
        }),
        path: t.stringList(),
        mode: t.field({
          type: mode,
        }),
        string_contains: t.string(),
        string_starts_with: t.string(),
        string_ends_with: t.string(),
        array_contains: t.field({
          type: t.listRef(this.json),
        }),
        array_starts_with: t.field({
          type: this.json,
        }),
        array_ends_with: t.field({
          type: this.json,
        }),
        lt: t.float(),
        lte: t.float(),
        gt: t.float(),
        gte: t.float(),
      }),
    });
  }

  private getName(postfix: string) {
    return `${getProjectName(this.options.projectName)}${postfix}`;
  }
}
