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
| `CORE_API_URL_USERNAME` | - | Username for core API authentication |
| `CORE_API_URL_PASSWORD` | - | Password for core API authentication |

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
