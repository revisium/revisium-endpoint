# Authentication with revisium-core

revisium-endpoint authenticates with revisium-core to fetch revision data for API generation.

## Monolith mode (standalone / self-hosted Docker)

No configuration needed. The core service (`revisium-core`) auto-generates an internal API key on startup and sets it in `process.env.INTERNAL_API_KEY`. Since core and endpoint run in the same process, the endpoint picks up the key automatically — no manual configuration required.

## Microservice mode

Internal API Key is the recommended auth method. Stateless, no token refresh, no login flow.

### Setup

1. Generate a key: `cd revisium-core && npm run generate:internal-key`
2. Set `INTERNAL_API_KEY` env var in both core and endpoint services (same value)
3. Restart both services — core registers the key in DB, endpoint uses it as `X-Internal-Api-Key` header

### Rotation

1. Generate a new key: `npm run generate:internal-key`
2. Update `INTERNAL_API_KEY` in both services
3. Restart core first (registers new key, revokes old), then endpoint

## Legacy: Password auth (deprecated)

If `INTERNAL_API_KEY` is not set in microservice mode, endpoint falls back to password auth:
- Set `CORE_API_URL_USERNAME` and `CORE_API_URL_PASSWORD` in endpoint env
- Endpoint calls core's login endpoint to get JWT

### Limitations

- JWT can expire causing outages — no automatic refresh
- In monolith mode, generates random password on each restart
- Will be removed in a future version
