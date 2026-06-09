<div align="center">

# @revisium/endpoint

Dynamic API generator for [Revisium](https://github.com/revisium/revisium) — unopinionated data platform with referential integrity.

**Your schema. Your data. Full control.**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=revisium_revisium-endpoint&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=revisium_revisium-endpoint)
[![npm](https://img.shields.io/npm/v/@revisium/endpoint?color=red)](https://www.npmjs.com/package/@revisium/endpoint)
[![Docker](https://img.shields.io/docker/v/revisium/revisium-endpoint?label=docker&sort=semver)](https://hub.docker.com/r/revisium/revisium-endpoint)

> Referential integrity with foreign keys at any depth.
> Git-like versioning: branches, revisions, drafts.
> Schema evolution: migrations with data transformations.

Part of the [Revisium](https://github.com/revisium/revisium) ecosystem.
Available on [npm](https://www.npmjs.com/package/@revisium/endpoint) | [Docker Hub](https://hub.docker.com/r/revisium/revisium-endpoint).

</div>

## Overview

Endpoint generates GraphQL and REST APIs automatically from your Revisium schemas. Each revision gets its own API endpoint with schema derived from table definitions.

Requires [@revisium/core](https://github.com/revisium/revisium-core) as the backend data source.

## Architecture

<div align="center">

```text
┌─────────────────────────────────────────────────────────┐
│                   Generated APIs                        │
├───────────────────────────┬─────────────────────────────┤
│         GraphQL           │          REST API           │
│   - Type-safe queries     │   - OpenAPI/Swagger spec    │
│   - Nested relations      │   - CRUD endpoints          │
│   - Apollo Federation     │   - Filtering & pagination  │
├───────────────────────────┴─────────────────────────────┤
│                  Schema Generator                       │
│        Transforms JSON Schema → API Schema              │
├─────────────────────────────────────────────────────────┤
│                @revisium/core API Client                │
│      Fetches schemas and data via GraphQL/REST          │
├─────────────────────────────────────────────────────────┤
│                    Infrastructure                       │
├─────────────────┬───────────────────────────────────────┤
│   PostgreSQL    │        Redis or pg-sync               │
│   (Shared DB)   │   (Multi-pod notifications)           │
└─────────────────┴───────────────────────────────────────┘
```
</div>

### Generated APIs

| API | Features |
|-----|----------|
| **GraphQL** | Type-safe queries, nested relations, filtering, pagination, Apollo Federation |
| **REST** | OpenAPI 3.0 spec, Swagger UI, CRUD operations, query parameters |

### Modes

| Mode | Description |
|------|-------------|
| **Monolith** | Runs embedded within `@revisium/core` |
| **Microservice** | Standalone service communicating via Redis |

### Auto-sync

Schema changes in Revisium are automatically reflected in generated APIs — no manual regeneration required.

## Configuration

See [ENV.md](./ENV.md) for all environment variables.

## Related Packages

| Package | Description |
|---------|-------------|
| [@revisium/core](https://github.com/revisium/revisium-core) | Backend API — required data source |
| [@revisium/schema-toolkit](https://github.com/revisium/schema-toolkit) | JSON Schema utilities for schema transformation |

## Development

This project uses [pnpm](https://pnpm.io) (pinned via the `packageManager` field in `package.json`).

```bash
corepack enable           # activates the pinned pnpm (11.5.2)
pnpm install              # install dependencies (build scripts gated by pnpm-workspace.yaml allowBuilds)

pnpm run lint:ci          # lint
pnpm run tsc              # type-check
pnpm run test:cov         # unit tests with coverage
pnpm run build            # build
```

Node version: see `.nvmrc` (24.11.1).

> The Prisma client is committed to `src/__generated__/client` — no `prisma generate` is needed
> for local dev or CI. To regenerate: `pnpm exec prisma generate`.

### E2E tests (requires Docker + PostgreSQL)

```bash
cp .env.example .env
pnpm run test:e2e:up      # start postgres via docker-compose-e2e.yml
pnpm run test:e2e         # run e2e suite
pnpm run test:e2e:down    # stop and remove containers
```

## License

Apache 2.0 — See [Revisium](https://github.com/revisium/revisium) for full license.
