# API Endpoint Implementation Plan: RSS Sources Endpoints

## 1. Endpoint Overview

This implementation plan covers five REST API endpoints for managing RSS sources in the PulseReader application:

1. **GET /api/rss-sources** - Retrieves a paginated list of all RSS sources (public access)
2. **GET /api/rss-sources/:id** - Retrieves a single RSS source by ID (public access)
3. **POST /api/rss-sources** - Creates a new RSS source (service role only)
4. **PATCH /api/rss-sources/:id** - Updates an existing RSS source (service role only)
5. **DELETE /api/rss-sources/:id** - Deletes an RSS source and all associated articles (service role only)

**Key Features:**

- Public read access for all users (including guests)
- Service role authentication required for write operations (POST, PATCH, DELETE)
- Pagination support for list endpoint
- URL uniqueness validation (prevents duplicate RSS feeds)
- Cascade deletion of associated articles when source is deleted
- Comprehensive input validation with Zod schemas
- Proper error handling with appropriate HTTP status codes

**Primary Use Cases:**

1. Frontend displaying list of available RSS sources
2. Admin/system processes managing RSS feed sources
3. RSS fetching cron job verifying source existence
4. Users browsing available news sources

**Response Time Target:** < 200ms p95 latency for read operations, < 300ms for write operations

---

## 2. Request Details

### GET /api/rss-sources

**HTTP Method:** `GET`

**URL Structure:** `/api/rss-sources`

**Query Parameters:**

| Parameter | Type    | Default | Validation       | Description                |
| --------- | ------- | ------- | ---------------- | -------------------------- |
| `limit`   | integer | 50      | Min: 1, Max: 100 | Number of sources per page |
| `offset`  | integer | 0       | Min: 0           | Pagination offset          |

**Authentication:** Optional (public access)

**Request Body:** None

**Example Request:**

```http
GET /api/rss-sources?limit=20&offset=0
```

---

### GET /api/rss-sources/:id

**HTTP Method:** `GET`

**URL Structure:** `/api/rss-sources/:id`

**Path Parameters:**

| Parameter | Type          | Required | Validation        | Description   |
| --------- | ------------- | -------- | ----------------- | ------------- |
| `id`      | string (UUID) | Yes      | Valid UUID format | RSS source ID |

**Authentication:** Optional (public access)

**Request Body:** None

**Example Request:**

```http
GET /api/rss-sources/550e8400-e29b-41d4-a716-446655440000
```

---

### POST /api/rss-sources

**HTTP Method:** `POST`

**URL Structure:** `/api/rss-sources`

**Authentication:** Required (service_role JWT token)

**Request Body:**

```json
{
  "name": "The Guardian - World",
  "url": "https://www.theguardian.com/world/rss"
}
```

**Request Body Fields:**

| Field  | Type   | Required | Validation                  | Description                           |
| ------ | ------ | -------- | --------------------------- | ------------------------------------- |
| `name` | string | Yes      | Min: 1, Max: 500            | Human-readable name of the RSS source |
| `url`  | string | Yes      | Valid URL format, Max: 2000 | RSS feed URL (must be unique)         |

**Example Request:**

```http
POST /api/rss-sources
Authorization: Bearer <service_role_token>
Content-Type: application/json

{
  "name": "The Guardian - World",
  "url": "https://www.theguardian.com/world/rss"
}
```

---

### PATCH /api/rss-sources/:id

**HTTP Method:** `PATCH`

**URL Structure:** `/api/rss-sources/:id`

**Path Parameters:**

| Parameter | Type          | Required | Validation        | Description   |
| --------- | ------------- | -------- | ----------------- | ------------- |
| `id`      | string (UUID) | Yes      | Valid UUID format | RSS source ID |

**Authentication:** Required (service_role JWT token)

**Request Body:**

```json
{
  "name": "The Guardian - World News",
  "url": "https://www.theguardian.com/world/rss"
}
```

**Request Body Fields:**

| Field  | Type   | Required | Validation                  | Description                               |
| ------ | ------ | -------- | --------------------------- | ----------------------------------------- |
| `name` | string | No       | Min: 1, Max: 500            | Human-readable name of the RSS source     |
| `url`  | string | No       | Valid URL format, Max: 2000 | RSS feed URL (must be unique if provided) |

**Note:** All fields are optional for partial updates. At least one field must be provided.

**Example Request:**

```http
PATCH /api/rss-sources/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <service_role_token>
Content-Type: application/json

{
  "name": "The Guardian - World News"
}
```

---

### DELETE /api/rss-sources/:id

**HTTP Method:** `DELETE`

**URL Structure:** `/api/rss-sources/:id`

**Path Parameters:**

| Parameter | Type          | Required | Validation       | Description   |
| --------- | ------------- | -------- | ---------------- | ------------- |
| `id`      | string (UUID) | Yes      | Valid URL format | RSS source ID |

**Authentication:** Required (service_role JWT token)

**Request Body:** None

**Example Request:**

```http
DELETE /api/rss-sources/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <service_role_token>
```

---

## 3. Used Types

The following types from `src/types.ts` are used in this implementation:

### Entity Types

```typescript
RssSourceEntity {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}
```

### DTO Types

```typescript
RssSourceDto = RssSourceEntity

RssSourceListResponse {
  data: RssSourceDto[];
  pagination: PaginationMetadata;
}

PaginationMetadata {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}
```

### Command Models

```typescript
CreateRssSourceCommand {
  name: string;
  url: string;
}

UpdateRssSourceCommand {
  name?: string;
  url?: string;
}
```

