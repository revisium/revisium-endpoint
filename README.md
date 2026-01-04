<div align="center">

# @revisium/endpoint

Dynamic API generator for [Revisium](https://github.com/revisium/revisium) — unopinionated data platform for hierarchical structures.

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

See [Configuration Guide](docs/configuration.md) for environment variables.

## Related Packages

| Package | Description |
|---------|-------------|
| [@revisium/core](https://github.com/revisium/revisium-core) | Backend API — required data source |
| [@revisium/schema-toolkit](https://github.com/revisium/schema-toolkit) | JSON Schema utilities for schema transformation |

## License

Apache 2.0 — See [Revisium](https://github.com/revisium/revisium) for full license.
