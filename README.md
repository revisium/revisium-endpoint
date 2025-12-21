# @revisium/endpoint

![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=revisium_revisium-endpoint&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=revisium_revisium-endpoint)

**Status: Experimental and Not Production-Ready**

Revisium is a tool (UI/API) inspired by JSON (JSON Schema) and Git, designed to provide a flexible and low-level headless CMS solution. **This project originated from a closed-source repository** where it was developed over the course of a year and a half as a proof of concept. I am now making it open source to foster community involvement, transparency, and collaborative improvement.

[Revisium](https://github.com/revisium/revisium)

## Environment Variables

The `@revisium/endpoint` service supports various environment variables for configuration. Copy `.env.example` to `.env` and modify as needed.

### Core Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port for the endpoint service |
| `DATABASE_URL` | **Required** | PostgreSQL connection string |

### Core API Integration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORE_API_URL` | **Required** | URL to the revisium-core API service |
| `CORE_API_URL_USERNAME` | **Required** | Username for core API authentication |
| `CORE_API_URL_PASSWORD` | **Required** | Password for core API authentication |

### Redis Microservice Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ENDPOINT_PORT` | `6380` | Redis port for microservice communication |
| `ENDPOINT_HOST` | **Required** | Redis host for microservice communication |

### System Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `METRICS_ENABLED` | `false` | Enable/disable metrics collection |
| `GRACEFUL_SHUTDOWN_TIMEOUT` | `10000` | Graceful shutdown timeout in milliseconds |

### GraphQL Schema Configuration

| Variable | Default | Validation | Description |
|----------|---------|------------|-------------|
| `GRAPHQL_HIDE_NODE_TYPES` | `false` | `true`\|`false`\|`1`\|`0` | Hide GraphQL node types from generated schema |
| `GRAPHQL_HIDE_FLAT_TYPES` | `false` | `true`\|`false`\|`1`\|`0` | Hide GraphQL flat types from generated schema |
| `GRAPHQL_FLAT_POSTFIX` | `Flat` | GraphQL identifier or `""` | Postfix for flat GraphQL types |
| `GRAPHQL_NODE_POSTFIX` | `""` | GraphQL identifier or `""` | Postfix for node GraphQL types |
| `GRAPHQL_PREFIX_FOR_TABLES` | Project name | GraphQL identifier or `""` | Prefix for table-related GraphQL types |
| `GRAPHQL_PREFIX_FOR_COMMON` | Project name | GraphQL identifier or `""` | Prefix for common GraphQL types |

#### GraphQL Configuration Rules

1. **Boolean Values**: Accept `true`, `false`, `1`, `0` (case-insensitive)
2. **GraphQL Identifiers**: Must match `/^[_A-Za-z][_0-9A-Za-z]*$/` or be empty string
3. **Postfix Mutual Exclusivity**: 
   - ❌ Both `GRAPHQL_FLAT_POSTFIX=""` and `GRAPHQL_NODE_POSTFIX=""` when both types are visible
   - ✅ Empty postfix allowed when corresponding type is hidden (e.g., `GRAPHQL_NODE_POSTFIX=""` valid when `GRAPHQL_HIDE_NODE_TYPES=true`)

#### GraphQL Configuration Examples

```bash
# Hide node types, customize flat types
GRAPHQL_HIDE_NODE_TYPES=true
GRAPHQL_FLAT_POSTFIX=""
GRAPHQL_PREFIX_FOR_TABLES=""

# Custom naming with both types visible
GRAPHQL_FLAT_POSTFIX="Detailed"
GRAPHQL_NODE_POSTFIX="Summary"
GRAPHQL_PREFIX_FOR_TABLES="MyAPI"

# Hide flat types, customize node types
GRAPHQL_HIDE_FLAT_TYPES=true
GRAPHQL_NODE_POSTFIX=""
GRAPHQL_PREFIX_FOR_COMMON="Custom"
```

### Configuration Validation

The service validates all environment variables at startup and will fail to start if:
- Required variables are missing
- Boolean variables have invalid values
- GraphQL identifiers don't match naming conventions
- Postfix configurations violate mutual exclusivity rules

For detailed validation rules and error messages, see the `GraphQLOptionsService` implementation.

### REST API Schema Configuration

| Variable | Default | Validation | Description |
|----------|---------|------------|-------------|
| `RESTAPI_PREFIX_FOR_TABLES` | Project name | GraphQL identifier or `""` | Prefix for table-related OpenAPI schemas |
| `RESTAPI_PREFIX_FOR_COMMON` | Project name | GraphQL identifier or `""` | Prefix for common OpenAPI schemas (filters, orderBy) |

#### REST API Configuration Rules

1. **Identifiers**: Must match `/^[_A-Za-z][_0-9A-Za-z]*$/` or be empty string
2. **Default Behavior**: When not set, uses capitalized project name as prefix
3. **Empty Prefix**: Setting `""` removes prefix from schema names

#### REST API Configuration Examples

```bash
# Default configuration (project "blog")
# URLs: /users, /user/{id}
# Schemas: BlogUser, BlogStringFilter

# Custom prefix
RESTAPI_PREFIX_FOR_TABLES=Api
RESTAPI_PREFIX_FOR_COMMON=Common
# URLs: /users, /user/{id}
# Schemas: ApiUser, CommonStringFilter

# No prefix
RESTAPI_PREFIX_FOR_TABLES=""
RESTAPI_PREFIX_FOR_COMMON=""
# URLs: /users, /user/{id}
# Schemas: User, StringFilter
```

For detailed validation rules, see the `RestapiOptionsService` implementation.