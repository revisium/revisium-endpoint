export class GetGraphqlSchemaQuery {
  public constructor(
    public readonly data: {
      readonly revisionId: string;
    },
  ) {}
}
