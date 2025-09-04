# GraphQL Configuration Options

This document details all available configuration options for the GraphQL module, including environment variables and their effects on the generated schema.

**Note**: These configuration options currently only affect query generation, as mutations are under development.

## Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Configuration Examples](#configuration-examples)
- [Best Practices](#best-practices)

## Overview

The GraphQL module can be configured through environment variables to customize the generated schema structure, naming conventions, and available features. These options allow you to tailor the GraphQL API to your specific needs.

## Environment Variables

### Core Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| GRAPHQL_HIDE_NODE_TYPES | Boolean | false | Hide Node types (with metadata) from the schema |
| GRAPHQL_HIDE_FLAT_TYPES | Boolean | false | Hide Flat types (without metadata) from the schema |
| GRAPHQL_FLAT_POSTFIX | String | "Flat" | Postfix for flat types |
| GRAPHQL_NODE_POSTFIX | String | "" | Postfix for node types |

### Naming Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| GRAPHQL_PREFIX_FOR_TABLES | String | Project name | Prefix for table-specific types |
| GRAPHQL_PREFIX_FOR_COMMON | String | Project name | Prefix for common/system types |

### Detailed Descriptions

#### GRAPHQL_HIDE_NODE_TYPES

When set to true, all Node types (types with metadata fields like `createdAt`, `id`, etc.) will be excluded from the generated schema. This can be useful when you only want to expose simplified data structures.

Example:
```bash
GRAPHQL_HIDE_NODE_TYPES=true
```

#### GRAPHQL_HIDE_FLAT_TYPES

When set to true, all Flat types (simplified types without metadata) will be excluded from the generated schema. This can be useful when you always want to expose full metadata.

Example:
```bash
GRAPHQL_HIDE_FLAT_TYPES=true
```

#### GRAPHQL_FLAT_POSTFIX

Controls the postfix used for flat types. The default is "Flat", resulting in types like `UserFlat`. You can customize this to any valid GraphQL identifier.

Example:
```bash
GRAPHQL_FLAT_POSTFIX=Simple
# Results in types like UserSimple
```

Note: If you set this to an empty string, you must either:
1. Also set GRAPHQL_NODE_POSTFIX to a non-empty value, or
2. Hide one of the type variants (NODE or FLAT) to avoid naming conflicts

#### GRAPHQL_NODE_POSTFIX

Controls the postfix used for node types. The default is an empty string, resulting in types like `UserNode`. You can customize this to any valid GraphQL identifier.

Example:
```bash
GRAPHQL_NODE_POSTFIX=Full
# Results in types like UserFull
```

Note: If you set this to an empty string, you must either:
1. Also set GRAPHQL_FLAT_POSTFIX to a non-empty value, or
2. Hide one of the type variants (NODE or FLAT) to avoid naming conflicts

#### GRAPHQL_PREFIX_FOR_TABLES

Controls the prefix used for table-specific types. By default, this is the project name. You can customize this to any valid GraphQL identifier.

Example:
```bash
GRAPHQL_PREFIX_FOR_TABLES=MyAPI
# Results in types like MyAPIUser instead of ProjectNameUser
```

#### GRAPHQL_PREFIX_FOR_COMMON

Controls the prefix used for common/system types like PageInfo, SortOrder, filter types, etc. By default, this is the project name. You can customize this to any valid GraphQL identifier.

Example:
```bash
GRAPHQL_PREFIX_FOR_COMMON=System
# Results in types like SystemPageInfo instead of ProjectNamePageInfo
```

## Configuration Examples

### Basic Configuration

```bash
# Hide node types, only expose flat types
GRAPHQL_HIDE_NODE_TYPES=true

# Customize flat postfix
GRAPHQL_FLAT_POSTFIX=Data
```

### Advanced Configuration

```bash
# Customize both postfixes
GRAPHQL_FLAT_POSTFIX=Simple
GRAPHQL_NODE_POSTFIX=Full

# Customize prefixes
GRAPHQL_PREFIX_FOR_TABLES=App
GRAPHQL_PREFIX_FOR_COMMON=Sys
```

### Minimal Schema Configuration

```bash
# Only expose node types with custom naming
GRAPHQL_HIDE_FLAT_TYPES=true
GRAPHQL_NODE_POSTFIX=Record
GRAPHQL_PREFIX_FOR_TABLES=MyApp
```

### Federation-Friendly Configuration

```bash
# Use consistent naming for federation
GRAPHQL_PREFIX_FOR_TABLES=
GRAPHQL_PREFIX_FOR_COMMON=
GRAPHQL_NODE_POSTFIX=Entity
```

## Validation Rules

The configuration system includes several validation rules to prevent invalid configurations:

1. **Postfix Mutual Exclusivity**: GRAPHQL_FLAT_POSTFIX and GRAPHQL_NODE_POSTFIX cannot both be empty at the same time if both type variants are enabled.

2. **GraphQL Naming Validation**: All prefixes and postfixes must be valid GraphQL identifiers (start with letter or underscore, followed by letters, digits, or underscores).

3. **Boolean Validation**: Boolean environment variables must be one of: true, false, 1, 0 (case-insensitive).

## Best Practices

### Naming Consistency

Choose naming conventions that are consistent across your organization:

```bash
# Good: Consistent, descriptive naming
GRAPHQL_PREFIX_FOR_TABLES=MyCompany
GRAPHQL_PREFIX_FOR_COMMON=MyCompany
GRAPHQL_FLAT_POSTFIX=Data
GRAPHQL_NODE_POSTFIX=Entity
```

### Federation Considerations

If you're using GraphQL Federation, consider using consistent naming:

```bash
# Good for federation: Minimal prefixes
GRAPHQL_PREFIX_FOR_TABLES=
GRAPHQL_PREFIX_FOR_COMMON=
GRAPHQL_NODE_POSTFIX=Entity
```

### Performance Considerations

Hiding unused type variants can reduce schema size and complexity:

```bash
# If you only use flat types
GRAPHQL_HIDE_NODE_TYPES=true
```

### Development vs Production

You might want different configurations for development and production:

```bash
# Development: Expose all types for flexibility
GRAPHQL_HIDE_NODE_TYPES=false
GRAPHQL_HIDE_FLAT_TYPES=false

# Production: Optimize based on actual usage
GRAPHQL_HIDE_NODE_TYPES=true  # If only using flat types
```

## Troubleshooting

### Common Issues

1. **Naming Conflicts**: If you get naming conflicts, ensure that either:
   - Both postfixes are not empty, or
   - One type variant is hidden

2. **Invalid Identifiers**: Ensure all prefixes and postfixes follow GraphQL naming rules

3. **Missing Types**: If expected types are missing, check if they are being hidden by configuration

### Debugging Configuration

The system logs the loaded configuration at startup, which can help diagnose issues:

```log
[Nest] 12345 - 01/01/2023, 12:00:00 PM GraphQLOptionsService { "hideNodeTypes": true, "flatPostfix": "Data" }
```