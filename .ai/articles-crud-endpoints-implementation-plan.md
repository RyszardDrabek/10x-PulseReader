# API Endpoint Implementation Plan: Articles CRUD Operations

## 1. Endpoint Overview

This plan covers the implementation of four REST API endpoints for managing articles in the PulseReader system:

- **GET /api/articles/:id**: Retrieves a single article by ID (public access)
- **POST /api/articles**: Creates a new article (service role only, used by RSS fetching cron job)
- **PATCH /api/articles/:id**: Updates an article (service role only, used by AI analysis job)
- **DELETE /api/articles/:id**: Deletes an article (service role only, used by retention policy cron job)

These endpoints provide complete CRUD operations for articles, with different authorization levels based on the operation type. The endpoints integrate with Supabase for database operations and follow Astro API route patterns.

## 2. Request Details

### GET /api/articles/:id

- **HTTP Method:** GET
- **URL Structure:** `/api/articles/:id`
- **Parameters:**
  - **Required:** `id` (UUID, path parameter) - Article ID
- **Request Body:** None
- **Authentication:** Optional (public access)

### POST /api/articles

- **HTTP Method:** POST
- **URL Structure:** `/api/articles`
- **Parameters:** None
- **Request Body:**
```json
{
  "sourceId": "uuid",
  "title": "Article title",
  "description": "Article description",
  "link": "https://source.com/article",
  "publicationDate": "2025-11-15T10:30:00Z",
  "sentiment": "positive",
  "topicIds": ["uuid1", "uuid2"]
}
```
- **Authentication:** Required (service_role)

### PATCH /api/articles/:id

- **HTTP Method:** PATCH
- **URL Structure:** `/api/articles/:id`
- **Parameters:**
  - **Required:** `id` (UUID, path parameter) - Article ID
- **Request Body:**
```json
{
  "sentiment": "neutral",
  "topicIds": ["uuid1", "uuid2"]
}
```
- **Authentication:** Required (service_role)

### DELETE /api/articles/:id

- **HTTP Method:** DELETE
- **URL Structure:** `/api/articles/:id`
- **Parameters:**
  - **Required:** `id` (UUID, path parameter) - Article ID
- **Request Body:** None
- **Authentication:** Required (service_role)

## 3. Used Types

### DTOs (Data Transfer Objects)

From `src/types.ts`:

- **ArticleDto**: Response DTO for GET endpoints
  ```typescript
  {
    id: string;
    title: string;
    description: string | null;
    link: string;
    publicationDate: string;
    sentiment: ArticleSentiment | null;
    source: ArticleSourceDto;
    topics: ArticleTopicDto[];
    createdAt: string;
    updatedAt?: string;
  }
  ```

- **ArticleSourceDto**: Nested source information
  ```typescript
  {
    id: string;
    name: string;
    url: string;
  }
  ```

- **ArticleTopicDto**: Nested topic information
  ```typescript
  {
    id: string;
    name: string;
  }
  ```

### Command Models

- **CreateArticleCommand**: For POST /api/articles
  ```typescript
  {
    sourceId: string;
    title: string;
    description?: string | null;
    link: string;
    publicationDate: string;
    sentiment?: ArticleSentiment | null;
    topicIds?: string[];
  }
  ```

- **UpdateArticleCommand**: For PATCH /api/articles/:id
  ```typescript
  {
    sentiment?: ArticleSentiment | null;
    topicIds?: string[];
  }
  ```

### Entity Types

- **ArticleEntity**: Database entity representation
- **ArticleInsert**: For database insert operations
- **ArticleUpdate**: For database update operations

### Validation Schemas

- **CreateArticleCommandSchema**: Zod schema for POST validation
- **UpdateArticleCommandSchema**: Zod schema for PATCH validation (to be created)
- **UuidParamSchema**: Zod schema for path parameter validation (to be created)

## 4. Response Details

### GET /api/articles/:id

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "title": "Article title",
  "description": "Article description or excerpt",
  "link": "https://source.com/article",
  "publicationDate": "2025-11-15T10:30:00Z",
  "sentiment": "positive",
  "source": {
    "id": "uuid",
    "name": "BBC News - World",
    "url": "http://feeds.bbci.co.uk/news/world/rss.xml"
  },
  "topics": [
    {
      "id": "uuid",
      "name": "technology"
    }
  ],
  "createdAt": "2025-11-15T10:35:00Z",
  "updatedAt": "2025-11-15T10:35:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Article does not exist
  ```json
  {
    "error": "Article not found",
    "code": "NOT_FOUND",
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```

