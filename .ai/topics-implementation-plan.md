# API Endpoint Implementation Plan: Topics Endpoints

## 1. Endpoint Overview

The Topics API endpoints provide CRUD operations for managing article topics in the PulseReader application. Topics are AI-generated categories used to classify articles, enabling users to filter and discover content by subject matter.

**Endpoints Covered:**

- `GET /api/topics` - List all topics with pagination and search
- `GET /api/topics/:id` - Retrieve a single topic by ID
- `POST /api/topics` - Create a new topic (service role only)
- `DELETE /api/topics/:id` - Delete a topic (service role only)

**Key Features:**

- Public read access (no authentication required for GET operations)
- Service role required for write operations (POST, DELETE)
- Case-insensitive topic name uniqueness enforced at database level
- Upsert behavior: POST returns existing topic if name already exists (case-insensitive)
- Cascade deletion: Deleting a topic automatically removes all article-topic associations

**Primary Use Cases:**

1. Frontend components displaying topic filters/selectors
2. AI analysis job creating new topics during article processing
3. Admin interfaces managing topic taxonomy
4. Article filtering by topic ID

**Response Time Target:** < 200ms p95 latency for typical queries

---

## 2. Request Details

### GET /api/topics

**HTTP Method:** `GET`

**URL Structure:**

```
GET /api/topics
```

**Query Parameters:**

| Parameter | Type    | Default | Validation                 | Description               |
| --------- | ------- | ------- | -------------------------- | ------------------------- |
| `limit`   | integer | 100     | Min: 1, Max: 500           | Number of topics per page |
| `offset`  | integer | 0       | Min: 0                     | Pagination offset         |
| `search`  | string  | -       | Optional, case-insensitive | Search topics by name     |

**Authentication:** Optional (public endpoint)

**Request Body:** None

**Example Requests:**

```http
GET /api/topics?limit=50&offset=0
```

```http
GET /api/topics?search=technology&limit=100
```

---

### GET /api/topics/:id

**HTTP Method:** `GET`

**URL Structure:**

```
GET /api/topics/:id
```

**Path Parameters:**

| Parameter | Type | Required | Validation        | Description |
| --------- | ---- | -------- | ----------------- | ----------- |
| `id`      | UUID | Yes      | Valid UUID format | Topic ID    |

**Authentication:** Optional (public endpoint)

**Request Body:** None

**Example Request:**

```http
GET /api/topics/550e8400-e29b-41d4-a716-446655440000
```

---

### POST /api/topics

**HTTP Method:** `POST`

**URL Structure:**

```
POST /api/topics
```

**Query Parameters:** None

**Authentication:** Required (service_role only)

**Request Body:**

```json
{
  "name": "climate change"
}
```

**Request Body Schema:**

- `name` (string, required): Topic name (case-insensitive uniqueness enforced)

**Example Request:**

```http
POST /api/topics
Authorization: Bearer <service_role_token>
Content-Type: application/json

{
  "name": "climate change"
}
```

**Special Behavior:**

- If a topic with the same name (case-insensitive) already exists, returns the existing topic with status 200 OK instead of creating a duplicate
- This enables idempotent topic creation for AI analysis jobs

---

### DELETE /api/topics/:id

**HTTP Method:** `DELETE`

**URL Structure:**

```
DELETE /api/topics/:id
```

**Path Parameters:**

| Parameter | Type | Required | Validation        | Description |
| --------- | ---- | -------- | ----------------- | ----------- |
| `id`      | UUID | Yes      | Valid UUID format | Topic ID    |

**Authentication:** Required (service_role only)

**Request Body:** None

**Example Request:**

```http
DELETE /api/topics/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <service_role_token>
```

**Cascade Behavior:**

- Deleting a topic automatically removes all associated records from `app.article_topics` table (CASCADE DELETE)
- No manual cleanup required

---

## 3. Used Types

The following types from `src/types.ts` are used in this implementation:

### Entity Types

```typescript
TopicEntity {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
```

### DTO Types

```typescript
TopicDto = TopicEntity

TopicListResponse {
  data: TopicDto[];
  pagination: PaginationMetadata;
}
```

