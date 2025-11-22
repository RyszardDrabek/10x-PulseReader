# REST API Plan - PulseReader

## 1. Overview

This REST API plan is designed for PulseReader, an intelligent news aggregator that provides personalized content filtering based on user mood, topics, and blocklists. The API follows RESTful conventions and is built on Astro with Supabase as the backend service.

### Base URL

```
/api
```

### API Version

Version 1.0 (no versioning in URL for MVP)

## 2. Resources

| Resource    | Database Table    | Description                                                                    |
| ----------- | ----------------- | ------------------------------------------------------------------------------ |
| Articles    | `app.articles`    | News articles fetched from RSS sources with AI-generated sentiment and topics  |
| Profile     | `app.profiles`    | User preferences including mood and blocklist (1-to-1 with authenticated user) |
| RSS Sources | `app.rss_sources` | Predefined RSS feed sources                                                    |
| Topics      | `app.topics`      | AI-generated topics for article categorization                                 |

## 3. Endpoints

### 3.1 Articles

#### GET /api/articles

Retrieves a paginated list of articles with optional filtering.

**Authentication:** Optional (guests can view, authenticated users get personalized filtering)

**Query Parameters:**

- `limit` (integer, default: 20, max: 100): Number of articles per page
- `offset` (integer, default: 0): Pagination offset
- `sentiment` (string, optional): Filter by sentiment ('positive', 'neutral', 'negative')
- `topicId` (UUID, optional): Filter by topic ID
- `sourceId` (UUID, optional): Filter by RSS source ID
- `applyPersonalization` (boolean, default: false): Apply authenticated user's preferences (mood and blocklist)
- `sortBy` (string, default: 'publication_date'): Sort field
- `sortOrder` (string, default: 'desc'): Sort order ('asc' or 'desc')

**Request Payload:** None

**Response Payload (200 OK):**

```json
{
  "data": [
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
        },
        {
          "id": "uuid",
          "name": "politics"
        }
      ],
      "createdAt": "2025-11-15T10:35:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  },
  "filtersApplied": {
    "sentiment": "positive",
    "personalization": true,
    "blockedItemsCount": 5
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid query parameters
  ```json
  {
    "error": "Invalid sentiment value. Must be one of: positive, neutral, negative"
  }
  ```
- `401 Unauthorized`: applyPersonalization=true but user not authenticated
  ```json
  {
    "error": "Authentication required for personalized filtering"
  }
  ```

#### GET /api/articles/:id

Retrieves a single article by ID.

**Authentication:** Optional

**Path Parameters:**

- `id` (UUID, required): Article ID

**Response Payload (200 OK):**

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
    "error": "Article not found"
  }
  ```

#### POST /api/articles (Service Role Only)

Creates a new article (used by RSS fetching cron job).

**Authentication:** Required (service_role)

**Request Payload:**

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

