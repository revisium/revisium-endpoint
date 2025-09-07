import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppOptions } from 'src/endpoint-microservice/shared/app-mode';
import { EndpointChangeEvent } from '../types';
import { EndpointSyncStrategy } from './endpoint-sync-strategy.interface';

@Injectable()
export class NestJSMicroserviceStrategy implements EndpointSyncStrategy {
  public readonly name = 'nestjs-microservice';
  public readonly initializationOrder = 20;

  private readonly logger = new Logger(NestJSMicroserviceStrategy.name);
  private changeHandler?: (event: EndpointChangeEvent) => Promise<void>;

  constructor(private readonly configService: ConfigService) {}

  public isEnabled(appOptions: AppOptions): boolean {
    return (
      appOptions.mode === 'microservice' &&
      this.configService.get('SYNC_NESTJS_MICROSERVICE_ENABLED', true)
    );
  }

  public async initialize(): Promise<void> {
    this.logger.log('NestJS Microservice strategy initialized');
  }

  public async shutdown(): Promise<void> {
    this.logger.log('NestJS Microservice strategy shut down');
  }

  public onEndpointChange(
    handler: (event: EndpointChangeEvent) => Promise<void>,
  ): void {
    this.changeHandler = handler;
  }

  public async handleEndpointCreated(endpointId: string): Promise<void> {
    if (this.changeHandler) {
      const changeEvent: EndpointChangeEvent = {
        type: 'created',
        endpointId,
        endpointType: 'GRAPHQL',
        revisionId: '',
        timestamp: new Date(),
      };
      await this.changeHandler(changeEvent);
    }
  }

  public async handleEndpointUpdated(endpointId: string): Promise<void> {
    this.logger.debug(`Processing endpoint_updated event for: ${endpointId}`);

    if (this.changeHandler) {
      const changeEvent: EndpointChangeEvent = {
        type: 'updated',
        endpointId,
        endpointType: 'GRAPHQL',
        revisionId: '',
        timestamp: new Date(),
      };
      await this.changeHandler(changeEvent);
    }
  }

  public async handleEndpointDeleted(payload: {
    endpointId: string;
    endpointType: any;
  }): Promise<void> {
    this.logger.debug(
      `Processing endpoint_deleted event for: ${payload.endpointId}`,
    );

    if (this.changeHandler) {
      const changeEvent: EndpointChangeEvent = {
        type: 'deleted',
        endpointId: payload.endpointId,
        endpointType: payload.endpointType,
        revisionId: '',
        timestamp: new Date(),
      };
      await this.changeHandler(changeEvent);
    }
  }
}
