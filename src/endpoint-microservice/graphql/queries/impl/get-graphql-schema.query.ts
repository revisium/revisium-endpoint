export class GetGraphqlSchemaQuery {
  public constructor(
    public readonly data: {
      readonly projectId: string;
      readonly projectName: string;
      readonly endpointId: string;
      readonly isDraft: boolean;
      readonly revisionId: string;
    },
  ) {}
}