### Command Models

```typescript
CreateTopicCommand {
  name: string;
}
```

### Query Parameter Types

```typescript
GetTopicsQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
}
```

### Response Types

```typescript
PaginationMetadata {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown> | ValidationErrorDetails[];
  timestamp?: string;
}
```

---

## 4. Response Details

### GET /api/topics

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "technology",
      "createdAt": "2025-11-10T00:00:00Z",
      "updatedAt": "2025-11-10T00:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "politics",
      "createdAt": "2025-11-10T00:00:00Z",
      "updatedAt": "2025-11-10T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 25,
    "hasMore": false
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid query parameters
- `500 Internal Server Error`: Database error or unexpected failure

---

### GET /api/topics/:id

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "technology",
  "createdAt": "2025-11-10T00:00:00Z",
  "updatedAt": "2025-11-10T00:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid UUID format
- `404 Not Found`: Topic does not exist
- `500 Internal Server Error`: Database error or unexpected failure

---

### POST /api/topics

**Success Response (201 Created):**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "climate change",
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

**Success Response (200 OK) - When topic already exists:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "climate change",
  "createdAt": "2025-11-10T00:00:00Z",
  "updatedAt": "2025-11-10T00:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Name is required or invalid
- `401 Unauthorized`: Not authenticated as service_role
- `500 Internal Server Error`: Database error or unexpected failure

---

### DELETE /api/topics/:id

**Success Response (204 No Content):**

Empty response body

**Error Responses:**

- `400 Bad Request`: Invalid UUID format
- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: Topic does not exist
- `500 Internal Server Error`: Database error or unexpected failure

---

## 5. Data Flow

### GET /api/topics

1. **Request Reception** (`src/pages/api/topics/index.ts`):
   - Astro API route handler receives GET request
   - Extracts query parameters from URL
   - Extracts Supabase client from context.locals

2. **Query Parameter Validation**:
   - Parse and validate query parameters using Zod schema
   - Apply defaults: `limit=100`, `offset=0`
   - Validate `limit` is between 1 and 500
   - Validate `offset` is non-negative
   - Return 400 if validation fails

3. **Database Query** (`TopicService.findAll()`):
   - Build Supabase query with pagination
   - Apply search filter if `search` parameter provided (case-insensitive ILIKE)
   - Execute query with `.schema("app")` to access custom schema
   - Count total records for pagination metadata

4. **Response Formation**:
   - Map database rows (snake_case) to DTOs (camelCase)
   - Calculate `hasMore` flag: `offset + limit < total`
   - Return 200 OK with paginated response

---

### GET /api/topics/:id

1. **Request Reception** (`src/pages/api/topics/[id].ts`):
   - Astro API route handler receives GET request
   - Extracts `id` from path parameters
   - Extracts Supabase client from context.locals

2. **Path Parameter Validation**:
   - Validate `id` is a valid UUID using Zod schema
   - Return 400 if validation fails

3. **Database Query** (`TopicService.findById()`):
   - Query topic by ID using `.schema("app")`
   - Return 404 if topic not found

4. **Response Formation**:
   - Map database row (snake_case) to DTO (camelCase)
   - Return 200 OK with topic data

---

### POST /api/topics

1. **Request Reception** (`src/pages/api/topics/index.ts`):
   - Astro API route handler receives POST request
   - Extracts Supabase client and user from context.locals

2. **Authentication & Authorization**:
   - Check if user exists → 401 if not authenticated
   - Check if `user.role === 'service_role'` → 401 if not service role

3. **Request Body Validation**:
   - Parse JSON request body
   - Validate using Zod schema (`CreateTopicCommandSchema`)
   - Validate `name` is required, non-empty string
   - Return 400 if validation fails

4. **Business Logic** (`TopicService.createOrFindTopic()`):
   - Check if topic with same name exists (case-insensitive query using `lower(name)`)
   - If exists: Return existing topic with 200 OK
   - If not exists: Insert new topic into database
   - Database generates: `id`, `createdAt`, `updatedAt`
   - Return created topic with 201 Created

5. **Response Formation**:
   - Map database row (snake_case) to DTO (camelCase)
   - Return appropriate status code (200 or 201) with topic data

