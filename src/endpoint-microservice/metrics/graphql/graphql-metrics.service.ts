import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import {
  GRAPHQL_ENDPOINT_DID_ENCOUNTER_ERRORS_TOTAL,
  GRAPHQL_ENDPOINT_DID_RESOLVE_OPERATION_TOTAL,
  GRAPHQL_ENDPOINT_REQUEST_DURATION_SECONDS,
} from 'src/endpoint-microservice/metrics/graphql/constants';

type Labels = {
  operation?: string;
};

@Injectable()
export class GraphqlMetricsService {
  private readonly requestDurationSecondsHistogram = new Histogram({
    name: GRAPHQL_ENDPOINT_REQUEST_DURATION_SECONDS,
    help: 'Duration of GraphQL requests in seconds',
    labelNames: ['operationName', 'operation', 'result'],
  });

  private readonly didResolveOperationTotalCounter = new Counter({
    name: GRAPHQL_ENDPOINT_DID_RESOLVE_OPERATION_TOTAL,
    help: 'Total number of successfully resolved GraphQL operations',
    labelNames: ['operationName', 'operation'],
  });

  private readonly didEncounterErrorsTotalCounter = new Counter({
    name: GRAPHQL_ENDPOINT_DID_ENCOUNTER_ERRORS_TOTAL,
    help: 'Total number of errors encountered during GraphQL request processing',
    labelNames: ['operationName', 'operation'],
  });

  constructor() {}

  public requestDurationSeconds(
    labels: Labels & {
      result?: 'true' | 'false';
    },
    durationInSeconds: number,
  ) {
    this.requestDurationSecondsHistogram.observe(labels, durationInSeconds);
  }

  public didResolveOperation(labels: Labels) {
    this.didResolveOperationTotalCounter.inc(labels);
  }

  public didEncounterErrors(labels: Labels) {
    this.didEncounterErrorsTotalCounter.inc(labels);
  }
}