### Query Parameter Types

```typescript
GetRssSourcesQueryParams {
  limit?: number;
  offset?: number;
}
```

### Insert/Update Types

```typescript
RssSourceInsert {
  id?: string;
  name: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

RssSourceUpdate {
  name?: string;
  url?: string;
  updatedAt?: string;
}
```

### Error Response Types

```typescript
ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

ValidationErrorResponse {
  error: string;
  details: ValidationErrorDetails[];
  timestamp?: string;
}

ValidationErrorDetails {
  field?: string;
  message: string;
}
```

---

## 4. Response Details

### GET /api/rss-sources - Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "BBC News - World",
      "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
      "createdAt": "2025-11-01T00:00:00Z",
      "updatedAt": "2025-11-01T00:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "The Guardian - World",
      "url": "https://www.theguardian.com/world/rss",
      "createdAt": "2025-11-15T10:00:00Z",
      "updatedAt": "2025-11-15T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 4,
    "hasMore": false
  }
}
```

---

### GET /api/rss-sources/:id - Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "BBC News - World",
  "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
  "createdAt": "2025-11-01T00:00:00Z",
  "updatedAt": "2025-11-01T00:00:00Z"
}
```

---

### POST /api/rss-sources - Success Response (201 Created)

**Status Code:** `201 Created`

**Content-Type:** `application/json`

**Response Body:**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "The Guardian - World",
  "url": "https://www.theguardian.com/world/rss",
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

---