---

### DELETE /api/topics/:id

1. **Request Reception** (`src/pages/api/topics/[id].ts`):
   - Astro API route handler receives DELETE request
   - Extracts `id` from path parameters
   - Extracts Supabase client and user from context.locals

2. **Authentication & Authorization**:
   - Check if user exists → 401 if not authenticated
   - Check if `user.role === 'service_role'` → 401 if not service role

3. **Path Parameter Validation**:
   - Validate `id` is a valid UUID using Zod schema
   - Return 400 if validation fails

4. **Business Logic** (`TopicService.deleteTopic()`):
   - Verify topic exists → 404 if not found
   - Delete topic from database using `.schema("app")`
   - Database CASCADE automatically removes `article_topics` associations
   - Return success

5. **Response Formation**:
   - Return 204 No Content (empty response body)

---

## 6. Security Considerations

### Authentication & Authorization

1. **Service Role Verification**:
   - POST and DELETE endpoints require service_role authentication
   - Route handler checks: `user.role === 'service_role'`
   - Return 401 if authentication fails or role is not service_role
   - Regular users and guests MUST NOT have access to write operations

2. **Token Validation**:
   - Middleware extracts token from Authorization header: `Bearer <token>`
   - Supabase client verifies token signature and expiration
   - Invalid/expired tokens → 401 Unauthorized

3. **Row-Level Security (RLS)**:
   - Service role bypasses RLS policies (has full access)
   - Public read access for GET endpoints (RLS policy: `USING (true)`)
   - Database enforces foreign key constraints and unique constraints

### Input Validation

1. **Query Parameter Validation**:
   - Validate UUID format for `id` parameter
   - Prevent SQL injection through parameterized queries
   - Return 400 for invalid UUID format
   - Validate pagination limits (max 500 for topics list)

2. **Request Body Validation**:
   - Use Zod schemas for all input validation
   - Validate data types, formats, and constraints
   - Sanitize string inputs (trim whitespace, validate lengths)
   - Validate topic name is non-empty and reasonable length

3. **Business Logic Validation**:
   - Case-insensitive uniqueness enforced at database level (unique index on `lower(name)`)
   - Database constraint prevents duplicate topics even if application logic fails

### Data Protection

1. **Error Message Sanitization**:
   - Never expose internal database errors to clients
   - Return generic error messages for 500 errors
   - Include detailed validation errors for 400 errors (helpful for debugging)

2. **Rate Limiting** (Future Consideration):
   - Service role endpoints should have rate limits to prevent abuse
   - Consider IP-based rate limiting for cron jobs

3. **SQL Injection Prevention**:
   - Use Supabase query builder (parameterized queries)
   - Never concatenate user input into SQL strings
   - All queries use `.schema("app")` to access custom schema safely

---

## 7. Error Handling

### Error Response Format

All error responses follow this structure:

```typescript
{
  error: string;           // Human-readable error message
  code?: string;           // Machine-readable error code (optional)
  details?: Record<string, unknown> | ValidationErrorDetails[];  // Additional error details
  timestamp?: string;      // ISO 8601 timestamp
}
```

### Error Scenarios by Endpoint

#### GET /api/topics

| Error Scenario            | Status Code | Error Code       | Response Message                          |
| ------------------------- | ----------- | ---------------- | ----------------------------------------- |
| Invalid `limit` value     | 400         | VALIDATION_ERROR | Limit must be integer between 1 and 500   |
| Invalid `offset` value    | 400         | VALIDATION_ERROR | Offset must be non-negative integer       |
| Database connection error | 500         | DATABASE_ERROR   | Database unavailable or connection failed |
| Unexpected error          | 500         | INTERNAL_ERROR   | Unhandled exception occurred              |

#### GET /api/topics/:id

| Error Scenario            | Status Code | Error Code       | Response Message                          |
| ------------------------- | ----------- | ---------------- | ----------------------------------------- |
| Invalid `id` UUID format  | 400         | VALIDATION_ERROR | Must be valid UUID format                 |
| Topic not found           | 404         | NOT_FOUND        | Topic does not exist                      |
| Database connection error | 500         | DATABASE_ERROR   | Database unavailable or connection failed |
| Unexpected error          | 500         | INTERNAL_ERROR   | Unhandled exception occurred              |