### POST /api/articles

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "sourceId": "uuid",
  "title": "Article title",
  "description": "Article description",
  "link": "https://source.com/article",
  "publicationDate": "2025-11-15T10:30:00Z",
  "sentiment": "positive",
  "createdAt": "2025-11-15T10:35:00Z",
  "updatedAt": "2025-11-15T10:35:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      },
      {
        "field": "link",
        "message": "Link must be a valid URL"
      }
    ],
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- `401 Unauthorized`: Not authenticated as service_role
- `409 Conflict`: Article with this link already exists
  ```json
  {
    "error": "Article with this link already exists",
    "code": "CONFLICT",
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```

### PATCH /api/articles/:id

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "sentiment": "neutral",
  "updatedAt": "2025-11-15T11:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid sentiment value
  ```json
  {
    "error": "Validation failed",
    "details": [
      {
        "field": "sentiment",
        "message": "Sentiment must be one of: positive, neutral, negative"
      }
    ],
    "timestamp": "2025-11-15T11:00:00Z"
  }
  ```
- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: Article does not exist

### DELETE /api/articles/:id

**Success Response (204 No Content):** Empty response body

**Error Responses:**
- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: Article does not exist

## 5. Data Flow

### GET /api/articles/:id

1. **Request Reception** (`src/pages/api/articles/[id].ts`):
   - Astro API route handler receives GET request
   - Extracts `id` from path parameters
   - Extracts Supabase client from `context.locals.supabase`

2. **Path Parameter Validation**:
   - Validate `id` is a valid UUID using Zod schema
   - Return 400 if validation fails

3. **Database Query** (`ArticleService.getArticleById()`):
   - Query `app.articles` table with JOIN to `app.rss_sources`
   - JOIN to `app.article_topics` and `app.topics` for topic associations
   - Filter by article `id`
   - Return single article with nested source and topics

4. **Response Mapping**:
   - Convert database snake_case to camelCase DTO format
   - Map source and topics to nested DTOs
   - Return 200 OK with ArticleDto

5. **Error Handling**:
   - If article not found → 404 Not Found
   - If database error → 500 Internal Server Error

### POST /api/articles

1. **Request Reception** (`src/pages/api/articles/index.ts`):
   - Astro API route handler receives POST request
   - Extracts Supabase client and user from context.locals

2. **Authentication & Authorization**:
   - Check if user exists → 401 if not authenticated
   - Check if user.role === 'service_role' → 401 if not service role

3. **Request Body Parsing**:
   - Parse JSON body from request
   - Handle JSON parse errors → 400 Bad Request

4. **Input Validation** (Zod schema):
   - Validate against `CreateArticleCommandSchema`
   - Check required fields: sourceId, title, link, publicationDate
   - Validate types: UUIDs, URL format, datetime format
   - Validate constraints: string lengths, sentiment enum values
   - Return 400 with detailed errors if validation fails

5. **Business Logic** (`ArticleService.createArticle()`):
   - Verify RSS source exists → 400 if not found
   - Verify topics exist (if topicIds provided) → 400 if invalid
   - Insert article into database
   - Handle unique constraint violation (duplicate link) → 409 Conflict
   - Create topic associations (if provided)
   - Rollback article if associations fail

6. **Response Formation**:
   - Map database entity to ArticleEntity format
   - Return 201 Created with created article

### PATCH /api/articles/:id

1. **Request Reception** (`src/pages/api/articles/[id].ts`):
   - Astro API route handler receives PATCH request
   - Extracts `id` from path parameters
   - Extracts Supabase client and user from context.locals

2. **Authentication & Authorization**:
   - Check if user exists → 401 if not authenticated
   - Check if user.role === 'service_role' → 401 if not service role

3. **Path Parameter Validation**:
   - Validate `id` is a valid UUID using Zod schema
   - Return 400 if validation fails

4. **Request Body Parsing**:
   - Parse JSON body from request
   - Handle JSON parse errors → 400 Bad Request

5. **Input Validation** (Zod schema):
   - Validate against `UpdateArticleCommandSchema`
   - Validate sentiment enum if provided
   - Validate topicIds array if provided
   - Return 400 with detailed errors if validation fails