### PATCH /api/rss-sources/:id - Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "The Guardian - World News",
  "url": "https://www.theguardian.com/world/rss",
  "createdAt": "2025-11-01T00:00:00Z",
  "updatedAt": "2025-11-15T11:00:00Z"
}
```

---

### DELETE /api/rss-sources/:id - Success Response (204 No Content)

**Status Code:** `204 No Content`

**Content-Type:** None (empty response body)

---

### Error Responses

#### 400 Bad Request - Validation Error

**Scenario:** Invalid request body or query parameters

**Status Code:** `400 Bad Request`

**Response Body:**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "url",
      "message": "Invalid URL format"
    }
  ],
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**Common Validation Errors:**

- Missing required fields (POST)
- Invalid UUID format (path parameters)
- Invalid URL format
- Name too long (> 500 characters)
- URL too long (> 2000 characters)
- Invalid limit/offset values

#### 401 Unauthorized - Authentication/Authorization Error

**Scenario:** Not authenticated or not service role

**Status Code:** `401 Unauthorized`

**Response Body:**

```json
{
  "error": "Service role required for this endpoint",
  "code": "FORBIDDEN",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### 404 Not Found - Resource Not Found

**Scenario:** RSS source does not exist

**Status Code:** `404 Not Found`

**Response Body:**

```json
{
  "error": "RSS source not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### 409 Conflict - Duplicate Resource

**Scenario:** RSS source with this URL already exists

**Status Code:** `409 Conflict`

**Response Body:**

```json
{
  "error": "RSS source with this URL already exists",
  "code": "DUPLICATE_URL",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### 500 Internal Server Error

**Scenario:** Unexpected server errors, database connection failures

**Status Code:** `500 Internal Server Error`

**Response Body:**

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

---

## 5. Data Flow

### GET /api/rss-sources Flow

```
┌──────────────┐
│    Client    │
└──────┬───────┘
       │ GET /api/rss-sources?limit=20&offset=0
       ▼
┌──────────────────────────────────────────────────────────┐
│              Astro API Route Handler                     │
│  (src/pages/api/rss-sources/index.ts)                   │
├──────────────────────────────────────────────────────────┤
│  1. Extract query parameters from URL                   │
│  2. Validate query parameters with Zod schema           │
│  3. No authentication required (public access)          │
└──────┬───────────────────────────────────────────────────┘
       │ Valid request
       ▼
┌──────────────────────────────────────────────────────────┐
│           RssSourceService.getRssSources()               │
│  (src/lib/services/rss-source.service.ts)              │
├──────────────────────────────────────────────────────────┤
│  4. Build Supabase query                                 │
│  5. Apply pagination (limit, offset)                    │
│  6. Execute query with count for total                  │
└──────┬───────────────────────────────────────────────────┘
       │ Database results
       ▼
┌──────────────────────────────────────────────────────────┐
│                    Supabase Database                      │
│                   (PostgreSQL + RLS)                      │
├──────────────────────────────────────────────────────────┤
│  Query executes:                                         │
│  - SELECT * FROM app.rss_sources                         │
│  - ORDER BY created_at DESC                             │
│  - LIMIT 20 OFFSET 0                                    │
│                                                           │
│  RLS Policy Applied:                                    │
│  - RSS sources are viewable by everyone                  │
└──────┬───────────────────────────────────────────────────┘
       │ Raw database rows
       ▼
┌──────────────────────────────────────────────────────────┐
│        RssSourceService.mapToDto()                       │
│  (Data transformation layer)                              │
├──────────────────────────────────────────────────────────┤
│  7. Convert snake_case to camelCase                     │
│  8. Calculate pagination metadata (hasMore)            │
└──────┬───────────────────────────────────────────────────┘
       │ RssSourceListResponse
       ▼
┌──────────────────────────────────────────────────────────┐
│              API Route Handler (Response)                │
├──────────────────────────────────────────────────────────┤
│  9. Return JSON response with 200 OK                    │
│ 10. Set Content-Type: application/json header            │
└──────┬───────────────────────────────────────────────────┘
       │ HTTP Response
       ▼
┌──────────────┐
│    Client    │
└──────────────┘
```

### POST /api/rss-sources Flow

```
┌──────────────┐
│    Client    │
└──────┬───────┘
       │ POST /api/rss-sources
       │ Authorization: Bearer <service_role_token>
       │ Body: { name, url }
       ▼
┌──────────────────────────────────────────────────────────┐
│              Astro API Route Handler                     │
│  (src/pages/api/rss-sources/index.ts)                   │
├──────────────────────────────────────────────────────────┤
│  1. Extract request body                                 │
│  2. Validate authentication (service_role required)     │
│  3. Validate request body with Zod schema               │
└──────┬───────────────────────────────────────────────────┘
       │ Valid request
       ▼
┌──────────────────────────────────────────────────────────┐
│        RssSourceService.createRssSource()               │
│  (src/lib/services/rss-source.service.ts)              │
├──────────────────────────────────────────────────────────┤
│  4. Check if URL already exists (unique constraint)      │
│  5. Insert new RSS source into database                 │
│  6. Handle unique constraint violation (409 Conflict)     │
└──────┬───────────────────────────────────────────────────┘
       │ Database result
       ▼
┌──────────────────────────────────────────────────────────┐
│                    Supabase Database                      │
│                   (PostgreSQL + RLS)                      │
├──────────────────────────────────────────────────────────┤
│  INSERT INTO app.rss_sources (name, url)                │
│  VALUES ($1, $2)                                         │
│                                                           │
│  RLS Policy Applied:                                    │
│  - Service role can manage RSS sources                   │
│  - Unique constraint on url enforced                    │
└──────┬───────────────────────────────────────────────────┘
       │ Created entity
       ▼
┌──────────────────────────────────────────────────────────┐
│        RssSourceService.mapToDto()                       │
│  (Data transformation layer)                              │
├──────────────────────────────────────────────────────────┤
│  7. Convert snake_case to camelCase                     │
└──────┬───────────────────────────────────────────────────┘
       │ RssSourceDto
       ▼
┌──────────────────────────────────────────────────────────┐
│              API Route Handler (Response)                │
├──────────────────────────────────────────────────────────┤
│  8. Return JSON response with 201 Created               │
│  9. Set Content-Type: application/json header            │
└──────┬───────────────────────────────────────────────────┘
       │ HTTP Response
       ▼
┌──────────────┐
│    Client    │
└──────────────┘
```

### PATCH /api/rss-sources/:id Flow

Similar to POST flow, but:

- Validates source exists first (404 if not found)
- Performs UPDATE instead of INSERT
- Checks URL uniqueness only if URL is being updated
- Returns 200 OK instead of 201 Created

### DELETE /api/rss-sources/:id Flow

```
┌──────────────┐
│    Client    │
└──────┬───────┘
       │ DELETE /api/rss-sources/:id
       │ Authorization: Bearer <service_role_token>
       ▼
┌──────────────────────────────────────────────────────────┐
│              Astro API Route Handler                     │
│  (src/pages/api/rss-sources/[id].ts)                   │
├──────────────────────────────────────────────────────────┤
│  1. Extract id from path parameters                      │
│  2. Validate authentication (service_role required)     │
│  3. Validate id is valid UUID                            │
└──────┬───────────────────────────────────────────────────┘
       │ Valid request
       ▼
┌──────────────────────────────────────────────────────────┐
│        RssSourceService.deleteRssSource()               │
│  (src/lib/services/rss-source.service.ts)              │
├──────────────────────────────────────────────────────────┤
│  4. Verify source exists (404 if not found)              │
│  5. Delete RSS source from database                      │
│  6. CASCADE automatically deletes associated articles    │
└──────┬───────────────────────────────────────────────────┘
       │ Database result
       ▼
┌──────────────────────────────────────────────────────────┐
│                    Supabase Database                      │
│                   (PostgreSQL + RLS)                      │
├──────────────────────────────────────────────────────────┤
│  DELETE FROM app.rss_sources WHERE id = $1              │
│                                                           │
│  CASCADE:                                                │
│  - Automatically deletes from app.articles               │
│  - Automatically deletes from app.article_topics         │
│                                                           │
│  RLS Policy Applied:                                    │
│  - Service role can manage RSS sources                   │
└──────┬───────────────────────────────────────────────────┘
       │ Success
       ▼
┌──────────────────────────────────────────────────────────┐
│              API Route Handler (Response)                │
├──────────────────────────────────────────────────────────┤
│  7. Return 204 No Content (empty response)              │
└──────┬───────────────────────────────────────────────────┘
       │ HTTP Response
       ▼
┌──────────────┐
│    Client    │
└──────────────┘
```

---

## 6. Security Considerations

### Authentication & Authorization

**Public Read Access:**

- GET endpoints are publicly accessible (no authentication required)
- RLS policy: `CREATE POLICY "RSS sources are viewable by everyone" ON app.rss_sources FOR SELECT USING (true)`
- This aligns with the goal of providing RSS source information to all users

**Service Role Write Access:**

- POST, PATCH, DELETE endpoints require service_role authentication
- Middleware extracts user from `Authorization: Bearer <token>` header
- Route handler checks: `user.role === 'service_role'`
- If not service role → 401 Unauthorized
- Regular users and guests MUST NOT have access to write operations

**RLS Policies in Effect:**

```sql
-- RSS Sources: Public read access
ALTER TABLE app.rss_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RSS sources are viewable by everyone"
ON app.rss_sources FOR SELECT USING (true);

-- RSS Sources: Service role write access
CREATE POLICY "Service role can manage RSS sources"
ON app.rss_sources FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
```

### Input Validation & Sanitization

**Request Body Validation (Zod Schema):**

1. **Type Validation:**
   - `name`: String, required (POST), optional (PATCH), min length 1, max length 500
   - `url`: String, required (POST), optional (PATCH), valid URL format, max length 2000

2. **Format Validation:**
   - `url`: Valid URL format using Zod URL validation
   - `id` (path parameter): UUID format validation

3. **Business Logic Validation:**
   - URL uniqueness check before INSERT/UPDATE
   - At least one field required for PATCH requests

4. **SQL Injection Prevention:**
   - All database operations use Supabase SDK with parameterized queries
   - Never construct raw SQL with user input
   - Supabase automatically sanitizes inputs

5. **XSS Prevention:**
   - API returns JSON (not HTML), so XSS risk is minimal
   - Client applications must sanitize when rendering HTML
   - RSS source names and URLs are stored as-is (from trusted admin sources)

### Data Exposure & Privacy

**What is Exposed:**

- RSS sources are public data (predefined list)
- Source names and URLs are visible to all users
- No sensitive user data in RSS sources

**What is Protected:**

- Write operations require service role (admin/system processes only)
- URL uniqueness prevents duplicate sources
- Cascade deletion ensures data integrity

### Rate Limiting & Abuse Prevention

**MVP Approach:**

- No explicit rate limiting implemented in MVP
- Abuse mitigation through:
  - Max limit of 100 sources per request (prevents excessive data transfer)
  - Database query timeout (Supabase default: 60 seconds)
  - Astro request timeout (platform-dependent)

**Future Enhancements:**

- Implement rate limiting middleware (e.g., 100 requests per minute per IP for GET)
- Add request throttling for service role operations (e.g., 50 requests per minute per service)
- Monitor for abuse patterns (excessive pagination, repeated queries)
- Consider caching frequently accessed source lists (CDN or Redis)

### URL Validation Security

**URL Validation:**

- Validate URL format using Zod URL validator
- Maximum length enforced (2000 characters)
- No protocol whitelist (accepts http://, https://, feed://, etc.)
- No domain validation (allows any domain)

**Potential Abuse:**

- Malicious URLs could be stored (but only by service role, which is trusted)
- Client applications should validate URLs before fetching RSS feeds
- Consider adding URL validation in RSS fetching cron job

---

## 7. Error Handling

### Error Scenarios & Response Codes

| Error Scenario               | Status Code | Error Code              | Description                               |
| ---------------------------- | ----------- | ----------------------- | ----------------------------------------- |
| Invalid `limit` value        | 400         | VALIDATION_ERROR        | Limit must be integer between 1 and 100   |
| Invalid `offset` value       | 400         | VALIDATION_ERROR        | Offset must be non-negative integer       |
| Invalid `id` UUID format     | 400         | VALIDATION_ERROR        | Must be valid UUID format                 |
| Missing `name` (POST)        | 400         | VALIDATION_ERROR        | Name is required                          |
| Missing `url` (POST)         | 400         | VALIDATION_ERROR        | URL is required                           |
| Invalid URL format           | 400         | VALIDATION_ERROR        | Must be valid URL format                  |
| Name too long (> 500)        | 400         | VALIDATION_ERROR        | Name exceeds maximum length               |
| URL too long (> 2000)        | 400         | VALIDATION_ERROR        | URL exceeds maximum length                |
| No fields provided (PATCH)   | 400         | VALIDATION_ERROR        | At least one field must be provided       |
| Not authenticated            | 401         | AUTHENTICATION_REQUIRED | Valid token required                      |
| Not service role             | 401         | FORBIDDEN               | Service role required for this endpoint   |
| Source not found (GET by ID) | 404         | NOT_FOUND               | RSS source does not exist                 |
| Source not found (PATCH)     | 404         | NOT_FOUND               | RSS source does not exist                 |
| Source not found (DELETE)    | 404         | NOT_FOUND               | RSS source does not exist                 |
| URL already exists (POST)    | 409         | DUPLICATE_URL           | RSS source with this URL already exists   |
| URL already exists (PATCH)   | 409         | DUPLICATE_URL           | RSS source with this URL already exists   |
| Database connection error    | 500         | DATABASE_ERROR          | Database unavailable or connection failed |
| Unexpected error             | 500         | INTERNAL_ERROR          | Unhandled exception occurred              |

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

### Error Handling Implementation

**1. Validation Errors (Zod):**

```typescript
try {
  const validatedBody = CreateRssSourceCommandSchema.parse(body);
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
if (!user) {
  return new Response(
    JSON.stringify({
      error: "Authentication required",
      code: "AUTHENTICATION_REQUIRED",
      timestamp: new Date().toISOString(),
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

if (user.role !== "service_role") {
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
const source = await rssSourceService.getRssSourceById(id);
if (!source) {
  return new Response(
    JSON.stringify({
      error: "RSS source not found",
      code: "NOT_FOUND",
      timestamp: new Date().toISOString(),
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

**4. Conflict Errors (Duplicate URL):**

```typescript
try {
  const source = await rssSourceService.createRssSource(command);
  // ... success handling
} catch (error) {
  if (error instanceof Error && error.message === "DUPLICATE_URL") {
    return new Response(
      JSON.stringify({
        error: "RSS source with this URL already exists",
        code: "DUPLICATE_URL",
        timestamp: new Date().toISOString(),
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    );
  }
  throw error;
}
```

**5. Database Errors:**

```typescript
try {
  const result = await rssSourceService.getRssSources(params);
  // ... success handling
} catch (error) {
  logger.error("Failed to fetch RSS sources", error, {
    endpoint: "GET /api/rss-sources",
    params,
  });

  return new Response(
    JSON.stringify({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Logging Strategy

**Success Logging:**

```typescript
logger.info("RSS sources fetched successfully", {
  endpoint: "GET /api/rss-sources",
  resultCount: result.data.length,
  totalCount: result.pagination.total,
  userId: user?.id || "anonymous",
});
```

**Error Logging:**

```typescript
logger.error("Failed to create RSS source", error, {
  endpoint: "POST /api/rss-sources",
  command,
  userId: user?.id,
  errorCode: error instanceof Error ? error.message : "UNKNOWN",
});
```

**Debug Logging (Development Only):**

```typescript
logger.debug("Query constructed", {
  endpoint: "GET /api/rss-sources",
  query: queryDetails,
});
```

---

## 8. Performance Considerations

### Database Query Optimization

**Indexes Used:**

- No explicit indexes needed for RSS sources table (small dataset expected)
- Primary key index on `id` (automatic)
- Unique index on `url` (automatic from UNIQUE constraint)

**Query Performance:**

- Base query (no filters): ~30ms for 50 sources
- With pagination: ~35ms (minimal overhead)
- Single source lookup by ID: ~20ms (primary key lookup)

**Optimization Strategies:**

1. **Pagination:**
   - Use offset-based pagination (simple for MVP)
   - RSS sources table expected to be small (< 100 sources), so pagination overhead is minimal
   - Future: Consider removing pagination if dataset remains small

2. **Count Query:**
   - Use Supabase `.select('*', { count: 'exact' })` for total count
   - Count query runs in parallel with data query
   - Trade-off: Adds ~10ms overhead, but necessary for pagination UI

3. **Caching:**
   - RSS sources change infrequently (only when admin adds/removes sources)
   - Good candidate for caching (TTL: 5-10 minutes)
   - Cache invalidation on POST/PATCH/DELETE

### Caching Strategy

**MVP: No Caching**

- Simple implementation
- Fresh data for every request
- Acceptable for initial traffic levels

**Future Enhancements:**

1. **HTTP Caching Headers:**

   ```typescript
   Response.headers.set("Cache-Control", "public, max-age=300");
   ```

   - Cache sources for 5 minutes (reasonable freshness)
   - Reduces server load for repeated requests

2. **CDN Caching:**
   - Cache GET endpoints at CDN edge (Cloudflare, Fastly)
   - Invalidate on POST/PATCH/DELETE operations

3. **Redis Caching:**
   - Cache RSS sources list in Redis
   - Cache key: `rss-sources:list:limit:{n}:offset:{m}`
   - TTL: 5 minutes
   - Invalidate on write operations

### Database Connection Pooling

**Supabase Handling:**

- Supabase uses PgBouncer for connection pooling
- Default: 15 connections per client
- Pooling is transparent to application

**Astro Considerations:**

- Each request creates new Supabase client in middleware
- Clients are lightweight (reuse connection pool)
- No need to implement custom pooling

### Performance Monitoring

**Metrics to Track:**

1. Response time (p50, p95, p99)
2. Database query time
3. Sources per request (average)
4. Error rate by type
5. Cache hit rate (when caching implemented)

**Performance Targets:**

- p95 latency: < 200ms (GET endpoints)
- p95 latency: < 300ms (POST/PATCH/DELETE endpoints)
- Database query time: < 50ms
- Error rate: < 0.1%

---

## 9. Implementation Steps

### Step 1: Create Validation Schemas

**File:** `src/lib/validation/rss-source.schema.ts`

Create Zod schemas for validating RSS source requests.

```typescript
import { z } from "zod";

/**
 * Validation schema for POST /api/rss-sources request body.
 */
export const CreateRssSourceCommandSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(1, { message: "Name cannot be empty" })
    .max(500, { message: "Name must not exceed 500 characters" }),

  url: z
    .string({ required_error: "URL is required" })
    .url({ message: "Invalid URL format" })
    .max(2000, { message: "URL must not exceed 2000 characters" }),
});

/**
 * Validation schema for PATCH /api/rss-sources/:id request body.
 * All fields are optional, but at least one must be provided.
 */
export const UpdateRssSourceCommandSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Name cannot be empty" })
      .max(500, { message: "Name must not exceed 500 characters" })
      .optional(),

    url: z
      .string()
      .url({ message: "Invalid URL format" })
      .max(2000, { message: "URL must not exceed 2000 characters" })
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.url !== undefined, {
    message: "At least one field (name or url) must be provided",
  });

/**
 * Validation schema for GET /api/rss-sources query parameters.
 */
export const GetRssSourcesQueryParamsSchema = z.object({
  limit: z
    .string()
    .optional()
    .default("50")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int({ message: "Limit must be an integer" })
        .min(1, { message: "Limit must be at least 1" })
        .max(100, { message: "Limit must not exceed 100" })
    ),

  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int({ message: "Offset must be an integer" }).min(0, { message: "Offset must be non-negative" })),
});

/**
 * Validation schema for UUID path parameters.
 */
export const UuidParamSchema = z.string().uuid({ message: "Invalid UUID format" });

/**
 * TypeScript types inferred from validation schemas.
 */
export type CreateRssSourceCommandValidated = z.infer<typeof CreateRssSourceCommandSchema>;
export type UpdateRssSourceCommandValidated = z.infer<typeof UpdateRssSourceCommandSchema>;
export type GetRssSourcesQueryParamsValidated = z.infer<typeof GetRssSourcesQueryParamsSchema>;
```

**Tasks:**

- Create file with Zod schemas
- Handle string-to-number coercion for limit and offset
- Provide default values in schema
- Export schemas and inferred types
- Test schemas with various valid and invalid inputs

---

### Step 2: Create RSS Source Service

**File:** `src/lib/services/rss-source.service.ts`

Create a new service class for RSS source operations.

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type {
  RssSourceEntity,
  RssSourceDto,
  RssSourceListResponse,
  CreateRssSourceCommand,
  UpdateRssSourceCommand,
  GetRssSourcesQueryParams,
} from "@/types";

export class RssSourceService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Fetches a paginated list of RSS sources.
   *
   * @param params - Query parameters for pagination
   * @returns RssSourceListResponse with sources and pagination metadata
   */
  async getRssSources(params: GetRssSourcesQueryParams): Promise<RssSourceListResponse> {
    const query = this.supabase
      .schema("app")
      .from("rss_sources")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    const sources = (data || []).map((source) => this.mapToDto(source));

    return {
      data: sources,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count || 0,
        hasMore: params.offset + params.limit < (count || 0),
      },
    };
  }

  /**
   * Fetches a single RSS source by ID.
   *
   * @param id - UUID of the RSS source
   * @returns RssSourceDto if found, null otherwise
   */
  async getRssSourceById(id: string): Promise<RssSourceDto | null> {
    const { data, error } = await this.supabase.schema("app").from("rss_sources").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data ? this.mapToDto(data) : null;
  }

  /**
   * Creates a new RSS source.
   *
   * @param command - Create command with name and url
   * @returns Created RssSourceDto
   * @throws Error with message 'DUPLICATE_URL' if URL already exists
   */
  async createRssSource(command: CreateRssSourceCommand): Promise<RssSourceDto> {
    // Check if URL already exists
    const existing = await this.findByUrl(command.url);
    if (existing) {
      throw new Error("DUPLICATE_URL");
    }

    const { data, error } = await this.supabase
      .schema("app")
      .from("rss_sources")
      .insert({
        name: command.name,
        url: command.url,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        throw new Error("DUPLICATE_URL");
      }
      throw error;
    }

    return this.mapToDto(data);
  }

  /**
   * Updates an existing RSS source.
   *
   * @param id - UUID of the RSS source to update
   * @param command - Update command with optional name and url
   * @returns Updated RssSourceDto
   * @throws Error with message 'NOT_FOUND' if source does not exist
   * @throws Error with message 'DUPLICATE_URL' if URL already exists
   */
  async updateRssSource(id: string, command: UpdateRssSourceCommand): Promise<RssSourceDto> {
    // Verify source exists
    const existing = await this.getRssSourceById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    // Check URL uniqueness if URL is being updated
    if (command.url && command.url !== existing.url) {
      const urlExists = await this.findByUrl(command.url);
      if (urlExists) {
        throw new Error("DUPLICATE_URL");
      }
    }

    const updateData: Record<string, unknown> = {};
    if (command.name !== undefined) {
      updateData.name = command.name;
    }
    if (command.url !== undefined) {
      updateData.url = command.url;
    }

    const { data, error } = await this.supabase
      .schema("app")
      .from("rss_sources")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        throw new Error("DUPLICATE_URL");
      }
      throw error;
    }

    return this.mapToDto(data);
  }

  /**
   * Deletes an RSS source and all associated articles (CASCADE).
   *
   * @param id - UUID of the RSS source to delete
   * @throws Error with message 'NOT_FOUND' if source does not exist
   */
  async deleteRssSource(id: string): Promise<void> {
    // Verify source exists
    const existing = await this.getRssSourceById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const { error } = await this.supabase.schema("app").from("rss_sources").delete().eq("id", id);

    if (error) {
      throw error;
    }
  }

  /**
   * Finds an RSS source by URL.
   *
   * @param url - URL to search for
   * @returns RssSourceDto if found, null otherwise
   */
  private async findByUrl(url: string): Promise<RssSourceDto | null> {
    const { data, error } = await this.supabase.schema("app").from("rss_sources").select("*").eq("url", url).single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data ? this.mapToDto(data) : null;
  }

  /**
   * Maps database row (snake_case) to DTO (camelCase).
   */
  private mapToDto(row: any): RssSourceDto {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

**Tasks:**

- Create service class with all CRUD methods
- Implement pagination logic
- Handle unique constraint violations
- Map database rows to DTOs
- Add error handling for not found cases
- Write unit tests for each method

---

### Step 3: Implement API Route Handlers

**File:** `src/pages/api/rss-sources/index.ts`

Create route handlers for GET and POST endpoints.

```typescript
import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { RssSourceService } from "@/lib/services/rss-source.service";
import { CreateRssSourceCommandSchema, GetRssSourcesQueryParamsSchema } from "@/lib/validation/rss-source.schema";
import { logger } from "@/lib/logger";

export const prerender = false;

/**
 * GET /api/rss-sources
 * Retrieves a paginated list of RSS sources.
 *
 * Authentication: Optional (public access)
 *
 * @returns 200 OK with RssSourceListResponse on success
 * @returns 400 Bad Request for validation errors
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  try {
    // Extract query parameters from URL
    const url = new URL(context.request.url);
    const queryParams = {
      limit: url.searchParams.get("limit") || undefined,
      offset: url.searchParams.get("offset") || undefined,
    };

    // Validate query parameters
    let validatedParams;
    try {
      validatedParams = GetRssSourcesQueryParamsSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Query parameter validation failed", {
          endpoint: "GET /api/rss-sources",
          errors: error.errors,
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Fetch RSS sources using service
    const rssSourceService = new RssSourceService(supabase);
    const result = await rssSourceService.getRssSources(validatedParams);

    // Log success
    logger.info("RSS sources fetched successfully", {
      endpoint: "GET /api/rss-sources",
      resultCount: result.data.length,
      totalCount: result.pagination.total,
    });

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to fetch RSS sources", error, {
      endpoint: "GET /api/rss-sources",
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * POST /api/rss-sources
 * Creates a new RSS source (service role only).
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 201 Created with RssSourceDto on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 409 Conflict if RSS source with URL already exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Check authentication
  if (!user) {
    logger.warn("POST /api/rss-sources called without authentication", {
      endpoint: "POST /api/rss-sources",
    });

    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check authorization (service role only)
  if (user.role !== "service_role") {
    logger.warn("POST /api/rss-sources called without service role", {
      endpoint: "POST /api/rss-sources",
      userId: (user as { id?: string }).id,
    });

    return new Response(
      JSON.stringify({
        error: "Service role required for this endpoint",
        code: "FORBIDDEN",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn("Invalid JSON in request body", {
          endpoint: "POST /api/rss-sources",
          error: error.message,
        });

        return new Response(
          JSON.stringify({
            error: "Invalid JSON in request body",
            code: "INVALID_JSON",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Validate request body
    let command;
    try {
      command = CreateRssSourceCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request body validation failed", {
          endpoint: "POST /api/rss-sources",
          errors: error.errors,
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Create RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    const source = await rssSourceService.createRssSource(command);

    // Log success
    logger.info("RSS source created successfully", {
      endpoint: "POST /api/rss-sources",
      sourceId: source.id,
      userId: (user as { id?: string }).id,
    });

    // Return success response
    return new Response(JSON.stringify(source), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Duplicate URL error
      if (error.message === "DUPLICATE_URL") {
        logger.warn("RSS source creation failed: duplicate URL", {
          endpoint: "POST /api/rss-sources",
          userId: (user as { id?: string }).id,
        });

        return new Response(
          JSON.stringify({
            error: "RSS source with this URL already exists",
            code: "DUPLICATE_URL",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to create RSS source", error, {
      endpoint: "POST /api/rss-sources",
      userId: (user as { id?: string }).id,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

**File:** `src/pages/api/rss-sources/[id].ts`

Create route handlers for GET by ID, PATCH, and DELETE endpoints.

```typescript
import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { RssSourceService } from "@/lib/services/rss-source.service";
import { UpdateRssSourceCommandSchema, UuidParamSchema } from "@/lib/validation/rss-source.schema";
import { logger } from "@/lib/logger";

export const prerender = false;

/**
 * GET /api/rss-sources/:id
 * Retrieves a single RSS source by ID.
 *
 * Authentication: Optional (public access)
 *
 * @returns 200 OK with RssSourceDto on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 404 Not Found if RSS source does not exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const id = context.params.id;

  try {
    // Validate UUID format
    let validatedId: string;
    try {
      validatedId = UuidParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Invalid UUID format in path parameter", {
          endpoint: "GET /api/rss-sources/:id",
          id,
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: "id",
              message: e.message,
            })),
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Fetch RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    const source = await rssSourceService.getRssSourceById(validatedId);

    if (!source) {
      return new Response(
        JSON.stringify({
          error: "RSS source not found",
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log success
    logger.info("RSS source fetched successfully", {
      endpoint: "GET /api/rss-sources/:id",
      sourceId: source.id,
    });

    // Return success response
    return new Response(JSON.stringify(source), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to fetch RSS source", error, {
      endpoint: "GET /api/rss-sources/:id",
      id,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * PATCH /api/rss-sources/:id
 * Updates an existing RSS source (service role only).
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 200 OK with updated RssSourceDto on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 404 Not Found if RSS source does not exist
 * @returns 409 Conflict if RSS source with URL already exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const PATCH: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;
  const id = context.params.id;

  // Check authentication
  if (!user) {
    logger.warn("PATCH /api/rss-sources/:id called without authentication", {
      endpoint: "PATCH /api/rss-sources/:id",
      id,
    });

    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check authorization (service role only)
  if (user.role !== "service_role") {
    logger.warn("PATCH /api/rss-sources/:id called without service role", {
      endpoint: "PATCH /api/rss-sources/:id",
      id,
      userId: (user as { id?: string }).id,
    });

    return new Response(
      JSON.stringify({
        error: "Service role required for this endpoint",
        code: "FORBIDDEN",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Validate UUID format
    let validatedId: string;
    try {
      validatedId = UuidParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: "id",
              message: e.message,
            })),
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Parse request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON in request body",
            code: "INVALID_JSON",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Validate request body
    let command;
    try {
      command = UpdateRssSourceCommandSchema.parse(body);
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
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Update RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    const source = await rssSourceService.updateRssSource(validatedId, command);

    // Log success
    logger.info("RSS source updated successfully", {
      endpoint: "PATCH /api/rss-sources/:id",
      sourceId: source.id,
      userId: (user as { id?: string }).id,
    });

    // Return success response
    return new Response(JSON.stringify(source), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Not found error
      if (error.message === "NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "RSS source not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Duplicate URL error
      if (error.message === "DUPLICATE_URL") {
        return new Response(
          JSON.stringify({
            error: "RSS source with this URL already exists",
            code: "DUPLICATE_URL",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to update RSS source", error, {
      endpoint: "PATCH /api/rss-sources/:id",
      id,
      userId: (user as { id?: string }).id,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/rss-sources/:id
 * Deletes an RSS source and all associated articles (service role only).
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 204 No Content on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 404 Not Found if RSS source does not exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;
  const id = context.params.id;

  // Check authentication
  if (!user) {
    logger.warn("DELETE /api/rss-sources/:id called without authentication", {
      endpoint: "DELETE /api/rss-sources/:id",
      id,
    });

    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check authorization (service role only)
  if (user.role !== "service_role") {
    logger.warn("DELETE /api/rss-sources/:id called without service role", {
      endpoint: "DELETE /api/rss-sources/:id",
      id,
      userId: (user as { id?: string }).id,
    });

    return new Response(
      JSON.stringify({
        error: "Service role required for this endpoint",
        code: "FORBIDDEN",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Validate UUID format
    let validatedId: string;
    try {
      validatedId = UuidParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: "id",
              message: e.message,
            })),
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Delete RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    await rssSourceService.deleteRssSource(validatedId);

    // Log success
    logger.info("RSS source deleted successfully", {
      endpoint: "DELETE /api/rss-sources/:id",
      sourceId: validatedId,
      userId: (user as { id?: string }).id,
    });

    // Return success response (204 No Content)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Not found error
      if (error.message === "NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "RSS source not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to delete RSS source", error, {
      endpoint: "DELETE /api/rss-sources/:id",
      id,
      userId: (user as { id?: string }).id,
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
```

**Tasks:**

- Create route handler files
- Implement GET handler for list endpoint
- Implement GET handler for single source endpoint
- Implement POST handler
- Implement PATCH handler
- Implement DELETE handler
- Add authentication/authorization checks
- Add input validation
- Handle errors with appropriate status codes
- Add structured logging
- Test endpoints with various scenarios

---

### Step 4: Create Unit Tests

**File:** `src/lib/services/__tests__/rss-source.service.test.ts`

Create unit tests for RssSourceService methods.

**File:** `src/pages/api/rss-sources/__tests__/index.test.ts`

Create integration tests for GET and POST endpoints.

**File:** `src/pages/api/rss-sources/__tests__/[id].test.ts`

Create integration tests for GET by ID, PATCH, and DELETE endpoints.

**Tasks:**

- Create test files
- Write unit tests for service methods
- Write integration tests for API endpoints
- Mock Supabase client for unit tests
- Use test database for integration tests
- Aim for >80% code coverage

---

### Step 5: Manual Testing

Perform manual testing with various scenarios:

**Test Cases:**

1. **GET /api/rss-sources (basic):**

   ```bash
   curl "http://localhost:3000/api/rss-sources?limit=10&offset=0"
   ```

2. **GET /api/rss-sources/:id (success):**

   ```bash
   curl "http://localhost:3000/api/rss-sources/<uuid>"
   ```

3. **GET /api/rss-sources/:id (not found):**

   ```bash
   curl "http://localhost:3000/api/rss-sources/00000000-0000-0000-0000-000000000000"
   ```

4. **POST /api/rss-sources (success):**

   ```bash
   curl -X POST "http://localhost:3000/api/rss-sources" \
     -H "Authorization: Bearer <service_role_token>" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Source", "url": "https://example.com/rss"}'
   ```

5. **POST /api/rss-sources (duplicate URL):**

   ```bash
   curl -X POST "http://localhost:3000/api/rss-sources" \
     -H "Authorization: Bearer <service_role_token>" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Source 2", "url": "https://example.com/rss"}'
   ```

6. **PATCH /api/rss-sources/:id (success):**

   ```bash
   curl -X PATCH "http://localhost:3000/api/rss-sources/<uuid>" \
     -H "Authorization: Bearer <service_role_token>" \
     -H "Content-Type: application/json" \
     -d '{"name": "Updated Name"}'
   ```

7. **DELETE /api/rss-sources/:id (success):**
   ```bash
   curl -X DELETE "http://localhost:3000/api/rss-sources/<uuid>" \
     -H "Authorization: Bearer <service_role_token>"
   ```

**Tasks:**

- Execute all test cases
- Verify response structures
- Verify status codes
- Verify error messages
- Test edge cases
- Measure response times

---

## Summary

This implementation plan provides a comprehensive guide for implementing the RSS sources endpoints with the following key features:

✅ **Public Read Access:** RSS sources are readable by everyone, including guests  
✅ **Service Role Write Access:** Write operations require service role authentication  
✅ **Pagination Support:** List endpoint supports limit and offset pagination  
✅ **URL Uniqueness:** Prevents duplicate RSS feed sources  
✅ **Cascade Deletion:** Automatically deletes associated articles when source is deleted  
✅ **Comprehensive Validation:** All inputs validated with Zod schemas  
✅ **Error Handling:** Detailed error responses with appropriate status codes  
✅ **Security:** RLS policies, input validation, authentication checks  
✅ **Performance:** Optimized database queries  
✅ **Logging:** Structured logging for monitoring and debugging

**Estimated Implementation Time:** 6-8 hours (including testing and documentation)

**Dependencies:**

- Existing middleware (no changes needed)
- Database schema (already implemented)
- Type definitions (already implemented)

**Follow-Up Tasks:**

- Implement frontend integration
- Add caching layer (future enhancement)
- Add URL validation in RSS fetching cron job
- Monitor RSS source usage metrics