#### POST /api/topics

| Error Scenario               | Status Code | Error Code              | Response Message                          |
| ---------------------------- | ----------- | ----------------------- | ----------------------------------------- |
| Missing `name` field         | 400         | VALIDATION_ERROR        | Name is required                          |
| Invalid JSON in request body | 400         | INVALID_JSON            | Invalid JSON in request body              |
| Name too long                | 400         | VALIDATION_ERROR        | Name exceeds maximum length               |
| Not authenticated            | 401         | AUTHENTICATION_REQUIRED | Valid token required                      |
| Not service role             | 401         | FORBIDDEN               | Service role required for this endpoint   |
| Database connection error    | 500         | DATABASE_ERROR          | Database unavailable or connection failed |
| Unexpected error             | 500         | INTERNAL_ERROR          | Unhandled exception occurred              |

#### DELETE /api/topics/:id

| Error Scenario            | Status Code | Error Code              | Response Message                          |
| ------------------------- | ----------- | ----------------------- | ----------------------------------------- |
| Invalid `id` UUID format  | 400         | VALIDATION_ERROR        | Must be valid UUID format                 |
| Not authenticated         | 401         | AUTHENTICATION_REQUIRED | Valid token required                      |
| Not service role          | 401         | FORBIDDEN               | Service role required for this endpoint   |
| Topic not found           | 404         | NOT_FOUND               | Topic does not exist                      |
| Database connection error | 500         | DATABASE_ERROR          | Database unavailable or connection failed |
| Unexpected error          | 500         | INTERNAL_ERROR          | Unhandled exception occurred              |

### Error Handling Implementation

**1. Validation Errors (Zod):**

