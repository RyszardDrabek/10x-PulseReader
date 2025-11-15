# API Endpoint Implementation Plan: POST /api/articles

## 1. Endpoint Overview

The POST /api/articles endpoint is a service-role-only endpoint designed to create new articles in the system. It is primarily used by the RSS fetching cron job to ingest articles from configured RSS sources. The endpoint accepts article metadata along with optional sentiment analysis results and topic associations, performs validation, and inserts the article into the database while respecting unique constraints on article links to prevent duplicates.

**Key Characteristics:**
- Service role authentication required
- Supports atomic creation with optional topic associations
- Enforces unique article links (409 on duplicates)
- Returns simplified article entity (without nested relations)
- Validates all foreign key references before insertion

## 2. Request Details

- **HTTP Method:** POST
- **URL Structure:** `/api/articles`
- **Content-Type:** `application/json`
- **Authentication:** Required (service_role JWT token)

### Parameters:

#### Required (in request body):
- `sourceId` (string, UUID): Reference to the RSS source this article belongs to. Must exist in `app.rss_sources` table.
- `title` (string, 1-1000 characters): The article title from the RSS feed.
- `link` (string, valid URL): Unique URL to the full article. Must not exist in the database.
- `publicationDate` (string, ISO 8601 datetime): When the article was originally published.

#### Optional (in request body):
- `description` (string | null, max 5000 characters): Article description or excerpt from RSS feed. Defaults to null.
- `sentiment` (ArticleSentiment | null): AI-analyzed sentiment - one of 'positive', 'neutral', 'negative', or null. Defaults to null.
- `topicIds` (array of UUID strings): IDs of topics to associate with this article. All must exist in `app.topics` table. Should be limited to max 20 topics.

### Request Body Example:

```json
{
  "sourceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Breaking: Major Climate Agreement Reached",
  "description": "World leaders have agreed to significant emissions reductions...",
  "link": "https://bbcnews.com/world/climate-agreement-2025",
  "publicationDate": "2025-11-15T10:30:00Z",
  "sentiment": "positive",
  "topicIds": [
    "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
    "a9b8c7d6-e5f4-3210-abcd-ef9876543210"
  ]
}
```

## 3. Used Types

The following types from `src/types.ts` are required for implementation:

### Request Validation:
- `CreateArticleCommand`: Command model for request body validation
- `ArticleSentiment`: Type guard for sentiment validation

### Response:
- `ArticleEntity`: Return type for successful creation (simplified without source/topics)

### Error Handling:
- `ErrorResponse`: Standard error response structure
- `ValidationErrorResponse`: Validation error with detailed messages
- `ValidationErrorDetails`: Individual field validation errors

### Internal:
- `RssSourceEntity`: For validating sourceId existence
- `TopicEntity`: For validating topicIds existence

## 4. Response Details

### Success Response (201 Created):

Returns the created article entity with all database-generated fields populated.

```json
{
  "id": "12345678-1234-5678-1234-567812345678",
  "sourceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Breaking: Major Climate Agreement Reached",
  "description": "World leaders have agreed to significant emissions reductions...",
  "link": "https://bbcnews.com/world/climate-agreement-2025",
  "publicationDate": "2025-11-15T10:30:00Z",
  "sentiment": "positive",
  "createdAt": "2025-11-15T10:35:22.123Z",
  "updatedAt": "2025-11-15T10:35:22.123Z"
}
```

**Note:** The response does NOT include nested `source` or `topics` objects. This is a simplified response suitable for the cron job use case. If the cron job needs these relations, it should call GET /api/articles/:id afterward.

### Error Responses:

#### 400 Bad Request - Validation Error:

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "Title is required" },
    { "field": "link", "message": "Link must be a valid URL" }
  ],
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 400 Bad Request - Invalid Foreign Key:

