export class GetOpenApiSchemaQuery {
  public constructor(
    public readonly data: {
      readonly revisionId: string;
      readonly projectName: string;
    },
  ) {}
}