```typescript
try {
  const validatedParams = GetTopicsQueryParamsSchema.parse(queryParams);
} catch (error) {
  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

**2. Authentication Errors:**

```typescript
const user = context.locals.user;
if (!user || user.role !== "service_role") {
  return new Response(
    JSON.stringify({
      error: "Service role required for this endpoint",
      code: "FORBIDDEN",
      timestamp: new Date().toISOString(),
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**3. Not Found Errors:**

```typescript
const topic = await topicService.findById(id);
if (!topic) {
  return new Response(
    JSON.stringify({
      error: "Topic does not exist",
      code: "NOT_FOUND",
      timestamp: new Date().toISOString(),
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

**4. Database Errors:**

```typescript
try {
  const result = await topicService.createOrFindTopic(command);
} catch (error) {
  if (error instanceof DatabaseError) {
    logger.error("Database error creating topic", { error: error.message });
    return new Response(
      JSON.stringify({
        error: "Database error",
        code: "DATABASE_ERROR",
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  throw error;
}
```

---

## 8. Performance Considerations

### Database Optimization

1. **Indexes**:
   - Unique index on `lower(name)` ensures case-insensitive uniqueness and fast lookups
   - Primary key index on `id` for fast single-topic retrieval
   - Consider adding index on `created_at` if sorting by creation date becomes common

2. **Query Optimization**:
   - Use `limit` and `offset` for pagination to avoid loading all topics
   - Search queries use `ILIKE` with proper indexing for case-insensitive matching
   - Single-topic queries use indexed primary key lookup (O(1) complexity)

3. **Pagination**:
   - Default limit of 100 balances performance and usability
   - Maximum limit of 500 prevents excessive data transfer
   - `hasMore` flag enables efficient client-side pagination

### Caching Considerations (Future)

1. **Topic List Caching**:
   - Topics change infrequently (only when AI creates new ones)
   - Consider caching topic list for 5-10 minutes
   - Invalidate cache on POST/DELETE operations

2. **Single Topic Caching**:
   - Individual topics rarely change after creation
   - Consider caching individual topics with longer TTL (15-30 minutes)

### Scalability

1. **Search Performance**:
   - Current `ILIKE` search may become slow with large topic lists (>10,000 topics)
   - Consider full-text search (PostgreSQL `tsvector`) for better performance
   - Add search index if search becomes a primary use case

2. **Pagination Efficiency**:
   - Current offset-based pagination works well for small datasets
   - Consider cursor-based pagination for very large topic lists (>1000 pages)

---

## 9. Implementation Steps

### Step 1: Create Zod Validation Schemas

**File:** `src/lib/validation/topic.schemas.ts`

Create Zod schemas for:

- `GetTopicsQueryParamsSchema` - Query parameters for GET /api/topics
- `CreateTopicCommandSchema` - Request body for POST /api/topics
- `TopicIdParamSchema` - Path parameter for GET/DELETE /api/topics/:id

**Tasks:**

- Define schema for query parameters with defaults and constraints
- Define schema for create command with name validation
- Define UUID schema for path parameters
- Export schemas for use in route handlers

---

### Step 2: Create TopicService

**File:** `src/lib/services/topic.service.ts`

Create service class with methods:

- `findAll(params: GetTopicsQueryParams): Promise<PaginatedResponse<TopicEntity>>`
- `findById(id: string): Promise<TopicEntity | null>`
- `createOrFindTopic(command: CreateTopicCommand): Promise<{ topic: TopicEntity; created: boolean }>`
- `deleteTopic(id: string): Promise<void>`

**Tasks:**

- Implement pagination logic with limit/offset
- Implement case-insensitive search using `ILIKE`
- Implement case-insensitive topic lookup for upsert behavior
- Map database rows (snake_case) to entities (camelCase)
- Handle database errors appropriately
- Use `.schema("app")` for all queries

---

### Step 3: Create GET /api/topics Route Handler

**File:** `src/pages/api/topics/index.ts`

Implement GET handler:

- Extract query parameters from URL
- Validate query parameters using Zod schema
- Call `TopicService.findAll()`
- Format paginated response
- Handle errors appropriately

**Tasks:**

- Parse query parameters from `context.url.searchParams`
- Apply validation and defaults
- Call service method
- Map entities to DTOs
- Return 200 OK with paginated response
- Handle validation errors (400)
- Handle database errors (500)

---

### Step 4: Create GET /api/topics/:id Route Handler

**File:** `src/pages/api/topics/[id].ts`

Implement GET handler:

- Extract `id` from path parameters
- Validate UUID format
- Call `TopicService.findById()`
- Return topic or 404

**Tasks:**

- Extract `id` from `context.params.id`
- Validate UUID format using Zod
- Call service method
- Return 200 OK with topic DTO
- Return 404 if topic not found
- Handle validation errors (400)
- Handle database errors (500)

---

### Step 5: Create POST /api/topics Route Handler

**File:** `src/pages/api/topics/index.ts`

Implement POST handler:

- Check service role authentication
- Parse and validate request body
- Call `TopicService.createOrFindTopic()`
- Return 201 Created or 200 OK based on whether topic was created

**Tasks:**

- Check `user.role === 'service_role'` → 401 if not
- Parse JSON request body
- Validate using Zod schema
- Call service method
- Return 201 Created if new topic, 200 OK if existing
- Handle validation errors (400)
- Handle authentication errors (401)
- Handle database errors (500)

---

### Step 6: Create DELETE /api/topics/:id Route Handler

**File:** `src/pages/api/topics/[id].ts`

Implement DELETE handler:

- Check service role authentication
- Validate UUID format
- Call `TopicService.deleteTopic()`
- Return 204 No Content

**Tasks:**

- Check `user.role === 'service_role'` → 401 if not
- Extract and validate `id` from path parameters
- Call service method
- Return 404 if topic not found
- Return 204 No Content on success
- Handle validation errors (400)
- Handle authentication errors (401)
- Handle database errors (500)

---

### Step 7: Update Middleware (if needed)

**File:** `src/middleware/index.ts`

Ensure topics endpoints are handled correctly:

- GET endpoints should be publicly accessible
- POST/DELETE endpoints should require authentication (handled in route handlers)

**Tasks:**

- Verify middleware doesn't block public GET requests
- Ensure API routes can handle their own authentication logic
- Test that service role tokens are properly recognized

---

### Step 8: Add Error Logging

**File:** Route handlers and service

Implement comprehensive error logging:

- Log validation errors with context
- Log authentication failures
- Log database errors with details
- Log unexpected errors with stack traces

**Tasks:**

- Use consistent logging format across all handlers
- Include endpoint, user ID, and error details in logs
- Avoid logging sensitive information (tokens, passwords)

---

### Step 9: Testing

#### Unit Tests:

**File:** `src/lib/services/__tests__/topic.service.test.ts`

Test TopicService methods:

- `findAll()` with various query parameters
- `findById()` with valid and invalid IDs
- `createOrFindTopic()` creating new topics
- `createOrFindTopic()` returning existing topics (case-insensitive)
- `deleteTopic()` with valid and invalid IDs
- Error handling for database failures

#### Integration Tests:

**File:** `src/pages/api/topics/__tests__/topics.test.ts`

Test API endpoints:

- GET /api/topics with pagination
- GET /api/topics with search
- GET /api/topics/:id with valid ID
- GET /api/topics/:id with invalid ID
- POST /api/topics creating new topic
- POST /api/topics returning existing topic
- POST /api/topics without service role → 401
- DELETE /api/topics/:id with valid ID
- DELETE /api/topics/:id without service role → 401
- Error handling for all scenarios

#### E2E Tests:

**File:** `tests/e2e/topics.spec.ts`

Test end-to-end flows:

- Guest user browsing topics list
- Service role creating topics
- Service role deleting topics
- Topic deletion cascading to article associations

---

### Step 10: Documentation

**File:** `docs/api/topics.md`

Create API documentation:

- Endpoint descriptions
- Request/response examples
- Error scenarios
- Authentication requirements

**Tasks:**

- Document all endpoints with examples
- Include curl commands for testing
- Document error codes and meanings
- Add authentication examples

---

## 10. Database Schema Reference

### app.topics Table

| Column       | Type        | Constraints                            | Description             |
| ------------ | ----------- | -------------------------------------- | ----------------------- |
| `id`         | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique topic identifier |
| `name`       | TEXT        | NOT NULL                               | Topic name              |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | Creation timestamp      |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | Last update timestamp   |

### Indexes

- Primary key index on `id`
- Unique index on `lower(name)` for case-insensitive uniqueness

### Foreign Key Relationships

- `app.article_topics.topic_id` → `app.topics.id` (ON DELETE CASCADE)
  - Deleting a topic automatically removes all article-topic associations

---

## 11. Implementation Notes

### Case-Insensitive Uniqueness

The database enforces case-insensitive uniqueness through a unique index on `lower(name)`. This means:

- "Technology" and "technology" are considered the same topic
- Attempting to insert a duplicate (case-insensitive) will fail at the database level
- The application should check for existing topics before inserting to provide better error messages

### Upsert Behavior

The POST endpoint implements an "upsert" pattern:

- If topic exists (case-insensitive match): Return existing topic with 200 OK
- If topic doesn't exist: Create new topic and return with 201 Created

This enables idempotent topic creation for AI analysis jobs that may attempt to create the same topic multiple times.

### Cascade Deletion

When deleting a topic:

- The topic record is removed from `app.topics`
- Database CASCADE automatically removes all associated records from `app.article_topics`
- No manual cleanup of associations is required
- Articles themselves are not affected (only the topic associations)

### Pagination Strategy

The GET /api/topics endpoint uses offset-based pagination:

- Simple to implement and understand
- Works well for small to medium datasets (<10,000 topics)
- `hasMore` flag enables efficient client-side pagination
- Consider cursor-based pagination if topic list grows very large

---

## 12. Future Enhancements

1. **Full-Text Search**: Replace `ILIKE` with PostgreSQL full-text search for better performance
2. **Topic Hierarchies**: Support parent-child relationships between topics
3. **Topic Metadata**: Add description, icon, or other metadata fields
4. **Topic Statistics**: Include article count per topic in list responses
5. **Bulk Operations**: Support creating/deleting multiple topics in one request
6. **Topic Aliases**: Support alternative names for the same topic
7. **Topic Merging**: Allow merging two topics into one