```json
{
  "error": "RSS source not found",
  "code": "INVALID_SOURCE_ID",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

```json
{
  "error": "One or more topics not found",
  "code": "INVALID_TOPIC_IDS",
  "details": {
    "invalidIds": ["uuid1", "uuid2"]
  },
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 401 Unauthorized - Authentication Required:

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 401 Unauthorized - Service Role Required:

```json
{
  "error": "Service role required for this endpoint",
  "code": "FORBIDDEN",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 409 Conflict - Duplicate Article:

```json
{
  "error": "Article with this link already exists",
  "code": "CONFLICT",
  "details": {
    "link": "https://bbcnews.com/world/climate-agreement-2025"
  },
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 500 Internal Server Error:

```json
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

## 5. Data Flow

### Request Processing Flow:

1. **Request Reception** (`src/pages/api/articles/index.ts`):
   - Astro API route handler receives POST request
   - Extracts Supabase client from `context.locals.supabase`
   - Extracts user from `context.locals.user` (set by middleware)

2. **Authentication & Authorization**:
   - Middleware has already validated JWT token
   - Route handler checks if user role is 'service_role'
   - Return 401 if not service_role

3. **Request Body Parsing**:
   - Parse JSON body from request
   - Handle JSON parse errors → 400 Bad Request

4. **Input Validation** (Zod schema):
   - Validate against `CreateArticleCommandSchema`
   - Check required fields: sourceId, title, link, publicationDate
   - Validate types: UUIDs, URL format, datetime format
   - Validate constraints: string lengths, sentiment enum values
   - Validate topicIds array size (max 20)
   - Return 400 with detailed errors if validation fails

5. **Business Logic** (`src/lib/services/article.service.ts`):
   - **Step 5.1:** Verify RSS source exists
     - Query `app.rss_sources` for sourceId
     - Return 400 "RSS source not found" if not exists
   
   - **Step 5.2:** Verify topics exist (if topicIds provided)
     - Query `app.topics` WHERE id IN (topicIds)
     - Compare returned count with provided count
     - Return 400 "One or more topics not found" if mismatch
   
   - **Step 5.3:** Insert article into database
     - INSERT into `app.articles` with provided data
     - Database enforces UNIQUE constraint on `link` field
     - Handle unique constraint violation → 409 Conflict
     - Return inserted article with generated id, createdAt, updatedAt
   
   - **Step 5.4:** Create topic associations (if topicIds provided)
     - Batch INSERT into `app.article_topics` (article_id, topic_id pairs)
     - This is a separate transaction but should be atomic with article creation
     - On failure, the article insertion should be rolled back

6. **Response Formation**:
   - Map database entity to response format
   - Convert snake_case to camelCase for API response
   - Return 201 Created with ArticleEntity

7. **Error Handling**:
   - Catch database errors and return appropriate status codes
   - Log errors for debugging (especially for cron job monitoring)
   - Never expose internal database details in error messages

### Database Interaction:

```
Supabase Client (service_role)
    ↓
[Validate sourceId]
    ↓ SELECT FROM app.rss_sources
    ↓
[Validate topicIds]
    ↓ SELECT FROM app.topics
    ↓
[Insert Article]
    ↓ INSERT INTO app.articles
    ↓ (triggers: update_updated_at_column)
    ↓ (constraints: UNIQUE on link, FK on source_id)
    ↓
[Create Topic Associations]
    ↓ INSERT INTO app.article_topics
    ↓ (constraints: FK on article_id and topic_id)
    ↓
[Return Created Article]
```

### Transaction Considerations:

The article creation and topic associations should ideally be wrapped in a transaction to ensure atomicity:

```sql
BEGIN;
  INSERT INTO app.articles (...) RETURNING *;
  INSERT INTO app.article_topics (article_id, topic_id) VALUES (...);
COMMIT;
```

If using Supabase client, this may require using the `.rpc()` function to call a stored procedure, or handling rollback manually on errors.

## 6. Security Considerations

### Authentication & Authorization:

1. **Service Role Verification**:
   - Endpoint must ONLY accept requests from service_role
   - Middleware validates JWT token and extracts role claim
   - Route handler checks: `user.role === 'service_role'`
   - Return 401 if authentication fails or role is not service_role
   - Regular users and guests MUST NOT have access

2. **Token Validation**:
   - Middleware extracts token from Authorization header: `Bearer <token>`
   - Supabase client verifies token signature and expiration
   - Invalid/expired tokens → 401 Unauthorized

3. **Row-Level Security (RLS)**:
   - Service role bypasses RLS policies (has full access)
   - Ensures cron jobs can insert articles regardless of RLS rules

### Input Validation & Sanitization:

1. **Zod Schema Validation**:
   - Strict type checking for all inputs
   - UUID format validation for sourceId and topicIds
   - URL format validation for link
   - ISO 8601 datetime validation for publicationDate
   - String length limits (title: 1000, description: 5000)
   - Enum validation for sentiment

2. **SQL Injection Prevention**:
   - Supabase SDK uses parameterized queries automatically
   - Never construct raw SQL with user input
   - All database operations through Supabase client methods

3. **Data Size Limits**:
   - Enforce max title length: 1000 characters
   - Enforce max description length: 5000 characters
   - Limit topicIds array: max 20 topics per article
   - Reject requests exceeding limits → 400 Bad Request

4. **URL Validation**:
   - Validate link is a well-formed URL
   - Consider additional checks: protocol whitelist (http/https only)
   - Prevent javascript:, data:, file: protocols

### Foreign Key Validation:

1. **Prevent Invalid References**:
   - Explicitly verify sourceId exists before insertion
   - Explicitly verify all topicIds exist before associations
   - Return 400 (not 500) for invalid references
   - Provide clear error messages for debugging

2. **Database Constraints**:
   - Foreign key constraints on source_id → rss_sources(id)
   - Foreign key constraints on topic_id → topics(id)
   - Cascade delete behavior defined in schema

### Rate Limiting & Abuse Prevention:

- **MVP:** No rate limiting (service_role only, controlled environment)
- **Future:** If exposing to third-party services, implement rate limiting:
  - Max requests per minute per service key
  - Circuit breaker for repeated failures

### Logging & Monitoring:

1. **Audit Logging**:
   - Log all article creation attempts (success and failure)
   - Include: timestamp, sourceId, link, result status
   - Do NOT log full article content (GDPR/storage concerns)

2. **Error Logging**:
   - Log 409 conflicts (common in RSS, useful for deduplication monitoring)
   - Log validation errors (helps debug cron job issues)
   - Log unexpected database errors (needs investigation)

3. **Security Logging**:
   - Log unauthorized access attempts (401 responses)
   - Monitor for unusual patterns (many 409s might indicate RSS feed issues)

## 7. Error Handling

### Error Categories and Handling Strategy:

#### 1. Client Errors (4xx)

##### 400 Bad Request - JSON Parse Error:
- **Cause:** Malformed JSON in request body
- **Detection:** JSON.parse() throws error
- **Response:**
  ```json
  {
    "error": "Invalid JSON in request body",
    "code": "INVALID_JSON",
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log as warning (cron job misconfiguration)

##### 400 Bad Request - Validation Error:
- **Cause:** Request body fails Zod schema validation
- **Detection:** Zod parse() returns error with issues array
- **Response:** ValidationErrorResponse with field-specific errors
- **Example:**
  ```json
  {
    "error": "Validation failed",
    "details": [
      { "field": "sourceId", "message": "Invalid UUID format" },
      { "field": "title", "message": "Title must be between 1 and 1000 characters" },
      { "field": "link", "message": "Invalid URL format" },
      { "field": "publicationDate", "message": "Must be a valid ISO 8601 datetime" },
      { "field": "sentiment", "message": "Must be one of: positive, neutral, negative, or null" },
      { "field": "topicIds", "message": "Maximum 20 topics allowed" }
    ],
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log validation details for debugging

##### 400 Bad Request - Invalid Source ID:
- **Cause:** sourceId does not exist in rss_sources table
- **Detection:** Query returns no rows
- **Response:**
  ```json
  {
    "error": "RSS source not found",
    "code": "INVALID_SOURCE_ID",
    "details": { "sourceId": "provided-uuid" },
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log as error (cron job configuration issue)

##### 400 Bad Request - Invalid Topic IDs:
- **Cause:** One or more topicIds do not exist in topics table
- **Detection:** Query returns fewer topics than requested
- **Response:**
  ```json
  {
    "error": "One or more topics not found",
    "code": "INVALID_TOPIC_IDS",
    "details": {
      "requestedCount": 3,
      "foundCount": 2,
      "invalidIds": ["uuid-that-doesnt-exist"]
    },
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log as warning (AI might have generated invalid topic IDs)

##### 401 Unauthorized - Missing Authentication:
- **Cause:** No Authorization header or invalid token
- **Detection:** Middleware sets user to null
- **Response:**
  ```json
  {
    "error": "Authentication required",
    "code": "AUTHENTICATION_REQUIRED",
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log as security warning

##### 401 Unauthorized - Insufficient Permissions:
- **Cause:** Authenticated user is not service_role
- **Detection:** user.role !== 'service_role'
- **Response:**
  ```json
  {
    "error": "Service role required for this endpoint",
    "code": "FORBIDDEN",
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log as security warning with user ID

##### 409 Conflict - Duplicate Article:
- **Cause:** Article with same link already exists (UNIQUE constraint violation)
- **Detection:** Database error code 23505 (PostgreSQL unique violation)
- **Response:**
  ```json
  {
    "error": "Article with this link already exists",
    "code": "CONFLICT",
    "details": { "link": "provided-url" },
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log as info (expected behavior in RSS fetching)
- **Handling:** Cron job should continue with next article

#### 2. Server Errors (5xx)

##### 500 Internal Server Error - Database Connection:
- **Cause:** Cannot connect to Supabase database
- **Detection:** Supabase client throws connection error
- **Response:**
  ```json
  {
    "error": "An unexpected error occurred",
    "code": "INTERNAL_ERROR",
    "timestamp": "2025-11-15T10:35:00Z"
  }
  ```
- **Logging:** Log as critical error with full stack trace
- **Action:** Alert monitoring system

##### 500 Internal Server Error - Transaction Rollback:
- **Cause:** Article inserted but topic associations failed
- **Detection:** Second INSERT fails after first succeeds
- **Response:** Same as above
- **Logging:** Log as critical error - data consistency issue
- **Handling:** Rollback transaction, orphaned article should not exist

##### 500 Internal Server Error - Unexpected Database Error:
- **Cause:** Any other database error not explicitly handled
- **Detection:** Catch-all error handler
- **Response:** Generic 500 error (don't expose internal details)
- **Logging:** Log full error details and stack trace
- **Action:** Investigate and handle specifically in future

### Error Response Format:

All error responses follow this structure:

```typescript
interface ErrorResponse {
  error: string;           // Human-readable error message
  code?: string;           // Machine-readable error code
  details?: Record<string, unknown>; // Additional context
  timestamp: string;       // ISO 8601 timestamp
}
```

### Error Handling Implementation:

```typescript
try {
  // Main logic
} catch (error) {
  console.error('Error creating article:', error);
  
  if (error instanceof ZodError) {
    return new Response(JSON.stringify({
      error: 'Validation failed',
      details: error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      })),
      timestamp: new Date().toISOString()
    }), { status: 400 });
  }
  
  if (isDatabaseUniqueViolation(error)) {
    return new Response(JSON.stringify({
      error: 'Article with this link already exists',
      code: 'CONFLICT',
      details: { link: command.link },
      timestamp: new Date().toISOString()
    }), { status: 409 });
  }
  
  // Generic server error
  return new Response(JSON.stringify({
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  }), { status: 500 });
}
```

## 8. Performance Considerations

### Potential Bottlenecks:

1. **Foreign Key Validation Queries**:
   - **Issue:** Two separate SELECT queries before INSERT (source, topics)
   - **Impact:** Additional round trips to database
   - **Optimization:**
     - Use prepared statements
     - Consider caching RSS sources (they change rarely)
     - Batch validate topics in single query with WHERE IN

2. **Topic Association Inserts**:
   - **Issue:** If topicIds array is large (up to 20), individual INSERTs are slow
   - **Impact:** Linear time with number of topics
   - **Optimization:**
     - Use batch INSERT: `INSERT INTO ... VALUES (row1), (row2), ...`
     - Supabase SDK supports this: `.insert([{...}, {...}])`

3. **Database Connection Pooling**:
   - **Issue:** Each request acquires connection from pool
   - **Impact:** Connection exhaustion under high load
   - **Optimization:**
     - Supabase handles connection pooling
     - Monitor pool size and adjust if needed
     - For cron jobs, use single connection and batch requests

4. **Large Description Fields**:
   - **Issue:** Descriptions up to 5000 characters increase payload size
   - **Impact:** Network latency and storage
   - **Optimization:**
     - Consider truncating descriptions at ingestion
     - Use compression for large payloads
     - Monitor average description size

### Optimization Strategies:

1. **Batch Processing in Cron Job**:
   - Instead of calling POST /api/articles once per article, consider:
   - Creating a POST /api/articles/batch endpoint for bulk inserts
   - Reduces network overhead and transaction overhead
   - **Future enhancement, not in MVP**

2. **Database Indexes** (already implemented in schema):
   - UNIQUE index on articles.link for fast duplicate detection
   - Foreign key indexes on articles.source_id
   - Indexes on article_topics for fast association queries

3. **Caching Strategy**:
   - **RSS Sources:** Cache in memory (rarely change)
   - **Topics:** Cache recent topics (reduces validation queries)
   - **Articles:** No caching needed for creation endpoint
   - **Implementation:** Use simple in-memory cache with TTL

4. **Monitoring Query Performance**:
   - Enable Supabase slow query logging
   - Monitor p95/p99 latencies for:
     - Source validation query
     - Topic validation query
     - Article insertion query
     - Topic association batch insert
   - Set alert threshold: p95 > 100ms

### Expected Performance:

- **Target latency:** < 200ms for successful creation (p95)
- **Throughput:** Dependent on Supabase plan, but should handle:
  - RSS cron job: ~100 articles/minute
  - Peak load: 10 concurrent requests
- **Database operations:** 4-5 queries per request
  - 1 for source validation
  - 1 for topics validation (if applicable)
  - 1 for article insert
  - 1 for topic associations (batch insert)

### Scalability Considerations:

- **MVP:** Single-server Astro deployment, Supabase handles DB scaling
- **Future:** If traffic increases:
  - Deploy multiple Astro instances behind load balancer
  - Use Supabase connection pooling (PgBouncer)
  - Consider read replicas for validation queries
  - Implement Redis caching layer

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File:** `src/lib/validation/article.schema.ts`

```typescript
import { z } from 'zod';

export const CreateArticleCommandSchema = z.object({
  sourceId: z.string().uuid({ message: 'Invalid UUID format for sourceId' }),
  title: z.string()
    .min(1, { message: 'Title is required' })
    .max(1000, { message: 'Title must not exceed 1000 characters' }),
  description: z.string()
    .max(5000, { message: 'Description must not exceed 5000 characters' })
    .nullable()
    .optional(),
  link: z.string().url({ message: 'Link must be a valid URL' }),
  publicationDate: z.string().datetime({ message: 'Publication date must be a valid ISO 8601 datetime' }),
  sentiment: z.enum(['positive', 'neutral', 'negative'], {
    errorMap: () => ({ message: 'Sentiment must be one of: positive, neutral, negative, or null' })
  }).nullable().optional(),
  topicIds: z.array(z.string().uuid({ message: 'Invalid UUID format in topicIds' }))
    .max(20, { message: 'Maximum 20 topics allowed per article' })
    .optional()
});

export type CreateArticleCommandValidated = z.infer<typeof CreateArticleCommandSchema>;
```

**Tasks:**
- Create file with Zod schema
- Export schema and inferred type
- Test schema with valid and invalid inputs
- Ensure error messages are user-friendly

---

### Step 2: Create Article Service

**File:** `src/lib/services/article.service.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateArticleCommand, ArticleEntity } from '@/types';
import type { Database } from '@/db/database.types';

export class ArticleService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Validates that the RSS source exists
   */
  async validateSource(sourceId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('rss_sources')
      .select('id')
      .eq('id', sourceId)
      .single();
    
    return !error && data !== null;
  }

  /**
   * Validates that all topic IDs exist
   * Returns array of invalid IDs if any
   */
  async validateTopics(topicIds: string[]): Promise<{ valid: boolean; invalidIds: string[] }> {
    if (!topicIds || topicIds.length === 0) {
      return { valid: true, invalidIds: [] };
    }

    const { data, error } = await this.supabase
      .from('topics')
      .select('id')
      .in('id', topicIds);
    
    if (error || !data) {
      return { valid: false, invalidIds: topicIds };
    }

    const foundIds = new Set(data.map(t => t.id));
    const invalidIds = topicIds.filter(id => !foundIds.has(id));
    
    return { valid: invalidIds.length === 0, invalidIds };
  }

  /**
   * Creates a new article with optional topic associations
   */
  async createArticle(command: CreateArticleCommand): Promise<ArticleEntity> {
    // Validate source exists
    const sourceExists = await this.validateSource(command.sourceId);
    if (!sourceExists) {
      throw new Error('RSS_SOURCE_NOT_FOUND');
    }

    // Validate topics exist (if provided)
    if (command.topicIds && command.topicIds.length > 0) {
      const topicValidation = await this.validateTopics(command.topicIds);
      if (!topicValidation.valid) {
        throw new Error(`INVALID_TOPIC_IDS:${JSON.stringify(topicValidation.invalidIds)}`);
      }
    }

    // Insert article
    const { data: article, error: insertError } = await this.supabase
      .from('articles')
      .insert({
        source_id: command.sourceId,
        title: command.title,
        description: command.description ?? null,
        link: command.link,
        publication_date: command.publicationDate,
        sentiment: command.sentiment ?? null
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        throw new Error('ARTICLE_ALREADY_EXISTS');
      }
      throw insertError;
    }

    // Create topic associations
    if (command.topicIds && command.topicIds.length > 0) {
      const associations = command.topicIds.map(topicId => ({
        article_id: article.id,
        topic_id: topicId
      }));

      const { error: associationError } = await this.supabase
        .from('article_topics')
        .insert(associations);

      if (associationError) {
        // Rollback: delete the article
        await this.supabase
          .from('articles')
          .delete()
          .eq('id', article.id);
        
        throw new Error('TOPIC_ASSOCIATION_FAILED');
      }
    }

    // Map to ArticleEntity format (snake_case to camelCase)
    return {
      id: article.id,
      sourceId: article.source_id,
      title: article.title,
      description: article.description,
      link: article.link,
      publicationDate: article.publication_date,
      sentiment: article.sentiment,
      createdAt: article.created_at,
      updatedAt: article.updated_at
    };
  }
}
```

**Tasks:**
- Create ArticleService class with Supabase dependency injection
- Implement validateSource method
- Implement validateTopics method
- Implement createArticle method with transaction-like behavior
- Handle rollback if topic associations fail
- Map database response to camelCase format
- Write unit tests for each method

---

### Step 3: Create API Route Handler

**File:** `src/pages/api/articles/index.ts`

```typescript
import type { APIRoute } from 'astro';
import { CreateArticleCommandSchema } from '@/lib/validation/article.schema';
import { ArticleService } from '@/lib/services/article.service';
import { ZodError } from 'zod';

export const prerender = false;

/**
 * POST /api/articles
 * Creates a new article (service role only)
 */
export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Check authentication
  if (!user) {
    return new Response(JSON.stringify({
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString()
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check authorization (service role only)
  if (user.role !== 'service_role') {
    return new Response(JSON.stringify({
      error: 'Service role required for this endpoint',
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request body
    const body = await context.request.json();

    // Validate request body
    const command = CreateArticleCommandSchema.parse(body);

    // Create article using service
    const articleService = new ArticleService(supabase);
    const article = await articleService.createArticle(command);

    // Return created article
    return new Response(JSON.stringify(article), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating article:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle validation errors
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        })),
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message === 'RSS_SOURCE_NOT_FOUND') {
        return new Response(JSON.stringify({
          error: 'RSS source not found',
          code: 'INVALID_SOURCE_ID',
          timestamp: new Date().toISOString()
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (error.message.startsWith('INVALID_TOPIC_IDS:')) {
        const invalidIds = JSON.parse(error.message.split(':')[1]);
        return new Response(JSON.stringify({
          error: 'One or more topics not found',
          code: 'INVALID_TOPIC_IDS',
          details: { invalidIds },
          timestamp: new Date().toISOString()
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (error.message === 'ARTICLE_ALREADY_EXISTS') {
        return new Response(JSON.stringify({
          error: 'Article with this link already exists',
          code: 'CONFLICT',
          timestamp: new Date().toISOString()
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (error.message === 'TOPIC_ASSOCIATION_FAILED') {
        console.error('Topic association failed after article creation');
        return new Response(JSON.stringify({
          error: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generic server error
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

**Tasks:**
- Create API route file with prerender disabled
- Implement POST handler function
- Extract authentication context from locals
- Validate service_role authorization
- Parse and validate request body
- Call ArticleService to create article
- Map all error types to appropriate HTTP responses
- Add proper Content-Type headers
- Test with various payloads and error scenarios

---

### Step 4: Update Middleware for Authentication Context

**File:** `src/middleware/index.ts`

Ensure middleware is properly extracting the Supabase client and user context:

```typescript
import type { MiddlewareHandler } from 'astro';
import { createSupabaseClient } from '@/db/supabase.client';

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Create Supabase client
  const supabase = createSupabaseClient(context);
  
  // Get user from session
  const { data: { user } } = await supabase.auth.getUser();
  
  // Add to context
  context.locals.supabase = supabase;
  context.locals.user = user;
  
  return next();
};
```

**Tasks:**
- Verify middleware creates Supabase client correctly
- Ensure user context is extracted from JWT
- Check that service_role token is properly recognized
- Test that context.locals is populated before route handlers run

---

### Step 5: Update Type Definitions

**File:** `src/env.d.ts`

Ensure Astro locals type definitions include the required properties:

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import('@/db/supabase.client').SupabaseClient;
    user: import('@supabase/supabase-js').User | null;
  }
}
```

**Tasks:**
- Add or verify Locals interface includes supabase and user
- Ensure TypeScript recognizes these properties in route handlers
- Test type-checking works correctly

---

### Step 6: Testing

#### Unit Tests:

**File:** `src/lib/services/__tests__/article.service.test.ts`

Test ArticleService methods in isolation:

```typescript
describe('ArticleService', () => {
  describe('validateSource', () => {
    it('should return true for valid source ID', async () => {
      // Test implementation
    });
    
    it('should return false for invalid source ID', async () => {
      // Test implementation
    });
  });

  describe('validateTopics', () => {
    it('should return valid:true for all valid topic IDs', async () => {
      // Test implementation
    });
    
    it('should return invalid IDs for non-existent topics', async () => {
      // Test implementation
    });
  });

  describe('createArticle', () => {
    it('should create article successfully', async () => {
      // Test implementation
    });
    
    it('should throw RSS_SOURCE_NOT_FOUND for invalid source', async () => {
      // Test implementation
    });
    
    it('should throw INVALID_TOPIC_IDS for invalid topics', async () => {
      // Test implementation
    });
    
    it('should throw ARTICLE_ALREADY_EXISTS for duplicate link', async () => {
      // Test implementation
    });
    
    it('should rollback article if topic association fails', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests:

**File:** `src/pages/api/articles/__tests__/index.test.ts`

Test the full API endpoint:

```typescript
describe('POST /api/articles', () => {
  it('should return 401 without authentication', async () => {
    // Test implementation
  });
  
  it('should return 401 for non-service-role user', async () => {
    // Test implementation
  });
  
  it('should return 400 for invalid JSON', async () => {
    // Test implementation
  });
  
  it('should return 400 for validation errors', async () => {
    // Test implementation
  });
  
  it('should return 400 for invalid sourceId', async () => {
    // Test implementation
  });
  
  it('should return 400 for invalid topicIds', async () => {
    // Test implementation
  });
  
  it('should return 409 for duplicate article link', async () => {
    // Test implementation
  });
  
  it('should return 201 and create article successfully', async () => {
    // Test implementation
  });
  
  it('should create article with topics', async () => {
    // Test implementation
  });
});
```

**Tasks:**
- Set up test database with seed data
- Mock Supabase client for unit tests
- Use test service_role token for integration tests
- Test all error scenarios
- Test successful creation with and without topics
- Verify response format matches specification
- Check database state after operations

---

### Step 7: Documentation

**File:** `docs/api/articles/create-article.md` (optional)

Document the endpoint with:
- Purpose and use cases
- Authentication requirements
- Request/response examples
- Error scenarios
- Code examples for cron job integration

**Tasks:**
- Create API documentation
- Add curl examples
- Document common pitfalls
- Explain service_role token generation

---

### Step 8: Monitoring and Logging Setup

**File:** `src/lib/utils/logger.ts` (create if doesn't exist)

Set up structured logging:

```typescript
export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...context,
      timestamp: new Date().toISOString()
    }));
  },
  error: (message: string, error: unknown, context?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error),
      ...context,
      timestamp: new Date().toISOString()
    }));
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...context,
      timestamp: new Date().toISOString()
    }));
  }
};
```

**Tasks:**
- Create logger utility
- Replace console.log/error with logger calls in route handler
- Log article creation attempts with sourceId and result
- Log 409 conflicts for monitoring RSS deduplication
- Set up log aggregation (future: send to external service)

---

### Step 9: Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured:
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] Database migrations applied:
  - [ ] app schema created
  - [ ] Tables created with proper constraints
  - [ ] Indexes created
  - [ ] RLS policies enabled
  - [ ] Seed data loaded (RSS sources)
- [ ] Service role token generated and stored securely
- [ ] Cron job configured with service_role token
- [ ] Error monitoring set up
- [ ] Log aggregation configured
- [ ] Integration tests pass in staging environment
- [ ] Performance testing completed (load test with 100 articles/minute)
- [ ] Documentation updated and reviewed

---

### Step 10: Post-Deployment Monitoring

After deployment, monitor:

- [ ] Article creation success rate (target: >95%)
- [ ] 409 conflict rate (indicates RSS feed patterns)
- [ ] Response time p95 (target: <200ms)
- [ ] Database connection pool usage
- [ ] Any 500 errors (should be zero)
- [ ] Unauthorized access attempts (401 responses)

**Set up alerts for:**
- Error rate > 5% over 5 minutes
- p95 latency > 500ms
- Any 500 errors
- Multiple 401 errors from same source (security)

---

## Summary

This implementation plan provides a comprehensive guide for implementing the POST /api/articles endpoint. Key considerations:

1. **Security first:** Service-role authentication is critical
2. **Validation:** Strict input validation prevents data integrity issues
3. **Error handling:** Graceful error responses with appropriate status codes
4. **Transaction safety:** Rollback article if topic associations fail
5. **Performance:** Optimize foreign key validation and batch inserts
6. **Monitoring:** Log all operations for debugging cron job issues
7. **Testing:** Comprehensive unit and integration tests

The endpoint is designed specifically for the RSS fetching cron job use case, with optimizations for batch processing and clear error messages for debugging automated workflows.

