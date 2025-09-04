# GraphQL Endpoint Module

The GraphQL Endpoint module is responsible for dynamically generating GraphQL schemas from JSON schemas and serving them as fully functional GraphQL endpoints. This module converts database table schemas into a complete GraphQL API with queries, mutations, filtering, sorting, and pagination capabilities.

**Note**: Currently, only queries are implemented. Mutations are under development and will be added in a future release.

## Table of Contents

- [Overview](#overview)
- [Documentation Files](#documentation-files)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Generated Schema Structure](#generated-schema-structure)
- [Configuration Options](#configuration-options)
- [Performance & Caching](#performance--caching)

## Overview

This module automatically generates a complete GraphQL API from JSON schemas that represent database tables. It handles:

- Converting JSON schema types to GraphQL types
- Generating queries for single entities and lists
- Creating connection types for pagination
- Building filter and sort input types
- Handling relationships between entities with automatic foreign key resolution
- Providing both "Node" (full entity with system metadata) and "Flat" (simplified) representations

**Current Limitations:**
- Only queries are implemented (mutations under development)
- Ordering only works with system fields (createdAt, id, etc.)
- Custom field sorting will be added in a future release

## Documentation Files

For detailed information, please refer to the following documentation files:

1. **[Examples](./docs/examples.md)** - Comprehensive examples of queries with filtering, sorting, pagination, and relationships
2. **[Schema Structure](./docs/schema-structure.md)** - Detailed documentation of all generated types and their structure
3. **[Configuration](./docs/configuration.md)** - Complete guide to all configuration options and environment variables
4. **[Technical Documentation](./docs/technical.md)** - In-depth technical details about implementation and architecture

## Architecture

The GraphQL module follows a modular architecture with several key components:

```
GraphQL Module
├── GraphQLSchemaConverter - Main conversion logic
├── SchemaToBuilderConverter - Converts internal schema to Pothos schema
├── ModelService - Processes schema fields and types
├── NamingService - Handles consistent naming across the schema
├── ContextService - Manages conversion context and options
├── Query/Command Handlers - Handle endpoint lifecycle
└── GraphQL Endpoint Service - Serves the generated schemas
```

The conversion process uses a strategy pattern with type handlers for different JSON schema types:
- ObjectTypeHandler - Handles object schemas
- ArrayTypeHandler - Handles array schemas
- StringTypeHandler - Handles string schemas
- NumberTypeHandler - Handles number schemas
- BooleanTypeHandler - Handles boolean schemas
- ForeignKeyHandler - Handles foreign key relationships

## How It Works

1. **Schema Retrieval**: The system fetches JSON schemas from the core microservice for all tables in a project
2. **Schema Conversion**: The GraphQLSchemaConverter processes each schema and builds the corresponding GraphQL types
3. **Type Generation**: For each table, the system generates:
   - Node types (with full entity resolution)
   - Flat types (simplified data structures)
   - Connection types for pagination
   - Input types for filtering and sorting
4. **Query Generation**: Automatic generation of queries for retrieving data
5. **Schema Serving**: The generated schema is served via Apollo Server

## Generated Schema Structure

For each table in your database, the system generates a comprehensive set of types:

### Core Types

1. **Entity Types**: Represent the core data structure of your table
2. **Node Types**: Extend entity types with metadata fields (id, createdAt, etc.)
3. **Flat Types**: Simplified versions without metadata
4. **Connection Types**: Implement the Relay pagination specification
5. **Edge Types**: Connect entities to cursors for pagination
6. **Input Types**: For filtering, sorting, and querying

### System Types

1. **PageInfo**: Pagination information
2. **SortOrder**: Enum for sort direction (asc/desc)
3. **Filter Types**: Input types for filtering by different data types
4. **OrderBy Types**: Input types for specifying sort fields

## Configuration Options

The GraphQL module can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| GRAPHQL_HIDE_NODE_TYPES | Hide Node types from schema | false |
| GRAPHQL_HIDE_FLAT_TYPES | Hide Flat types from schema | false |
| GRAPHQL_FLAT_POSTFIX | Postfix for flat types | "Flat" |
| GRAPHQL_NODE_POSTFIX | Postfix for node types | "" |
| GRAPHQL_PREFIX_FOR_TABLES | Prefix for table-specific types | Project name |
| GRAPHQL_PREFIX_FOR_COMMON | Prefix for common types | Project name |

## Performance & Caching

The module implements several caching mechanisms to optimize performance:

1. **Schema Caching**: Generated schemas are cached to avoid regeneration
2. **Row Caching**: Frequently accessed data is cached using GraphqlCachedRowsInterceptor
3. **Connection Pooling**: Efficient database connection management