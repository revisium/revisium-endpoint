# Environment Variables

This document describes all environment variables for **revisium-endpoint**.

## Quick Start

```bash
cp .env.example .env
# Edit .env with your configuration
```

---

## Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (same database as revisium-core) |

---

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8081` | HTTP server port |

---

## Core API Integration (Microservice Mode)

| Variable | Default | Description |
|----------|---------|-------------|
| `CORE_API_URL` | `http://0.0.0.0:{PORT}` | URL to revisium-core API |
| `INTERNAL_API_KEY_ENDPOINT` | - | Internal API key for authenticating with revisium-core. Must match the value set in core. Format: `rev_` + 22 base64url chars (regex `/^rev_[A-Za-z0-9_-]{22}$/`); validated by core's `ApiKeyService.validateKeyFormat`. Generate with `node -e "console.log('rev_' + require('crypto').randomBytes(17).toString('base64url').slice(0,22))"`. A plain `openssl rand -hex 32` value will be rejected by core with `Invalid API key format` (401) and the endpoint will fail to register at runtime (all `/endpoint/*` URLs return 404). In monolith mode, auto-set by core (derived from `JWT_SECRET`); set this var explicitly only in microservice mode. |
| `CORE_API_URL_USERNAME` | - | *(Deprecated)* Username for core API password authentication |
| `CORE_API_URL_PASSWORD` | - | *(Deprecated)* Password for core API password authentication |

---

## Redis Microservice Communication

| Variable | Default | Description |
|----------|---------|-------------|
| `ENDPOINT_HOST` | `localhost` | Redis host for microservice communication |
| `ENDPOINT_PORT` | `6380` | Redis port for microservice communication |

---

## Synchronization

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNC_PG_NOTIFY_ENABLED` | `true` | Enable PostgreSQL LISTEN/NOTIFY for real-time sync |
| `SYNC_PG_NOTIFY_MAX_RECONNECT_ATTEMPTS` | `5` | Max reconnection attempts for PG LISTEN |
| `SYNC_DB_POLLING_ENABLED` | `true` | Enable database polling as fallback sync |
| `SYNC_DB_POLLING_INTERVAL_MS` | `30000` | Polling interval in milliseconds |
| `SYNC_DB_POLLING_BATCH_SIZE` | `50` | Batch size for polling queries |
| `SYNC_INITIAL_BATCH_SIZE` | `100` | Batch size for initial synchronization |

---

## GraphQL Schema Customization

| Variable | Default | Description |
|----------|---------|-------------|
| `GRAPHQL_HIDE_NODE_TYPES` | `false` | Hide node types in generated GraphQL schema |
| `GRAPHQL_HIDE_FLAT_TYPES` | `false` | Hide flat types in generated GraphQL schema |
| `GRAPHQL_HIDE_MUTATIONS` | `false` | Hide mutations from draft revision GraphQL schema |
| `GRAPHQL_FLAT_POSTFIX` | `Flat` | Postfix for flat type names |
| `GRAPHQL_NODE_POSTFIX` | `` | Postfix for node type names |
| `GRAPHQL_PREFIX_FOR_TABLES` | `` | Prefix for table type names |
| `GRAPHQL_PREFIX_FOR_COMMON` | `` | Prefix for common type names |

---

## REST API Customization

| Variable | Default | Description |
|----------|---------|-------------|
| `RESTAPI_PREFIX_FOR_TABLES` | `` | Prefix for table routes |
| `RESTAPI_PREFIX_FOR_COMMON` | `` | Prefix for common routes |

---

## Metrics & Monitoring

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_ENABLED` | `false` | Enable Prometheus metrics endpoint |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | `10000` | Delay before shutdown (ms) |
