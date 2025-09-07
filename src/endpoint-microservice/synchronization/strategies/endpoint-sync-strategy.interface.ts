import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';
import { EndpointChangeEvent } from '../types';

export interface EndpointSyncStrategy {
  readonly name: string;
  readonly initializationOrder: number;

  isEnabled(appOptions: AppOptions): boolean;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  onEndpointChange(
    handler: (event: EndpointChangeEvent) => Promise<void>,
  ): void;
}
