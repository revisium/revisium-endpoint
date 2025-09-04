# GraphQL Module Technical Documentation

This document provides technical details about the GraphQL module implementation, core concepts, and internal architecture.

**Note**: This documentation primarily covers the query generation functionality, as mutations are currently under development.

**Current Limitations:**
- Only queries are implemented (mutations under development)
- Ordering only works with system fields (createdAt, id, etc.)
- Custom field sorting will be added in a future release

## Table of Contents

- [Core Concepts](#core-concepts)
- [Conversion Process](#conversion-process)
- [Internal Architecture](#internal-architecture)
- [Data Flow](#data-flow)
- [Caching Mechanisms](#caching-mechanisms)
- [Error Handling](#error-handling)

## Core Concepts

### JSON Schema to GraphQL Conversion

The core functionality of the module is converting JSON schemas (representing database tables) to GraphQL schemas. This process involves:

1. **Schema Analysis**: Parsing and understanding the structure of JSON schemas
2. **Type Mapping**: Converting JSON schema types to appropriate GraphQL types
3. **Relationship Resolution**: Identifying and implementing foreign key relationships
4. **Query Generation**: Creating GraphQL queries for data access
5. **Schema Building**: Using Pothos to build the final GraphQL schema

### Type Generation Patterns

The system generates multiple representations for each table:

1. **Base Types**: Represent the core data structure
2. **Node Types**: Extend base types with system metadata (implements Apollo Federation entity interface)
3. **Flat Types**: Simplified versions without metadata
4. **Connection Types**: Implement pagination using Relay connections
5. **Input Types**: For filtering, sorting, and querying

### Naming Strategy

The module uses a centralized naming service to ensure consistent naming across all generated types:

```typescript
// Example naming patterns
const userEntity = "ProjectUser";           // Base entity
const userNode = "ProjectUserNode";         // Node type
const userFlat = "ProjectUserFlat";         // Flat type
const userConnection = "ProjectUserConnection"; // Connection type
```

## Conversion Process

### 1. Schema Retrieval

The process begins by retrieving JSON schemas from the core microservice:

```typescript
const tables = await this.getSchemas(data.revisionId);
```

Each table contains:
- `id`: Table identifier
- `versionId`: Schema version
- `schema`: JSON schema representing the table structure

### 2. Context Creation

A conversion context is created with all necessary information:

```typescript
const context: GraphQLSchemaConverterContext = {
  ...baseContext,
  tables: tables.map(table => ({
    ...table,
    store: createJsonSchemaStore(table.schema, pluginRefs)
  })),
  schema: new Schema(),
  nodes: {}
};
```

### 3. Schema Processing

The converter processes each table:

```typescript
private createSchema() {
  const validTables = createValidTables(this.context.tables);
  this.commonSchemaService.createCommon();
  this.createValidTables(validTables);
  this.context.schema.resolveAllThunks();
  this.createQueries(validTables);
}
```

### 4. Type Generation

For each valid table, the system generates:

1. **Node Types** (if not hidden):
   ```typescript
   this.getNodeType(option);  // Creates full entity with metadata
   ```

2. **Flat Types** (if not hidden):
   ```typescript
   this.getFlatType(option, '');  // Creates simplified version
   ```

### 5. Query Generation

Queries are generated for each table type:

```typescript
private createQueries(validTables: Record<string, ValidTableType>) {
  Object.values(validTables).forEach((validTable) => {
    // Node queries
    this.queriesService.createItemField(singularKey, validTable.options);
    this.queriesService.createListField(pluralKey, validTable.options);
    
    // Flat queries
    this.queriesService.createItemFlatField(flatSingularKey, validTable.options);
    this.queriesService.createListFlatField(flatPluralKey, validTable.options);
  });
}
```

### 6. Schema Building

The final schema is built using Pothos:

```typescript
const schemaToBuilderConverter = new SchemaToBuilderConverter(
  graphQLSchemaConverterContext.schema
);

schemaToBuilderConverter.convert();

const schema = schemaToBuilderConverter.builder.toSubGraphSchema({
  linkUrl: 'https://specs.apollo.dev/federation/v2.3',
  federationDirectives: ['@key']
});
```

## Internal Architecture

### Main Components

#### GraphQLSchemaConverter

The main entry point for schema conversion:

```typescript
@Injectable()
export class GraphQLSchemaConverter implements Converter<GraphQLSchema> {
  async convert(context: ConverterContextType): Promise<GraphQLSchema>
}
```

Key responsibilities:
- Orchestrating the conversion process
- Managing conversion context
- Coordinating between services

#### ModelService

Handles the core logic for processing schema fields:

```typescript
@Injectable()
export class ModelService {
  public create(options: CreatingTableOptionsType[])
  public getNodeType(options: CreatingTableOptionsType)
  public getFlatType(options: CreatingTableOptionsType, parentType: string)
  public processSchemaField(context: SchemaProcessingContext)
}
```

#### SchemaToBuilderConverter

Converts internal schema representation to Pothos schema:

```typescript
export class SchemaToBuilderConverter {
  public readonly builder = new SchemaBuilder()
  public convert()
  private addRefs()
}
```

### Strategy Pattern Implementation

The module uses a strategy pattern to handle different JSON schema types:

```typescript
export interface SchemaTypeHandler {
  canHandle(schema: JsonSchemaStore): boolean;
  handle(context: SchemaProcessingContext): FieldResult;
}

// Handlers
ObjectTypeHandler    // For object schemas
ArrayTypeHandler     // For array schemas
StringTypeHandler    // For string schemas
NumberTypeHandler    // For number schemas
BooleanTypeHandler   // For boolean schemas
ForeignKeyHandler    // For foreign key relationships
```

### Context Management

The system uses AsyncLocalStorage for context management:

```typescript
@Injectable()
export class ContextService {
  public get context(): GraphQLSchemaConverterContext
  public get schema()
  public get hideNodeTypes()
  public get hideFlatTypes()
  // ... other context accessors
}
```

## Data Flow

### 1. Endpoint Request

```
Client → GraphQL Endpoint Controller → GraphqlEndpointService
```

### 2. Schema Generation

```
GraphqlEndpointService 
  → GetGraphqlSchemaHandler 
    → GraphQLSchemaConverter 
      → ModelService 
        → Schema Type Handlers
          → SchemaToBuilderConverter
            → Pothos Schema Builder
```

### 3. Query Execution

```
Client Query 
  → Apollo Server 
    → Generated Schema Resolvers 
      → Core Microservice API
        → Database
```

### 4. Response Flow

```
Database Response
  → Core Microservice API
    → GraphQL Resolvers
      → Apollo Server
        → Client
```

## Caching Mechanisms

### Schema Caching

Generated schemas are cached to avoid regeneration:

```typescript
private readonly endpointMap = new Map<string, {
  middleware: RequestHandler;
  apollo: ApolloServer;
  endpointId: string;
  table: string;
}>();
```

### Row Caching

The `GraphqlCachedRowsInterceptor` caches frequently accessed data:

```typescript
@UseInterceptors(GraphqlCachedRowsInterceptor)
@Controller('endpoint/graphql/:organizationId/:projectName/:branchName/:postfix')
```

### Context Caching

Conversion context is managed through AsyncLocalStorage for efficient access:

```typescript
private readonly asyncLocalStorage: AsyncLocalStorage<GraphQLSchemaConverterContext>
```

## Error Handling

### Conversion Errors

Errors during schema conversion are handled with detailed messages:

```typescript
if (!handler) {
  throw new InternalServerErrorException(
    `endpointId: ${this.contextService.context.endpointId}, unknown schema: ${JSON.stringify(context.schema)}`
  );
}
```

### Runtime Errors

Apollo Server is configured to handle GraphQL errors gracefully:

```typescript
const apollo = new ApolloServer({
  schema,
  introspection: true,
  formatError: (error) => {
    if (error.extensions?.stacktrace) {
      error.extensions.stacktrace = [];
    }
    return error;
  }
});
```

### Validation

Input validation is performed at multiple levels:

1. **Configuration Validation**: Environment variables are validated at startup
2. **Schema Validation**: JSON schemas are validated before processing
3. **GraphQL Validation**: Generated schemas are validated by GraphQL

### Error Propagation

Errors from the core microservice are properly propagated:

```typescript
const { data, error } = await this.internalCoreApi.api.rows(
  revisionId,
  SystemTables.Schema,
  { first: HARDCODED_LIMIT_FOR_TABLES }
);

if (error) {
  throw new HttpException(error, error.statusCode);
}
```

## Testing

### Unit Tests

Each component has comprehensive unit tests:

```typescript
// graphql-schema.converter.spec.ts
describe('GraphQL Schema Converter', () => {
  it('empty schema', async () => { /* ... */ });
  it('simple schema', async () => { /* ... */ });
  it('complex schema', async () => { /* ... */ });
});
```

### Integration Tests

Integration tests verify the complete conversion process:

```typescript
// Test with various schema configurations
it('complex schema', async () => {
  const schema = await converter.convert(
    getContext({
      tables: [...getComplexSchema()]
    })
  );
  await check(schema, 'complex.graphql.text');
});
```

### Schema Validation Tests

Generated schemas are validated against expected outputs:

```typescript
// Compare generated schema with reference
await check(schema, 'complex.graphql.text');
```

## Performance Considerations

### Memory Management

The system uses efficient data structures and cleanup mechanisms:

```typescript
async onApplicationShutdown() {
  await this.graphqlEndpointService.shutdown();
}
```

### Lazy Loading

Schema generation and type resolution use lazy loading where appropriate:

```typescript
fieldThunk?: () => TypeModelField
```

### Connection Pooling

Efficient connection management with the core microservice:

```typescript
private readonly internalCoreApi: InternalCoreApiService
```

## Extensibility Points

### Custom Type Handlers

Easily extend to support new JSON schema types:

```typescript
export class CustomTypeHandler extends BaseSchemaTypeHandler {
  public canHandle(schema: JsonSchemaStore): boolean
  public handle(context: SchemaProcessingContext): FieldResult
}
```

### Naming Customization

Flexible naming through the NamingService:

```typescript
export class NamingService {
  public getTypeName(processedTableName: string, variant: GraphQLTypeVariant = 'base'): string
}
```

### Configuration Extension

Add new configuration options through GraphQLOptionsService:

```typescript
private validateAndLoadOptions(): void {
  // Add new environment variable handling
  if (process.env.CUSTOM_OPTION !== undefined) {
    // ...
  }
}
```