export interface EndpointChangeEvent {
  readonly type: 'created' | 'updated' | 'deleted';
  readonly endpointId: string;
}
