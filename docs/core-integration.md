# Authentication with revisium-core

revisium-endpoint authenticates with revisium-core to fetch revision data for API generation.

## Monolith mode (standalone / self-hosted Docker)

No configuration needed. On startup, revisium-core derives an internal API key deterministically from `JWT_SECRET` and sets `process.env.INTERNAL_API_KEY_ENDPOINT`. Since core and endpoint run in the same process, the endpoint picks up the key automatically.

For multi-replica deployments, `JWT_SECRET` must be explicitly set (shared across all pods) so that every instance derives the same key. If `JWT_SECRET` is not set, a random key is generated — this works for single-pod only.

## Microservice mode

Internal API Key is the recommended auth method. Stateless, no token refresh, no login flow.

### Setup

1. Generate a key: `cd revisium-core && npm run generate:internal-key`
2. Set `INTERNAL_API_KEY_ENDPOINT` env var in both core and endpoint services (same value)
3. Restart both services — core registers the key in DB, endpoint uses it as `X-Internal-Api-Key` header

### Multiple internal services

Each internal service uses its own env var following the `INTERNAL_API_KEY_{SERVICE}` pattern:

```bash
INTERNAL_API_KEY_ENDPOINT=rev_xxxxxxxxxxxxxxxxxxxx   # for endpoint service
INTERNAL_API_KEY_WORKER=rev_yyyyyyyyyyyyyyyyyyyyyy   # for worker service
```

Core registers each service as a separate DB record with `internalServiceName` derived from the suffix (lowercased). Keys are independent — rotating one does not affect others.

### Rotation

1. Generate a new key: `npm run generate:internal-key`
2. Update `INTERNAL_API_KEY_ENDPOINT` in both services
3. Restart core first (registers new key, revokes old), then endpoint

## Legacy: Password auth (deprecated)

If `INTERNAL_API_KEY_ENDPOINT` is not set in microservice mode, endpoint falls back to password auth:
- Set `CORE_API_URL_USERNAME` and `CORE_API_URL_PASSWORD` in endpoint env
- Endpoint calls core's login endpoint to get JWT

### Limitations

- JWT can expire causing outages — no automatic refresh
- In monolith mode, generates random password on each restart
- Will be removed in a future version
