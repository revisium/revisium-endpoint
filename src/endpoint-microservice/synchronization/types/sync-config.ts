export interface SyncConfig {
  strategies: {
    pgNotify: {
      enabled: boolean;
      maxReconnectAttempts: number;
    };
    nestjsMicroservice: {
      enabled: boolean;
    };
    dbPolling: {
      enabled: boolean;
      intervalMs: number;
      batchSize: number;
    };
    fallbackCheck: {
      enabled: boolean;
      cacheTtlMs: number;
    };
  };
  mutex: {
    timeoutMs: number;
  };
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  strategies: {
    pgNotify: {
      enabled: true,
      maxReconnectAttempts: 5,
    },
    nestjsMicroservice: {
      enabled: true,
    },
    dbPolling: {
      enabled: true,
      intervalMs: 30000,
      batchSize: 50,
    },
    fallbackCheck: {
      enabled: true,
      cacheTtlMs: 60000,
    },
  },
  mutex: {
    timeoutMs: 30000,
  },
};
