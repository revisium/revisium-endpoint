# GraphQL Examples

This document provides comprehensive examples of how to use the generated GraphQL API, including queries with filtering, sorting, pagination, and other advanced features.

**Note**: Currently, only queries are implemented. Mutation examples will be added when mutations are available.

## Table of Contents

- [Basic Queries](#basic-queries)
- [Pagination](#pagination)
- [Filtering](#filtering)
- [Sorting](#sorting)
- [Relationships](#relationships)
- [Flat vs Node Types](#flat-vs-node-types)

## Basic Queries

### Single Entity Query

To retrieve a single entity by ID:

```graphql
query GetUser($id: String!) {
  user(id: $id) {
    id
    data {
      name
      email
    }
    createdAt
    updatedAt
  }
}
```

Variables:

```json
{
  "id": "user-123"
}
```

### List Query

To retrieve a list of entities:

```graphql
query GetUsers {
  users {
    edges {
      node {
        id
        data {
          name
          email
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

### Flat Type Query

For simplified data access without metadata:

```graphql
query GetUserFlat($id: String!) {
  userFlat(id: $id) {
    name
    email
  }
}
```

## Pagination

The API implements Relay-style pagination with connections, edges, and cursors.

### Forward Pagination

```graphql
query GetUsersWithPagination {
  users(data: { first: 10, after: "cursor-string" }) {
    edges {
      node {
        id
        data {
          name
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

## Filtering

The API provides comprehensive filtering capabilities for all data types.

### String Filtering

```graphql
query GetUsersFiltered {
  users(data: { where: { data: { path: ["name"], equals: "John" } } }) {
    edges {
      node {
        id
        data {
          name
        }
      }
    }
    totalCount
  }
}
```

Other string filter options:

- `contains: "substring"`
- `startsWith: "prefix"`
- `endsWith: "suffix"`
- `not: "exclude"`
- `in: ["value1", "value2"]`
- `notIn: ["value1", "value2"]`

### Number Filtering

```graphql
query GetUsersByAge {
  users(data: { where: { data: { path: ["age"], gte: 18, lt: 65 } } }) {
    edges {
      node {
        id
        data {
          name
          age
        }
      }
    }
    totalCount
  }
}
```

Other number filter options:

- `equals: 42`
- `gt: 10`
- `gte: 10`
- `lt: 100`
- `lte: 100`
- `in: [1, 2, 3]`
- `notIn: [1, 2, 3]`

### Boolean Filtering

```graphql
query GetActiveUsers {
  users(data: { where: { data: { path: ["active"], equals: true } } }) {
    edges {
      node {
        id
        data {
          name
          active
        }
      }
    }
    totalCount
  }
}
```

### Date Filtering

```graphql
query GetRecentUsers {
  users(data: { where: { createdAt: { gte: "2023-01-01T00:00:00Z" } } }) {
    edges {
      node {
        id
        data {
          name
        }
        createdAt
      }
    }
    totalCount
  }
}
```

### Complex Filtering

Using AND, OR, and NOT operators:

```graphql
query GetComplexFilteredUsers {
  users(
    data: {
      where: {
        AND: [
          { data: { age: { gte: 18 } } }
          {
            OR: [
              { data: { name: { contains: "John" } } }
              { data: { email: { endsWith: "@example.com" } } }
            ]
          }
        ]
        NOT: { data: { suspended: { equals: true } } }
      }
    }
  ) {
    edges {
      node {
        id
        data {
          name
          email
          age
        }
      }
    }
    totalCount
  }
}
```

## Sorting

The API supports sorting by multiple fields in ascending or descending order.

### Single Field Sorting

```graphql
query GetUsersSorted {
  users(data: { orderBy: [{ field: createdAt, direction: desc }] }) {
    edges {
      node {
        id
        data {
          name
        }
        createdAt
      }
    }
    totalCount
  }
}
```

### Multiple Field Sorting

```graphql
query GetUsersMultiSorted {
  users(
    data: {
      orderBy: [
        { field: createdAt, direction: asc }
        { field: id, direction: asc }
      ]
    }
  ) {
    edges {
      node {
        id
        createdAt
        data {
          firstName
          lastName
        }
      }
    }
    totalCount
  }
}
```

## Relationships

The API automatically handles relationships between entities based on foreign key definitions in the JSON schemas.

### Foreign Key Resolution

If a table has a field that references another table:

```graphql
query GetUserWithPosts {
  user(id: "user-123") {
    id
    data {
      name
      # Assuming 'posts' is a foreign key to the posts table
      posts {
        edges {
          node {
            id
            data {
              title
              content
            }
          }
        }
      }
    }
  }
}
```

## Flat vs Node Types

The API generates two representations for each entity to suit different use cases:

### Node Types

Node types include all system metadata fields and are useful when you need access to the complete entity information:

```graphql
type ProjectUserNode {
  createdAt: DateTime!
  createdId: String!
  data: ProjectUser!
  id: String!
  json: JSON!
  publishedAt: DateTime!
  updatedAt: DateTime!
  versionId: String!
}
```

**System Fields in Node Types:**

- `id`: Unique identifier for the entity
- `createdAt`: Timestamp when the entity was created
- `createdId`: ID of the user who created the entity
- `updatedAt`: Timestamp when the entity was last updated
- `publishedAt`: Timestamp when the entity was published
- `versionId`: Version identifier for the entity
- `json`: Raw JSON representation of the entity data
- `data`: The actual entity data (your schema fields)

### Flat Types

Flat types contain only the core data fields from your JSON schema without any metadata. They provide a simplified view that's easier to work with when you don't need system information:

```graphql
type ProjectUserFlat {
  name: String!
  email: String!
  age: Int!
}
```

Use flat types when you don't need the metadata and want simpler queries.

### When to Use Each

- **Node Types**: Use when you need system metadata, are building admin interfaces, or need to track entity history
- **Flat Types**: Use for public APIs, mobile applications, or when you only need the core data

## Relationship Resolution

The system automatically resolves relationships based on foreign key definitions in your JSON schemas:

### One-to-One Relationships

```graphql
query GetUserWithProfile {
  user(id: "user-123") {
    id
    data {
      name
      # Automatically resolved relationship based on foreign key in schema
      profile {
        id
        data {
          bio
          avatarUrl
        }
      }
    }
  }
}
```

### One-to-Many Relationships

```graphql
query GetUserWithPosts {
  user(id: "user-123") {
    id
    data {
      name
      # Automatically resolved relationship with pagination
      posts {
        edges {
          node {
            id
            data {
              title
              content
            }
          }
          cursor
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
        totalCount
      }
    }
  }
}
```

## Ordering Limitations

Currently, ordering (sorting) only works with system fields:

```graphql
# ✅ Valid - sorting by system fields
query GetUsersSortedByCreation {
  users(data: {
    orderBy: [
      {
        field: createdAt
        direction: desc
      }
    ]
  }) {
    edges {
      node {
        id
        createdAt
        data {
          name
        }
      }
    }
    totalCount
  }
}

# ❌ Not supported - sorting by custom data fields
query GetUsersSortedByName {
  users(data: {
    orderBy: [
      {
        field: data.name  # This won't work currently
        direction: asc
      }
    ]
  }) {
    edges {
      node {
        id
        data {
          name
        }
      }
    }
    totalCount
  }
}
```

Sorting by custom fields from your data schema will be added in a future release.