**Response Payload (201 Created):**

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
    "details": ["title is required", "link must be a valid URL"]
  }
  ```
- `401 Unauthorized`: Not authenticated as service_role
- `409 Conflict`: Article with this link already exists
  ```json
  {
    "error": "Article with this link already exists"
  }
  ```

#### PATCH /api/articles/:id (Service Role Only)

Updates an article (used to add AI analysis results).

**Authentication:** Required (service_role)

**Path Parameters:**

- `id` (UUID, required): Article ID

**Request Payload:**

```json
{
  "sentiment": "neutral",
  "topicIds": ["uuid1", "uuid2"]
}
```

**Response Payload (200 OK):**

```json
{
  "id": "uuid",
  "sentiment": "neutral",
  "updatedAt": "2025-11-15T11:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid sentiment value
- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: Article does not exist

#### DELETE /api/articles/:id (Service Role Only)

Deletes an article (primarily used by retention policy cron job).

**Authentication:** Required (service_role)

**Path Parameters:**

- `id` (UUID, required): Article ID

**Response Payload (204 No Content)**

**Error Responses:**

- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: Article does not exist

### 3.2 Profile

#### GET /api/profile

Retrieves the authenticated user's profile and preferences.

**Authentication:** Required

**Response Payload (200 OK):**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "mood": "positive",
  "blocklist": ["covid", "election", "tabloid.com"],
  "createdAt": "2025-11-10T08:00:00Z",
  "updatedAt": "2025-11-15T09:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
  ```json
  {
    "error": "Authentication required"
  }
  ```
- `404 Not Found`: Profile not created yet (should auto-create)
  ```json
  {
    "error": "Profile not found"
  }
  ```

#### POST /api/profile

Creates a profile for the authenticated user (automatically called after registration if not exists).

**Authentication:** Required

**Request Payload:**

```json
{
  "mood": "neutral",
  "blocklist": []
}
```

**Response Payload (201 Created):**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "mood": "neutral",
  "blocklist": [],
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `409 Conflict`: Profile already exists
  ```json
  {
    "error": "Profile already exists for this user"
  }
  ```

#### PATCH /api/profile

Updates the authenticated user's profile preferences.

**Authentication:** Required

**Request Payload:**

```json
{
  "mood": "positive",
  "blocklist": ["covid", "election", "tabloid.com"]
}
```

**Response Payload (200 OK):**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "mood": "positive",
  "blocklist": ["covid", "election", "tabloid.com"],
  "updatedAt": "2025-11-15T10:30:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid mood value
  ```json
  {
    "error": "Invalid mood value. Must be one of: positive, neutral, negative, or null"
  }
  ```
- `401 Unauthorized`: Not authenticated

#### DELETE /api/profile

Deletes the authenticated user's profile.

**Authentication:** Required

**Response Payload (204 No Content)**

**Error Responses:**

- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Profile does not exist

### 3.3 RSS Sources

#### GET /api/rss-sources

Retrieves all RSS sources.

**Authentication:** Optional

**Query Parameters:**

- `limit` (integer, default: 50, max: 100): Number of sources per page
- `offset` (integer, default: 0): Pagination offset

**Response Payload (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "BBC News - World",
      "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
      "createdAt": "2025-11-01T00:00:00Z",
      "updatedAt": "2025-11-01T00:00:00Z"
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

#### GET /api/rss-sources/:id

Retrieves a single RSS source by ID.

**Authentication:** Optional

**Path Parameters:**

- `id` (UUID, required): RSS source ID

**Response Payload (200 OK):**

```json
{
  "id": "uuid",
  "name": "BBC News - World",
  "url": "http://feeds.bbci.co.uk/news/world/rss.xml",
  "createdAt": "2025-11-01T00:00:00Z",
  "updatedAt": "2025-11-01T00:00:00Z"
}
```

**Error Responses:**

- `404 Not Found`: RSS source does not exist

#### POST /api/rss-sources (Service Role Only)

Creates a new RSS source.

**Authentication:** Required (service_role)

**Request Payload:**

```json
{
  "name": "The Guardian - World",
  "url": "https://www.theguardian.com/world/rss"
}
```

**Response Payload (201 Created):**

```json
{
  "id": "uuid",
  "name": "The Guardian - World",
  "url": "https://www.theguardian.com/world/rss",
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Validation error
- `401 Unauthorized`: Not authenticated as service_role
- `409 Conflict`: RSS source with this URL already exists
  ```json
  {
    "error": "RSS source with this URL already exists"
  }
  ```

#### PATCH /api/rss-sources/:id (Service Role Only)

Updates an RSS source.

**Authentication:** Required (service_role)

**Path Parameters:**

- `id` (UUID, required): RSS source ID

**Request Payload:**

```json
{
  "name": "The Guardian - World News",
  "url": "https://www.theguardian.com/world/rss"
}
```

**Response Payload (200 OK):**

```json
{
  "id": "uuid",
  "name": "The Guardian - World News",
  "url": "https://www.theguardian.com/world/rss",
  "updatedAt": "2025-11-15T11:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Validation error
- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: RSS source does not exist

#### DELETE /api/rss-sources/:id (Service Role Only)

Deletes an RSS source and all associated articles (CASCADE).

**Authentication:** Required (service_role)

**Path Parameters:**

- `id` (UUID, required): RSS source ID

**Response Payload (204 No Content)**

**Error Responses:**

- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: RSS source does not exist

### 3.4 Topics

#### GET /api/topics

Retrieves all topics with optional filtering.

**Authentication:** Optional

**Query Parameters:**

- `limit` (integer, default: 100, max: 500): Number of topics per page
- `offset` (integer, default: 0): Pagination offset
- `search` (string, optional): Case-insensitive search by topic name

**Response Payload (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "technology",
      "createdAt": "2025-11-10T00:00:00Z",
      "updatedAt": "2025-11-10T00:00:00Z"
    },
    {
      "id": "uuid",
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

#### GET /api/topics/:id

Retrieves a single topic by ID.

**Authentication:** Optional

**Path Parameters:**

- `id` (UUID, required): Topic ID

**Response Payload (200 OK):**

```json
{
  "id": "uuid",
  "name": "technology",
  "createdAt": "2025-11-10T00:00:00Z",
  "updatedAt": "2025-11-10T00:00:00Z"
}
```

**Error Responses:**

- `404 Not Found`: Topic does not exist

#### POST /api/topics (Service Role Only)

Creates a new topic or returns existing one if name already exists (case-insensitive).

**Authentication:** Required (service_role)

**Request Payload:**

```json
{
  "name": "climate change"
}
```

**Response Payload (201 Created or 200 OK if exists):**

```json
{
  "id": "uuid",
  "name": "climate change",
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Name is required or invalid
  ```json
  {
    "error": "Topic name is required"
  }
  ```
- `401 Unauthorized`: Not authenticated as service_role

#### DELETE /api/topics/:id (Service Role Only)

Deletes a topic (CASCADE removes article_topics associations).

**Authentication:** Required (service_role)

**Path Parameters:**

- `id` (UUID, required): Topic ID

**Response Payload (204 No Content)**

**Error Responses:**

- `401 Unauthorized`: Not authenticated as service_role
- `404 Not Found`: Topic does not exist

## 4. Authentication and Authorization

### 4.1 Authentication Mechanism

PulseReader uses **Supabase Auth** for user authentication. The API expects JWT tokens issued by Supabase Auth.

#### Authentication Flow:

1. **Registration and Login** are handled by Supabase Auth SDK on the frontend
2. Client receives JWT token from Supabase Auth
3. Client includes token in API requests via `Authorization` header
4. API middleware validates token using Supabase client
5. API checks user permissions based on token claims

#### Token Format:

```
Authorization: Bearer <supabase_jwt_token>
```

### 4.2 Authorization Levels

#### Guest (No Authentication)

- Read-only access to articles (GET /api/articles)
- Read-only access to RSS sources (GET /api/rss-sources)
- Read-only access to topics (GET /api/topics)

#### Authenticated User

- All guest permissions
- Full access to own profile (GET/POST/PATCH/DELETE /api/profile)
- Personalized article filtering (GET /api/articles?applyPersonalization=true)

#### Service Role (Backend Jobs)

- Full CRUD access to all resources
- Used by:
  - RSS fetching cron job
  - AI analysis job
  - Data retention cleanup job

### 4.3 Row-Level Security (RLS)

All database operations respect Supabase RLS policies:

- **profiles**: Users can only access their own profile (enforced by `auth.uid() = user_id`)
- **articles**: Public read, service_role write
- **rss_sources**: Public read, service_role write
- **topics**: Public read, service_role write
- **article_topics**: Public read, service_role write

### 4.4 Token Validation

API middleware validates tokens by:

1. Extracting token from Authorization header
2. Verifying token signature using Supabase client
3. Checking token expiration
4. Extracting user ID and role from token claims
5. Setting user context for RLS enforcement

## 5. Validation and Business Logic

### 5.1 Validation Rules by Resource

#### Articles

- `title`: Required, string, max 1000 characters
- `link`: Required, valid URL, unique across all articles
- `publicationDate`: Required, valid ISO 8601 datetime
- `sourceId`: Required, valid UUID, must reference existing RSS source
- `sentiment`: Optional, must be one of: 'positive', 'neutral', 'negative'
- `description`: Optional, string, max 5000 characters
- `topicIds`: Optional, array of valid UUIDs

#### Profile

- `mood`: Optional (nullable), must be one of: 'positive', 'neutral', 'negative'
- `blocklist`: Optional, array of strings, each max 500 characters, max 1000 items
- Auto-creation: If profile doesn't exist for user, automatically create with defaults

#### RSS Sources

- `name`: Required, string, max 200 characters
- `url`: Required, valid URL, unique across all sources

#### Topics

- `name`: Required, string, max 100 characters, case-insensitive unique (enforced by DB index)

### 5.2 Business Logic Implementation

#### Personalized Article Filtering

When `applyPersonalization=true` is set:

1. **Mood Filtering**:
   - Retrieve user's mood preference from profile
   - If mood is set (not null), filter articles where `sentiment = user.mood`
   - If mood is null, no sentiment filtering is applied

2. **Blocklist Filtering**:
   - Retrieve user's blocklist from profile
   - For each blocked item:
     - Check if item appears in article title (case-insensitive)
     - Check if item appears in article description (case-insensitive)
     - Check if item appears in article link URL
   - Exclude any article matching any blocked item

3. **Filter Application Order**:
   - Apply database-level filters first (sentiment, sourceId, topicId)
   - Apply blocklist filtering at application level or via database function
   - Sort by publication_date DESC
   - Apply pagination

#### Article Deduplication

- Enforced by unique constraint on `link` field
- When cron job attempts to insert duplicate article:
  - Return 409 Conflict
  - Job logs duplicate and continues with next article

#### Automatic Profile Creation

- Trigger on first access to GET /api/profile after user registration
- Create profile with default values:
  ```json
  {
    "mood": null,
    "blocklist": []
  }
  ```
- Return created profile to client

#### Data Retention

- Automated by pg_cron job (not exposed via API)
- Runs daily at 2:00 AM
- Deletes articles where `publication_date < now() - INTERVAL '30 days'`
- Cascade delete removes associated article_topics records

#### Topic Management

- Topics are created dynamically by AI analysis job
- Use upsert logic: if topic name exists (case-insensitive), return existing ID
- Prevents duplicate topics with different casing

### 5.3 Error Handling

#### Standard Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  },
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### Common Error Codes

- `AUTHENTICATION_REQUIRED`: 401, user must be authenticated
- `FORBIDDEN`: 403, user lacks permission for this action
- `NOT_FOUND`: 404, requested resource doesn't exist
- `VALIDATION_ERROR`: 400, request payload validation failed
- `CONFLICT`: 409, resource already exists (unique constraint violation)
- `INTERNAL_ERROR`: 500, unexpected server error

### 5.4 Rate Limiting

**MVP Implementation:**

- No rate limiting for MVP
- Supabase connection pooling handles basic load management

**Future Considerations:**

- Implement rate limiting per user/IP
- Suggested limits:
  - Anonymous users: 100 requests/hour
  - Authenticated users: 1000 requests/hour
  - Service role: unlimited

## 6. Additional API Features

### 6.1 Pagination

All list endpoints support offset-based pagination:

**Request Parameters:**

- `limit`: Number of items per page (default varies by resource)
- `offset`: Number of items to skip

**Response Format:**

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

### 6.2 Sorting

List endpoints support sorting via query parameters:

**Request Parameters:**

- `sortBy`: Field name to sort by
- `sortOrder`: 'asc' or 'desc'

**Default Sorting:**

- Articles: `publication_date DESC`
- RSS Sources: `name ASC`
- Topics: `name ASC`

### 6.3 Filtering

Articles endpoint supports multiple filters:

- `sentiment`: Filter by article sentiment
- `topicId`: Filter by topic ID
- `sourceId`: Filter by RSS source ID
- `applyPersonalization`: Apply user's mood and blocklist

Filters can be combined (AND logic).

### 6.4 CORS Configuration

- Allow all origins for MVP (since it's a public news reader)
- Credentials: Include (for Supabase Auth cookies/tokens)
- Methods: GET, POST, PATCH, DELETE, OPTIONS
- Headers: Authorization, Content-Type

### 6.5 Content Type

- Request: `application/json`
- Response: `application/json`
- Character encoding: UTF-8

## 7. Implementation Notes

### 7.1 Astro API Routes

Endpoints are implemented as Astro API routes in `src/pages/api/`:

```
src/pages/api/
├── articles/
│   ├── index.ts          # GET /api/articles, POST /api/articles
│   └── [id].ts           # GET/PATCH/DELETE /api/articles/:id
├── profile/
│   └── index.ts          # GET/POST/PATCH/DELETE /api/profile
├── rss-sources/
│   ├── index.ts          # GET /api/rss-sources, POST /api/rss-sources
│   └── [id].ts           # GET/PATCH/DELETE /api/rss-sources/:id
└── topics/
    ├── index.ts          # GET /api/topics, POST /api/topics
    └── [id].ts           # GET/DELETE /api/topics/:id
```

### 7.2 Middleware

Astro middleware (`src/middleware/index.ts`) handles:

- JWT token validation
- User context extraction
- RLS context setting for Supabase client
- Request logging
- Error handling

### 7.3 Supabase Client Configuration

Two client types:

1. **Anonymous Client**: For public read operations
2. **Authenticated Client**: Uses user's JWT token for RLS enforcement
3. **Service Role Client**: Uses service_role key for backend jobs

### 7.4 Type Safety

All API endpoints use shared types from `src/types.ts`:

- Request DTOs
- Response DTOs
- Entity types matching database schema from `src/db/database.types.ts`

## 8. Future Enhancements

### 8.1 Not in MVP

The following features are documented for future consideration:

- **GraphQL API**: For more flexible querying
- **Webhooks**: Notify external services of new articles
- **Bulk Operations**: Batch create/update/delete
- **Search**: Full-text search across articles
- **Analytics**: Usage statistics and metrics
- **Export**: Export filtered articles to various formats
- **Caching**: Redis layer for frequently accessed data
- **Real-time**: WebSocket support for live article updates

### 8.2 API Versioning Strategy

When breaking changes are needed:

- Introduce versioned endpoints: `/api/v2/articles`
- Maintain v1 for deprecation period (6 months)
- Document migration path in API changelog

## 9. Testing Considerations

### 9.1 Test Coverage

Each endpoint should have tests for:

- Happy path (successful operation)
- Authentication/authorization failures
- Validation errors
- Not found scenarios
- Conflict scenarios (duplicates)
- Edge cases (empty results, pagination boundaries)

### 9.2 Test Data

Use separate test database with:

- Sample RSS sources
- Sample articles with various sentiments
- Test users with different preference configurations
- Various topics for filtering tests

### 9.3 Integration Testing

Test complete user flows:

- Guest browsing articles
- User registration → profile creation → preference setting → filtered browsing
- Service role article ingestion → AI analysis → user viewing

## 10. Documentation

### 10.1 OpenAPI Specification

Generate OpenAPI 3.0 spec for:

- Interactive API documentation (Swagger UI)
- Client SDK generation
- API testing tools

### 10.2 Example Requests

Provide curl examples for each endpoint:

```bash
# Get articles as guest
curl https://api.pulsereader.com/api/articles?limit=10

# Get personalized articles
curl -H "Authorization: Bearer <token>" \
  "https://api.pulsereader.com/api/articles?applyPersonalization=true"

# Update user mood
curl -X PATCH \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mood": "positive"}' \
  https://api.pulsereader.com/api/profile
```

## 11. Monitoring and Observability

### 11.1 Logging

Log the following for each request:

- Timestamp
- HTTP method and path
- User ID (if authenticated)
- Response status code
- Response time
- Error details (if applicable)

### 11.2 Metrics

Track:

- Request rate per endpoint
- Response time percentiles (p50, p95, p99)
- Error rate by status code
- Authentication success/failure rate
- Database query performance

### 11.3 Alerts

Set up alerts for:

- Error rate > 5%
- Response time p95 > 2 seconds
- Authentication failures spike
- Database connection issues