6. **Business Logic** (`ArticleService.updateArticle()`):
   - Verify article exists → 404 if not found
   - Verify topics exist (if topicIds provided) → 400 if invalid
   - Update article fields in database
   - Update topic associations (replace existing associations)
   - Return updated article with updatedAt timestamp

7. **Response Formation**:
   - Map database entity to response format
   - Return 200 OK with updated article fields

### DELETE /api/articles/:id

1. **Request Reception** (`src/pages/api/articles/[id].ts`):
   - Astro API route handler receives DELETE request
   - Extracts `id` from path parameters
   - Extracts Supabase client and user from context.locals

2. **Authentication & Authorization**:
   - Check if user exists → 401 if not authenticated
   - Check if user.role === 'service_role' → 401 if not service role

3. **Path Parameter Validation**:
   - Validate `id` is a valid UUID using Zod schema
   - Return 400 if validation fails

4. **Business Logic** (`ArticleService.deleteArticle()`):
   - Verify article exists → 404 if not found
   - Delete article from database (CASCADE removes article_topics associations)
   - Return success

5. **Response Formation**:
   - Return 204 No Content (empty response body)

## 6. Security Considerations

### Authentication & Authorization

1. **Service Role Verification**:
   - POST, PATCH, DELETE endpoints require service_role authentication
   - Middleware validates JWT token and extracts role claim
   - Route handler checks: `user.role === 'service_role'`
   - Return 401 if authentication fails or role is not service_role
   - Regular users and guests MUST NOT have access to write operations

2. **Token Validation**:
   - Middleware extracts token from Authorization header: `Bearer <token>`
   - Supabase client verifies token signature and expiration
   - Invalid/expired tokens → 401 Unauthorized

3. **Row-Level Security (RLS)**:
   - Service role bypasses RLS policies (has full access)
   - Public read access for GET /api/articles/:id (no RLS restrictions)
   - Database enforces foreign key constraints and unique constraints

### Input Validation

1. **Path Parameter Validation**:
   - Validate UUID format for `id` parameter
   - Prevent SQL injection through parameterized queries
   - Return 400 for invalid UUID format

2. **Request Body Validation**:
   - Use Zod schemas for all input validation
   - Validate data types, formats, and constraints
   - Sanitize string inputs (trim whitespace, validate lengths)
   - Validate URL format for `link` field
   - Validate ISO 8601 datetime format for `publicationDate`
   - Validate enum values for `sentiment`

3. **Business Logic Validation**:
   - Verify referenced entities exist (sourceId, topicIds)
   - Check for duplicate articles (unique constraint on `link`)
   - Validate topic associations before creating/updating

### Data Protection

1. **Error Message Sanitization**:
   - Never expose internal database errors to clients
   - Return generic error messages for 500 errors
   - Include detailed validation errors for 400 errors (helpful for debugging)

2. **Rate Limiting** (Future Consideration):
   - Service role endpoints should have rate limits to prevent abuse
   - Consider IP-based rate limiting for cron jobs

## 7. Error Handling

### Error Response Format

All error responses follow this structure:

```typescript
interface ErrorResponse {
  error: string;           // Human-readable error message
  code?: string;           // Machine-readable error code
  details?: Array<{       // Validation error details (for 400)
    field: string;
    message: string;
  }> | Record<string, unknown>;
  timestamp: string;       // ISO 8601 timestamp
}
```

### Error Scenarios by Endpoint

#### GET /api/articles/:id

1. **400 Bad Request - Invalid UUID**:
   - **Cause:** Path parameter `id` is not a valid UUID format
   - **Detection:** Zod validation fails
   - **Response:** 400 with validation error details
   - **Logging:** Log as warning

2. **404 Not Found**:
   - **Cause:** Article with provided ID does not exist
   - **Detection:** Database query returns no results
   - **Response:** 404 with "Article not found" message
   - **Logging:** Log as info (expected behavior)

