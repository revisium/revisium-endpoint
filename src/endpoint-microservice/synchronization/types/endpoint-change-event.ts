import { EndpointType } from '@prisma/client';

export interface EndpointChangeEvent {
  readonly type: 'created' | 'updated' | 'deleted';
  readonly endpointId: string;
  readonly endpointType: EndpointType;
  readonly revisionId?: string;
  readonly version?: number;
  readonly timestamp: Date;
}
