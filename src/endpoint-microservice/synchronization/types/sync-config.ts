export interface SyncConfig {
  readonly strategies: {
    readonly pgNotify: {
      readonly enabled: boolean;
      readonly maxReconnectAttempts: number;
    };
    readonly nestjsMicroservice: {
      readonly enabled: boolean;
    };
    readonly dbPolling: {
      readonly enabled: boolean;
      readonly intervalMs: number;
      readonly batchSize: number;
    };
    readonly fallbackCheck: {
      readonly enabled: boolean;
      readonly cacheTtlMs: number;
    };
  };
  readonly mutex: {
    readonly timeoutMs: number;
  };
}

export const DEFAULT_SYNC_CONFIG: Readonly<SyncConfig> = Object.freeze({
  strategies: Object.freeze({
    pgNotify: Object.freeze({
      enabled: true,
      maxReconnectAttempts: 5,
    }),
    nestjsMicroservice: Object.freeze({
      enabled: true,
    }),
    dbPolling: Object.freeze({
      enabled: true,
      intervalMs: 30000,
      batchSize: 50,
    }),
    fallbackCheck: Object.freeze({
      enabled: true,
      cacheTtlMs: 60000,
    }),
  }),
  mutex: Object.freeze({
    timeoutMs: 30000,
  }),
});
