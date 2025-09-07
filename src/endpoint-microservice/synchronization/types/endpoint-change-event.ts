import { EndpointType } from '@prisma/client';

export interface EndpointChangeEvent {
  type: 'created' | 'updated' | 'deleted';
  endpointId: string;
  endpointType: EndpointType;
  revisionId?: string;
  version?: number;
  timestamp: Date;
}