3. **500 Internal Server Error**:
   - **Cause:** Database connection error or unexpected error
   - **Detection:** Catch-all error handler
   - **Response:** Generic 500 error (don't expose internal details)
   - **Logging:** Log as critical error with full stack trace

#### POST /api/articles

1. **400 Bad Request - Validation Error**:
   - **Cause:** Request body fails Zod validation
   - **Detection:** ZodError thrown during validation
   - **Response:** 400 with detailed validation errors
   - **Logging:** Log as warning with validation errors

2. **400 Bad Request - Invalid Source/Topics**:
   - **Cause:** sourceId or topicIds reference non-existent entities
   - **Detection:** Service validation methods return false
   - **Response:** 400 with specific error message
   - **Logging:** Log as warning

3. **401 Unauthorized**:
   - **Cause:** Not authenticated or not service_role
   - **Detection:** User check or role check fails
   - **Response:** 401 with authentication error
   - **Logging:** Log as warning

4. **409 Conflict**:
   - **Cause:** Article with same `link` already exists
   - **Detection:** Database unique constraint violation (code 23505)
   - **Response:** 409 with conflict message
   - **Logging:** Log as info (expected behavior in RSS fetching)

5. **500 Internal Server Error**:
   - **Cause:** Database error, transaction rollback failure
   - **Detection:** Catch-all error handler
   - **Response:** Generic 500 error
   - **Logging:** Log as critical error with full stack trace

#### PATCH /api/articles/:id

1. **400 Bad Request - Invalid UUID**:
   - **Cause:** Path parameter `id` is not a valid UUID
   - **Detection:** Zod validation fails
   - **Response:** 400 with validation error

2. **400 Bad Request - Invalid Sentiment/Topics**:
   - **Cause:** Invalid sentiment enum value or non-existent topicIds
   - **Detection:** Zod validation or service validation fails
   - **Response:** 400 with detailed errors

3. **401 Unauthorized**:
   - **Cause:** Not authenticated or not service_role
   - **Detection:** User check or role check fails
   - **Response:** 401 with authentication error

4. **404 Not Found**:
   - **Cause:** Article with provided ID does not exist
   - **Detection:** Database query returns no results
   - **Response:** 404 with "Article not found" message

5. **500 Internal Server Error**:
   - **Cause:** Database error or unexpected error
   - **Detection:** Catch-all error handler
   - **Response:** Generic 500 error
   - **Logging:** Log as critical error

#### DELETE /api/articles/:id

1. **400 Bad Request - Invalid UUID**:
   - **Cause:** Path parameter `id` is not a valid UUID
   - **Detection:** Zod validation fails
   - **Response:** 400 with validation error

2. **401 Unauthorized**:
   - **Cause:** Not authenticated or not service_role
   - **Detection:** User check or role check fails
   - **Response:** 401 with authentication error

3. **404 Not Found**:
   - **Cause:** Article with provided ID does not exist
   - **Detection:** Database query returns no results before deletion
   - **Response:** 404 with "Article not found" message

4. **500 Internal Server Error**:
   - **Cause:** Database error or unexpected error
   - **Detection:** Catch-all error handler
   - **Response:** Generic 500 error
   - **Logging:** Log as critical error

### Error Handling Implementation Pattern

```typescript
try {
  // Main logic
} catch (error) {
  // Handle specific error types
  if (error instanceof ZodError) {
    // Validation errors
    return new Response(JSON.stringify({
      error: "Validation failed",
      details: error.errors.map(e => ({
        field: e.path.join("."),
        message: e.message
      })),
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Handle business logic errors
  if (error instanceof Error) {
    if (error.message === "ARTICLE_NOT_FOUND") {
      return new Response(JSON.stringify({
        error: "Article not found",
        code: "NOT_FOUND",
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // Generic error handling
  logger.error("Unexpected error", error, { endpoint: "..." });
  return new Response(JSON.stringify({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString()
  }), {
    status: 500,
    headers: { "Content-Type": "application/json" }
  });
}
```

## 8. Performance Considerations

### Database Query Optimization

1. **GET /api/articles/:id**:
   - Use single query with JOINs to fetch article, source, and topics
   - Ensure database indexes exist on:
     - `app.articles.id` (primary key, automatically indexed)
     - `app.articles.source_id` (foreign key, should be indexed)
     - `app.article_topics.article_id` (foreign key, should be indexed)
     - `app.article_topics.topic_id` (foreign key, should be indexed)

2. **POST /api/articles**:
   - Validate source and topics in parallel (Promise.all) for better performance
   - Use batch insert for topic associations (single INSERT with multiple rows)
   - Consider using database transactions for atomicity

3. **PATCH /api/articles/:id**:
   - Fetch article existence check can be combined with update query
   - For topic associations update:
     - Option 1: Delete all existing associations, then insert new ones
     - Option 2: Compare existing vs new, only update differences (more complex but more efficient)
   - Use batch operations for topic associations

4. **DELETE /api/articles/:id**:
   - Database CASCADE handles article_topics deletion automatically
   - Single DELETE query is sufficient

### Caching Considerations

- **Future Enhancement:** Consider caching article responses for frequently accessed articles
- **Cache Invalidation:** Invalidate cache on PATCH/DELETE operations
- **Cache Key:** Use article ID as cache key

### Response Size Optimization

- **GET /api/articles/:id**: Response includes nested objects (source, topics)
- Consider pagination for topics if articles have many topics (future enhancement)
- Current implementation is acceptable for MVP

## 9. Implementation Steps

### Step 1: Create Validation Schemas

**File:** `src/lib/validation/article.schema.ts`

1. **Add UpdateArticleCommandSchema**:
   - Validate `sentiment` (optional, enum: positive/neutral/negative, nullable)
   - Validate `topicIds` (optional, array of UUIDs, max 20 items)
   - Use Zod schema with proper error messages

2. **Create UuidParamSchema**:
   - Validate UUID format for path parameters
   - Reusable schema for all endpoints with UUID path params

**Dependencies:** `zod` package

**Testing:** Create unit tests for validation schemas

---

### Step 2: Extend ArticleService

**File:** `src/lib/services/article.service.ts`

1. **Add `getArticleById(id: string): Promise<ArticleDto>` method**:
   - Query `app.articles` with JOIN to `app.rss_sources`
   - JOIN to `app.article_topics` and `app.topics` for topic associations
   - Filter by article `id`
   - Map database response to ArticleDto format (snake_case to camelCase)
   - Throw error with code "ARTICLE_NOT_FOUND" if article doesn't exist
   - Return ArticleDto with nested source and topics

2. **Add `updateArticle(id: string, command: UpdateArticleCommand): Promise<ArticleEntity>` method**:
   - Verify article exists → throw "ARTICLE_NOT_FOUND" if not found
   - Validate topics exist (if topicIds provided) → throw "INVALID_TOPIC_IDS" if invalid
   - Update article fields in database (only provided fields)
   - Update topic associations:
     - Delete all existing associations for this article
     - Insert new associations (if topicIds provided)
   - Return updated article entity
   - Handle database errors appropriately

3. **Add `deleteArticle(id: string): Promise<void>` method**:
   - Verify article exists → throw "ARTICLE_NOT_FOUND" if not found
   - Delete article from database (CASCADE handles article_topics)
   - Return void on success

**Dependencies:** Existing ArticleService class, Supabase client

**Testing:** Create unit tests for each new method

---

### Step 3: Create API Route Handler for [id] Endpoints

**File:** `src/pages/api/articles/[id].ts`

1. **Implement GET handler**:
   - Extract `id` from `context.params.id`
   - Validate UUID format using UuidParamSchema
   - Call `ArticleService.getArticleById(id)`
   - Handle "ARTICLE_NOT_FOUND" error → 404
   - Return 200 OK with ArticleDto
   - Log success and errors appropriately

2. **Implement PATCH handler**:
   - Extract `id` from `context.params.id`
   - Validate UUID format
   - Check authentication (user exists)
   - Check authorization (user.role === 'service_role')
   - Parse and validate request body using UpdateArticleCommandSchema
   - Call `ArticleService.updateArticle(id, command)`
   - Handle errors appropriately (400, 401, 404, 500)
   - Return 200 OK with updated article fields
   - Log success and errors appropriately

3. **Implement DELETE handler**:
   - Extract `id` from `context.params.id`
   - Validate UUID format
   - Check authentication (user exists)
   - Check authorization (user.role === 'service_role')
   - Call `ArticleService.deleteArticle(id)`
   - Handle errors appropriately (400, 401, 404, 500)
   - Return 204 No Content
   - Log success and errors appropriately

**Dependencies:** 
- `ArticleService` from `src/lib/services/article.service.ts`
- Validation schemas from `src/lib/validation/article.schema.ts`
- Logger from `src/lib/utils/logger.ts`
- `ZodError` from `zod`

**Configuration:** Add `export const prerender = false;` for API route

---

### Step 4: Verify POST Endpoint Implementation

**File:** `src/pages/api/articles/index.ts`

1. **Review existing POST implementation**:
   - Ensure it follows the same patterns as other endpoints
   - Verify error handling is comprehensive
   - Check logging is appropriate
   - Ensure response format matches API specification

2. **Update if necessary**:
   - Align error codes with other endpoints
   - Ensure consistent error response format
   - Verify validation schema matches API specification

---

### Step 5: Update Middleware (if needed)

**File:** `src/middleware/index.ts`

1. **Verify middleware handles**:
   - Service role authentication correctly
   - Public access for GET /api/articles/:id
   - Protected access for POST/PATCH/DELETE /api/articles

2. **Update PUBLIC_PATHS if needed**:
   - Add `/api/articles/*` pattern for GET requests (optional, handled by route-level auth check)

**Note:** Current middleware pattern allows route-level authentication checks, which is appropriate for these endpoints.

---

### Step 6: Type Definitions Verification

**File:** `src/types.ts`

1. **Verify all required types exist**:
   - `ArticleDto` ✓
   - `ArticleSourceDto` ✓
   - `ArticleTopicDto` ✓
   - `CreateArticleCommand` ✓
   - `UpdateArticleCommand` ✓
   - `ArticleEntity` ✓
   - `ArticleInsert` ✓
   - `ArticleUpdate` ✓

2. **Add any missing types if needed**

---

### Step 7: Error Handling and Logging

1. **Ensure consistent error handling**:
   - All endpoints use same error response format
   - All endpoints log errors using logger utility
   - Error codes are consistent across endpoints

2. **Logging strategy**:
   - Log info for successful operations
   - Log warnings for validation errors and authentication failures
   - Log errors for unexpected failures
   - Include context (endpoint, userId, articleId) in logs

---

### Step 8: Testing

1. **Unit Tests** (`src/pages/api/articles/__tests__/`):
   - Create `[id].test.ts` for GET, PATCH, DELETE endpoints
   - Test all success scenarios
   - Test all error scenarios (400, 401, 404, 500)
   - Test validation edge cases
   - Mock Supabase client and ArticleService

2. **Integration Tests** (if applicable):
   - Test with real database (test environment)
   - Test service role authentication
   - Test database constraints (unique, foreign keys)

3. **E2E Tests** (if applicable):
   - Test complete flows (create → read → update → delete)
   - Test with actual service role tokens

---

### Step 9: Documentation

1. **API Documentation**:
   - Ensure API specification matches implementation
   - Document any deviations or additional features

2. **Code Documentation**:
   - Add JSDoc comments to all public methods
   - Document error codes and scenarios
   - Document business logic decisions

---

### Step 10: Code Review Checklist

- [ ] All endpoints follow Astro API route patterns
- [ ] All endpoints use Zod for validation
- [ ] All endpoints use ArticleService for business logic
- [ ] All endpoints have consistent error handling
- [ ] All endpoints have appropriate logging
- [ ] All endpoints return correct HTTP status codes
- [ ] All endpoints return correct response formats
- [ ] Service role authentication is properly enforced
- [ ] Path parameter validation is implemented
- [ ] Database operations handle errors correctly
- [ ] Type safety is maintained throughout
- [ ] Unit tests cover all scenarios
- [ ] Code follows project coding standards

---

## Implementation Notes

### Database Schema Considerations

- Articles table has `link` field with UNIQUE constraint (prevents duplicates)
- Articles table has foreign key to `rss_sources` (source_id)
- `article_topics` junction table has foreign keys to both `articles` and `topics`
- Database triggers handle `updated_at` timestamp updates
- CASCADE delete removes `article_topics` when article is deleted

### Transaction Handling

- Article creation with topic associations should be atomic
- Current implementation uses rollback pattern (delete article if associations fail)
- Future enhancement: Use database transactions for better atomicity

### Service Role Authentication

- Service role tokens are issued by Supabase with `role: 'service_role'` claim
- Middleware extracts role from JWT token
- Route handlers check `user.role === 'service_role'` for authorization
- Service role bypasses RLS policies (has full database access)

### Path Parameter Extraction

- Astro dynamic routes use `[id].ts` file naming
- Path parameters accessed via `context.params.id`
- Must validate UUID format before using in database queries

### Response Format Consistency

- All success responses use camelCase field names
- All error responses follow ErrorResponse interface
- Timestamps use ISO 8601 format
- Content-Type header is always `application/json`

