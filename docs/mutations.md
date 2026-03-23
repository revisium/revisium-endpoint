# GraphQL Mutations Design

## Status

Accepted (in progress)

## Context

The GraphQL endpoint generates queries from Revisium table schemas. We need to add mutations for draft revisions, covering all core API operations: create, update, patch, delete — both singular and bulk.

Mutations are only available on **draft** revision endpoints. Head (committed) revisions are read-only.

## Core API Operations

The core API exposes 8 mutation operations on draft revisions:

| Operation | Core API Method | Input |
|-----------|----------------|-------|
| createRow | `POST /revision/{id}/tables/{tableId}/rows` | `{ rowId, data }` |
| updateRow | `PUT /revision/{id}/tables/{tableId}/rows/{rowId}` | `{ data }` |
| patchRow | `PATCH /revision/{id}/tables/{tableId}/rows/{rowId}` | `{ patches: [{op, path, value}] }` |
| deleteRow | `DELETE /revision/{id}/tables/{tableId}/rows/{rowId}` | — |
| createRows | `POST /revision/{id}/tables/{tableId}/rows/bulk-create` | `{ rows: [{rowId, data}] }` |
| updateRows | `POST /revision/{id}/tables/{tableId}/rows/bulk-update` | `{ rows: [{rowId, data}] }` |
| patchRows | `POST /revision/{id}/tables/{tableId}/rows/bulk-patch` | `{ rows: [{rowId, patches}] }` |
| deleteRows | `POST /revision/{id}/tables/{tableId}/rows/bulk-delete` | `{ rowIds: [string] }` |

## Naming Conventions

### Field Names

Mutation field names follow the same singular/plural convention as queries:

- Queries use `user` (singular) and `users` (plural) from `generateFieldAndTypeNames()`
- Mutations use the same keys:

| Operation | Field Name Pattern | Example (table: `user`) |
|-----------|--------------------|------------------------|
| create | `create{Singular}` | `createUser` |
| update | `update{Singular}` | `updateUser` |
| patch | `patch{Singular}` | `patchUser` |
| delete | `delete{Singular}` | `deleteUser` |
| bulk create | `create{Plural}` | `createUsers` |
| bulk update | `update{Plural}` | `updateUsers` |
| bulk patch | `patch{Plural}` | `patchUsers` |
| bulk delete | `delete{Plural}` | `deleteUsers` |

Where `{Singular}` and `{Plural}` are the UpperFirst versions of `fieldName.singular` and `fieldName.plural` from `generateFieldAndTypeNames()`.

### Type Names

Table-specific input types use `prefixForTables`; shared types use `prefixForCommon` (see note below):

| Type | Pattern | Example |
|------|---------|---------|
| Create input (singular) | `{Prefix}Create{Table}Input` | `MyProjectCreateUserInput` |
| Update input (singular) | `{Prefix}Update{Table}Input` | `MyProjectUpdateUserInput` |
| Patch input (singular) | `{Prefix}Patch{Table}Input` | `MyProjectPatchUserInput` |
| Patch operation | `{Prefix}PatchOperation` | `MyProjectPatchOperation` |
| Patch op enum | `{Prefix}PatchOp` | `MyProjectPatchOp` |
| Create input (bulk) | `{Prefix}Create{Plural}Input` | `MyProjectCreateUsersInput` |
| Create row item (bulk) | `{Prefix}Create{Plural}RowInput` | `MyProjectCreateUsersRowInput` |
| Update input (bulk) | `{Prefix}Update{Plural}Input` | `MyProjectUpdateUsersInput` |
| Update row item (bulk) | `{Prefix}Update{Plural}RowInput` | `MyProjectUpdateUsersRowInput` |
| Patch input (bulk) | `{Prefix}Patch{Plural}Input` | `MyProjectPatchUsersInput` |
| Patch row item (bulk) | `{Prefix}Patch{Plural}RowInput` | `MyProjectPatchUsersRowInput` |
| Delete input (bulk) | `{Prefix}Delete{Plural}Input` | `MyProjectDeleteUsersInput` |
| Delete result | `{Prefix}DeleteResult` | `MyProjectDeleteResult` |
| Bulk mutation result | `{Prefix}BulkMutationResult` | `MyProjectBulkMutationResult` |

**Note:** `DeleteResult` and `BulkMutationResult` use `prefixForCommon` (not `prefixForTables`) since they are shared across all tables — consistent with other system types like `PageInfo`, `SortOrder`, etc.

`PatchOperation` and `PatchOp` also use `prefixForCommon` since they are shared across all tables.

## Generated Schema

### Singular Mutations

```graphql
type Mutation {
  # Create — returns the created node
  createUser(data: MyProjectCreateUserInput!): MyProjectUserNode!

  # Update (full replace) — returns the updated node
  updateUser(data: MyProjectUpdateUserInput!): MyProjectUserNode!

  # Patch (partial update) — returns the patched node
  patchUser(data: MyProjectPatchUserInput!): MyProjectUserNode!

  # Delete — returns id + success
  deleteUser(id: String!): MyProjectDeleteResult!
}

input MyProjectCreateUserInput {
  id: String!
  data: JSON!
}

input MyProjectUpdateUserInput {
  id: String!
  data: JSON!
}

input MyProjectPatchUserInput {
  id: String!
  patches: [MyProjectPatchOperation!]!
}

input MyProjectPatchOperation {
  op: MyProjectPatchOp!
  path: String!
  value: JSON!
}

enum MyProjectPatchOp {
  replace
}

type MyProjectDeleteResult {
  id: String!
  success: Boolean!
}
```

### Bulk Mutations

```graphql
type Mutation {
  # Bulk create — returns success + count
  createUsers(data: MyProjectCreateUsersInput!): MyProjectBulkMutationResult!

  # Bulk update — returns success + count
  updateUsers(data: MyProjectUpdateUsersInput!): MyProjectBulkMutationResult!

  # Bulk patch — returns success + count
  patchUsers(data: MyProjectPatchUsersInput!): MyProjectBulkMutationResult!

  # Bulk delete — returns success + count
  deleteUsers(data: MyProjectDeleteUsersInput!): MyProjectBulkMutationResult!
}

input MyProjectCreateUsersInput {
  rows: [MyProjectCreateUsersRowInput!]!
}

input MyProjectCreateUsersRowInput {
  id: String!
  data: JSON!
}

input MyProjectUpdateUsersInput {
  rows: [MyProjectUpdateUsersRowInput!]!
}

input MyProjectUpdateUsersRowInput {
  id: String!
  data: JSON!
}

input MyProjectPatchUsersInput {
  rows: [MyProjectPatchUsersRowInput!]!
}

input MyProjectPatchUsersRowInput {
  id: String!
  patches: [MyProjectPatchOperation!]!
}

input MyProjectDeleteUsersInput {
  rowIds: [String!]!
}

type MyProjectBulkMutationResult {
  success: Boolean!
  count: Int!
}
```

## Configuration

### GRAPHQL_HIDE_MUTATIONS

When `true`, all mutations are excluded from the generated schema. Default: `false`.

```bash
GRAPHQL_HIDE_MUTATIONS=true
```

### Interaction with other options

- `isDraft = false` (head revision): mutations are never generated regardless of `GRAPHQL_HIDE_MUTATIONS`
- `GRAPHQL_HIDE_NODE_TYPES = true`: singular mutations that return node types are **still generated** — they return the node type even when queries for that type are hidden. This is because mutations need a return type, and node type (with `id`, `versionId`, etc.) is the natural fit. The `hideNodeTypes` flag only affects query generation.

## Implementation

### Services

- `MutationsService` — orchestrates mutation field generation for each table
- `NamingService` — extended with methods for mutation-specific type names
- `ResolverService` — extended with resolvers that proxy to core API
- `SchemaToBuilderConverter` — extended to handle `Mutation` root type

### Resolver Behavior

All mutation resolvers:
1. Receive the request context (headers) for auth forwarding
2. Proxy the call to the core API via `ProxyCoreApiService`
3. Transform errors to `GraphQLError`
4. Return the appropriate result type

### Return Types

| Operation | Returns | Core API Response → GraphQL |
|-----------|---------|---------------------------|
| create (singular) | Node type | Row data → node fields |
| update (singular) | Node type | Row data → node fields |
| patch (singular) | Node type | Row data → node fields |
| delete (singular) | DeleteResult | `{ id, success: true }` |
| create (bulk) | BulkMutationResult | `{ success: true, count: rows.length }` |
| update (bulk) | BulkMutationResult | `{ success: true, count: rows.length }` |
| patch (bulk) | BulkMutationResult | `{ success: true, count: rows.length }` |
| delete (bulk) | BulkMutationResult | `{ success: true, count: rowIds.length }` |
