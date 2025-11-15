# API Endpoint Implementation Plan: GET /api/articles

## 1. Endpoint Overview

The `GET /api/articles` endpoint retrieves a paginated list of news articles with optional filtering, sorting, and personalization capabilities. This endpoint serves as the primary data source for the article feed in the PulseReader application.

**Key Features:**
- Public access (no authentication required for basic listing)
- Optional personalization for authenticated users (mood-based filtering and blocklist application)
- Flexible filtering by sentiment, topic, and RSS source
- Configurable sorting and pagination
- Returns articles with nested source and topics for complete data representation

**Primary Use Cases:**
1. Guest users browsing recent articles
2. Authenticated users viewing personalized article feeds
3. Frontend components fetching filtered article lists by topic or sentiment
4. Mobile/web clients implementing infinite scroll pagination

**Response Time Target:** < 300ms p95 latency for typical queries (20 articles, no personalization)

---

## 2. Request Details

### HTTP Method
`GET`

### URL Structure
```
GET /api/articles
```

### Query Parameters

All query parameters are optional with sensible defaults:

| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `limit` | integer | 20 | Min: 1, Max: 100 | Number of articles per page |
| `offset` | integer | 0 | Min: 0 | Pagination offset for cursor-based pagination |
| `sentiment` | string | - | Enum: 'positive', 'neutral', 'negative' | Filter articles by sentiment |
| `topicId` | string (UUID) | - | Valid UUID format | Filter articles by topic ID |
| `sourceId` | string (UUID) | - | Valid UUID format | Filter articles by RSS source ID |
| `applyPersonalization` | boolean | false | Boolean | Apply authenticated user's mood and blocklist preferences |
| `sortBy` | string | 'publication_date' | Enum: 'publication_date', 'created_at' | Field to sort by |
| `sortOrder` | string | 'desc' | Enum: 'asc', 'desc' | Sort order direction |

### Authentication
- **Optional:** The endpoint is publicly accessible
- **Authentication Header:** `Authorization: Bearer <token>` (optional)
- **Personalization Requirement:** If `applyPersonalization=true`, user must be authenticated (401 if not)

### Request Body
None (GET request)

### Example Requests

**Basic request (guest user):**
```http
GET /api/articles?limit=20&offset=0
```

**Filtered by sentiment:**
```http
GET /api/articles?sentiment=positive&limit=20
```

**Filtered by topic:**
```http
GET /api/articles?topicId=550e8400-e29b-41d4-a716-446655440000&limit=20
```

**Personalized for authenticated user:**
```http
GET /api/articles?applyPersonalization=true&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Complex query with multiple filters:**
```http
GET /api/articles?sentiment=positive&sourceId=550e8400-e29b-41d4-a716-446655440000&sortBy=publication_date&sortOrder=desc&limit=50&offset=0
```

---

## 3. Used Types

The following types from `src/types.ts` are used in this implementation:

### Query Parameters Type
```typescript
GetArticlesQueryParams {
  limit?: number;
  offset?: number;
  sentiment?: ArticleSentiment;
  topicId?: string;
  sourceId?: string;
  applyPersonalization?: boolean;
  sortBy?: "publication_date" | "created_at";
  sortOrder?: "asc" | "desc";
}
```

### Response DTOs
```typescript
ArticleDto {
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

ArticleSourceDto {
  id: string;
  name: string;
  url: string;
}

ArticleTopicDto {
  id: string;
  name: string;
}

ArticleListResponse {
  data: ArticleDto[];
  pagination: PaginationMetadata;
  filtersApplied?: ArticleFiltersApplied;
}

PaginationMetadata {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

ArticleFiltersApplied {
  sentiment?: ArticleSentiment;
  personalization?: boolean;
  blockedItemsCount?: number;
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

### Entity Types (Internal Use)
```typescript
ArticleEntity {
  id: string;
  sourceId: string;
  title: string;
  description: string | null;
  link: string;
  publicationDate: string;
  sentiment: ArticleSentiment | null;
  createdAt: string;
  updatedAt: string;
}

ProfileEntity {
  id: string;
  userId: string;
  mood: UserMood | null;
  blocklist: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Response Details

### Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Breaking: New AI Breakthrough in Natural Language Processing",
      "description": "Researchers announce significant improvements in language model efficiency...",
      "link": "https://example.com/articles/ai-breakthrough-2025",
      "publicationDate": "2025-11-15T10:30:00Z",
      "sentiment": "positive",
      "source": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "BBC News - World",
        "url": "http://feeds.bbci.co.uk/news/world/rss.xml"
      },
      "topics": [
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "name": "technology"
        },
        {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "name": "artificial intelligence"
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

**Response Fields:**

- `data` (array): Array of article DTOs with nested source and topics
- `pagination` (object): Pagination metadata
  - `limit`: Number of items per page (as requested)
  - `offset`: Current offset (as requested)
  - `total`: Total number of articles matching filters
  - `hasMore`: Boolean indicating if more results are available
- `filtersApplied` (object, optional): Metadata about applied filters
  - `sentiment`: The sentiment filter applied (if any)
  - `personalization`: Whether personalization was applied
  - `blockedItemsCount`: Number of articles blocked by user preferences (if personalization applied)

### Error Responses

#### 400 Bad Request - Invalid Query Parameters

**Scenario:** Query parameter validation fails

**Status Code:** `400 Bad Request`

**Response Body:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be between 1 and 100"
    },
    {
      "field": "sentiment",
      "message": "Sentiment must be one of: positive, neutral, negative"
    }
  ],
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**Common Validation Errors:**
- Invalid `limit` (not an integer, < 1, > 100)
- Invalid `offset` (not an integer, < 0)
- Invalid `sentiment` (not in enum: positive, neutral, negative)
- Invalid `topicId` (not a valid UUID)
- Invalid `sourceId` (not a valid UUID)
- Invalid `sortBy` (not in enum: publication_date, created_at)
- Invalid `sortOrder` (not in enum: asc, desc)

#### 401 Unauthorized - Personalization Without Authentication

**Scenario:** `applyPersonalization=true` but no valid authentication token provided

**Status Code:** `401 Unauthorized`

**Response Body:**
```json
{
  "error": "Authentication required for personalized filtering",
  "code": "AUTHENTICATION_REQUIRED",
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

**Note:** Error details are logged server-side but not exposed to clients for security reasons.

---

## 5. Data Flow

### High-Level Flow Diagram

```
┌──────────────┐
│    Client    │
└──────┬───────┘
       │ GET /api/articles?limit=20&sentiment=positive
       ▼
┌──────────────────────────────────────────────────────────┐
│                  Astro API Route Handler                  │
│  (src/pages/api/articles/index.ts)                       │
├──────────────────────────────────────────────────────────┤
│  1. Extract query parameters from URL                    │
│  2. Validate query parameters with Zod schema            │
│  3. Check authentication if applyPersonalization=true    │
│  4. Extract user context from middleware                 │
└──────┬───────────────────────────────────────────────────┘
       │ Valid request
       ▼
┌──────────────────────────────────────────────────────────┐
│              ArticleService.getArticles()                │
│  (src/lib/services/article.service.ts)                   │
├──────────────────────────────────────────────────────────┤
│  5. Build base Supabase query                            │
│  6. Apply filters (sentiment, topicId, sourceId)         │
│  7. Apply personalization (if requested)                 │
│     ├─ Fetch user profile (mood, blocklist)              │
│     ├─ Filter by mood-matching sentiment                 │
│     └─ Exclude articles matching blocklist               │
│  8. Apply sorting (sortBy, sortOrder)                    │
│  9. Apply pagination (limit, offset)                     │
│ 10. Execute query with count for total                   │
└──────┬───────────────────────────────────────────────────┘
       │ Database results
       ▼
┌──────────────────────────────────────────────────────────┐
│                    Supabase Database                      │
│                   (PostgreSQL + RLS)                      │
├──────────────────────────────────────────────────────────┤
│  Query executes with JOINs:                              │
│  - app.articles                                          │
│  - app.rss_sources (for source data)                     │
│  - app.article_topics → app.topics (for topics)          │
│                                                           │
│  RLS Policies Applied:                                   │
│  - Articles are viewable by everyone (SELECT = true)     │
└──────┬───────────────────────────────────────────────────┘
       │ Raw database rows
       ▼
┌──────────────────────────────────────────────────────────┐
│           ArticleService.mapToDto()                      │
│  (Data transformation layer)                              │
├──────────────────────────────────────────────────────────┤
│ 11. Convert snake_case to camelCase                      │
│ 12. Nest source and topics in ArticleDto structure       │
│ 13. Calculate pagination metadata (hasMore)              │
│ 14. Build filtersApplied metadata                        │
└──────┬───────────────────────────────────────────────────┘
       │ ArticleListResponse
       ▼
┌──────────────────────────────────────────────────────────┐
│              API Route Handler (Response)                │
├──────────────────────────────────────────────────────────┤
│ 15. Return JSON response with 200 OK                     │
│ 16. Set Content-Type: application/json header            │
└──────┬───────────────────────────────────────────────────┘
       │ HTTP Response
       ▼
┌──────────────┐
│    Client    │
└──────────────┘
```

### Detailed Query Construction

#### Base Query (No Filters)
```typescript
const query = supabase
  .schema('app')
  .from('articles')
  .select(`
    *,
    source:rss_sources(id, name, url),
    topics:article_topics(topic:topics(id, name))
  `);
```

#### With Sentiment Filter
```typescript
query = query.eq('sentiment', sentiment);
```

#### With Topic Filter
```typescript
query = query.in('id', 
  supabase
    .schema('app')
    .from('article_topics')
    .select('article_id')
    .eq('topic_id', topicId)
);
```

#### With Source Filter
```typescript
query = query.eq('source_id', sourceId);
```

#### With Personalization (Mood-Based Filtering)
```typescript
// Fetch user profile
const profile = await getProfileByUserId(userId);

// If user has mood preference, filter by matching sentiment
if (profile.mood) {
  query = query.eq('sentiment', profile.mood);
}

// Apply blocklist (filter out articles with blocklisted keywords or URLs)
if (profile.blocklist.length > 0) {
  // Filter in application layer after fetching results
  // (More flexible than SQL for partial string matching)
}
```

#### Apply Sorting and Pagination
```typescript
query = query
  .order(sortBy, { ascending: sortOrder === 'asc' })
  .range(offset, offset + limit - 1);
```

#### Execute with Count
```typescript
const { data, count, error } = await query;
```

### Personalization Filtering Details

**Blocklist Matching Logic:**
1. Fetch articles from database (with sentiment filter if mood is set)
2. For each article, check if title, description, or link contains any blocklist term
3. Filter out matching articles
4. Count blocked articles for `blockedItemsCount` metadata
5. Return remaining articles up to requested limit

**Performance Consideration:** Blocklist filtering in application layer requires fetching more articles than requested to account for filtered-out items. Fetch `limit * 2` initially, then filter and slice to requested limit.

---

## 6. Security Considerations

### Authentication & Authorization

**Public Access Policy:**
- Articles are publicly readable (no authentication required for basic listing)
- RLS policy: `CREATE POLICY "Articles are viewable by everyone" ON app.articles FOR SELECT USING (true)`
- This aligns with the goal of providing news to all users

**Personalization Access Control:**
- `applyPersonalization=true` requires valid authentication token
- Middleware extracts user from `Authorization: Bearer <token>` header
- If personalization requested but no valid user → 401 Unauthorized
- User can only access their own profile (RLS enforced on app.profiles)

**RLS Policies in Effect:**
```sql
-- Articles: Public read access
ALTER TABLE app.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles are viewable by everyone"
ON app.articles FOR SELECT USING (true);

-- Profiles: User can only view their own profile
ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"
ON app.profiles FOR SELECT USING (auth.uid() = user_id);

-- RSS Sources: Public read access
ALTER TABLE app.rss_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RSS sources are viewable by everyone"
ON app.rss_sources FOR SELECT USING (true);

-- Topics: Public read access
ALTER TABLE app.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics are viewable by everyone"
ON app.topics FOR SELECT USING (true);
```

### Input Validation & Sanitization

**Query Parameter Validation (Zod Schema):**

All query parameters are validated before processing:

1. **Type Validation:**
   - `limit`: Coerced to integer, validated in range [1, 100]
   - `offset`: Coerced to integer, validated ≥ 0
   - `applyPersonalization`: Coerced to boolean

2. **Format Validation:**
   - `topicId`: UUID format validation
   - `sourceId`: UUID format validation
   - `sentiment`: Enum validation (positive, neutral, negative)
   - `sortBy`: Enum validation (publication_date, created_at)
   - `sortOrder`: Enum validation (asc, desc)

3. **SQL Injection Prevention:**
   - All database operations use Supabase SDK with parameterized queries
   - Never construct raw SQL with user input
   - Supabase automatically sanitizes inputs

4. **XSS Prevention:**
   - API returns JSON (not HTML), so XSS risk is minimal
   - Client applications must sanitize when rendering HTML
   - No user-generated content in article data (all from RSS feeds)

### Data Exposure & Privacy

**What is Exposed:**
- Articles are public data (from RSS feeds)
- RSS sources are public (predefined list)
- Topics are public (AI-generated categorization)

**What is Protected:**
- User profiles are private (RLS enforced)
- User blocklists are never exposed in API responses
- `filtersApplied.blockedItemsCount` is provided, but not the actual blocked articles

**Personalization Privacy:**
- When personalization is applied, only the requesting user's preferences are used
- Other users cannot see what was filtered for a specific user
- No cross-user data leakage

### Rate Limiting & Abuse Prevention

**MVP Approach:**
- No explicit rate limiting implemented in MVP
- Abuse mitigation through:
  - Max limit of 100 articles per request (prevents excessive data transfer)
  - Database query timeout (Supabase default: 60 seconds)
  - Astro request timeout (platform-dependent)

**Future Enhancements:**
- Implement rate limiting middleware (e.g., 100 requests per minute per IP)
- Add request throttling for authenticated users (e.g., 300 requests per minute per user)
- Monitor for abuse patterns (excessive pagination, repeated queries)
- Consider caching frequently accessed queries (CDN or Redis)

### Blocklist Security

**Blocklist Handling:**
- Blocklist terms are case-insensitive (converted to lowercase for matching)
- Partial string matching (substring match in title, description, link)
- No regex or special character interpretation (prevents ReDoS attacks)
- Maximum blocklist size enforced at profile level (e.g., 1000 terms)

**Potential Abuse:**
- User could add many generic terms to blocklist (e.g., "the", "and")
- Result: Most articles filtered out, but only affects that user
- Not a security issue, just poor user experience for that user

---

## 7. Error Handling

### Error Scenarios & Response Codes

| Error Scenario | Status Code | Error Code | Description |
|----------------|-------------|------------|-------------|
| Invalid `limit` value | 400 | VALIDATION_ERROR | Limit must be integer between 1 and 100 |
| Invalid `offset` value | 400 | VALIDATION_ERROR | Offset must be non-negative integer |
| Invalid `sentiment` enum | 400 | VALIDATION_ERROR | Must be 'positive', 'neutral', or 'negative' |
| Invalid `topicId` UUID | 400 | VALIDATION_ERROR | Must be valid UUID format |
| Invalid `sourceId` UUID | 400 | VALIDATION_ERROR | Must be valid UUID format |
| Invalid `sortBy` enum | 400 | VALIDATION_ERROR | Must be 'publication_date' or 'created_at' |
| Invalid `sortOrder` enum | 400 | VALIDATION_ERROR | Must be 'asc' or 'desc' |
| Personalization without auth | 401 | AUTHENTICATION_REQUIRED | Valid token required for personalization |
| Database connection error | 500 | DATABASE_ERROR | Database unavailable or connection failed |
| Profile fetch error (personalization) | 500 | PROFILE_FETCH_ERROR | Failed to fetch user profile for personalization |
| Unexpected error | 500 | INTERNAL_ERROR | Unhandled exception occurred |

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
  const validatedParams = GetArticlesQueryParamsSchema.parse(queryParams);
} catch (error) {
  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        })),
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**2. Authentication Errors:**

```typescript
if (params.applyPersonalization && !context.locals.user) {
  return new Response(
    JSON.stringify({
      error: "Authentication required for personalized filtering",
      code: "AUTHENTICATION_REQUIRED",
      timestamp: new Date().toISOString()
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**3. Database Errors:**

```typescript
try {
  const result = await articleService.getArticles(params);
  // ... success handling
} catch (error) {
  logger.error("Failed to fetch articles", error, {
    endpoint: "GET /api/articles",
    params
  });
  
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString()
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**4. Specific Business Logic Errors:**

```typescript
// In ArticleService
if (applyPersonalization && userId) {
  const profile = await this.getProfile(userId);
  if (!profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }
}

// In API route handler
if (error instanceof Error && error.message === 'PROFILE_NOT_FOUND') {
  logger.error("User profile not found", error, { userId: context.locals.user.id });
  return new Response(
    JSON.stringify({
      error: "User profile not found. Please complete your profile setup.",
      code: "PROFILE_NOT_FOUND",
      timestamp: new Date().toISOString()
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Logging Strategy

**Success Logging:**
```typescript
logger.info("Articles fetched successfully", {
  endpoint: "GET /api/articles",
  resultCount: result.data.length,
  totalCount: result.pagination.total,
  filtersApplied: result.filtersApplied,
  userId: context.locals.user?.id || "anonymous"
});
```

**Error Logging:**
```typescript
logger.error("Failed to fetch articles", error, {
  endpoint: "GET /api/articles",
  params,
  userId: context.locals.user?.id || "anonymous",
  errorCode: error instanceof Error ? error.message : "UNKNOWN"
});
```

**Debug Logging (Development Only):**
```typescript
logger.debug("Query constructed", {
  endpoint: "GET /api/articles",
  query: queryDetails,
  personalization: params.applyPersonalization
});
```

---

## 8. Performance Considerations

### Database Query Optimization

**Indexes Used:**
- `idx_articles_publication_date` (DESC) - Fast sorting by publication date
- `idx_articles_sentiment` (partial index) - Fast filtering by sentiment
- `idx_articles_source_id` - Fast filtering by source
- `idx_article_topics_article_id` - Fast JOIN with topics
- `idx_article_topics_topic_id` - Fast filtering by topic

**Query Performance:**
- Base query (no filters): ~50ms for 20 articles
- With sentiment filter: ~60ms (uses partial index)
- With topic filter: ~80ms (JOIN + subquery)
- With source filter: ~55ms (indexed foreign key)
- With personalization: +50-100ms (profile fetch + blocklist filtering)

**Optimization Strategies:**

1. **Pagination:**
   - Use offset-based pagination (simple for MVP)
   - Future: Consider cursor-based pagination for better performance at large offsets

2. **Eager Loading:**
   - Fetch source and topics in single query with JOINs
   - Avoid N+1 query problem

3. **Count Query:**
   - Use Supabase `.select('*', { count: 'exact' })` for total count
   - Count query runs in parallel with data query
   - Trade-off: Adds ~20ms overhead, but necessary for pagination UI

4. **Topic Aggregation:**
   - Supabase automatically aggregates topics into array
   - No need for manual grouping in application layer

### Personalization Performance

**Challenge:** Blocklist filtering requires application-layer processing

**Solution:** Over-fetch and filter

1. Calculate fetch limit: `fetchLimit = requestedLimit * 2`
2. Fetch `fetchLimit` articles from database
3. Apply blocklist filtering in application
4. Take first `requestedLimit` articles after filtering
5. If after filtering < `requestedLimit`, fetch next batch recursively (max 3 iterations)

**Example:**
```typescript
// User requests 20 articles, has 50 blocklist terms
// 1. Fetch 40 articles from DB
// 2. Filter out 15 matching blocklist → 25 remain
// 3. Take first 20 articles
// 4. Return to client
```

**Trade-off:** More database data transferred, but provides accurate pagination

**Alternative (Future):** Implement blocklist filtering at database level using PostgreSQL text search or array operators

### Caching Strategy

**MVP: No Caching**
- Simple implementation
- Fresh data for every request
- Acceptable for initial traffic levels

**Future Enhancements:**

1. **HTTP Caching Headers:**
   ```typescript
   Response.headers.set('Cache-Control', 'public, max-age=60');
   ```
   - Cache articles for 60 seconds (reasonable freshness)
   - Reduces server load for repeated requests

2. **CDN Caching:**
   - Cache popular queries at CDN edge (Cloudflare, Fastly)
   - Vary by query parameters: sentiment, topicId, sourceId
   - Don't cache personalized requests (Vary: Authorization)

3. **Redis Caching:**
   - Cache frequently accessed article lists
   - Cache key: `articles:sentiment:{value}:topic:{id}:offset:{n}:limit:{m}`
   - TTL: 2-5 minutes
   - Invalidate on new article insertion

4. **Profile Caching:**
   - Cache user profiles in memory or Redis
   - Reduces profile fetch overhead for personalization
   - Invalidate on profile update

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
3. Articles per request (average)
4. Personalization usage percentage
5. Error rate by type
6. Blocked items count (for personalized requests)

**Performance Targets:**
- p95 latency: < 300ms (no personalization)
- p95 latency: < 500ms (with personalization)
- Database query time: < 150ms
- Error rate: < 0.1%

---

## 9. Implementation Steps

### Step 1: Create Validation Schema

**File:** `src/lib/validation/article-query.schema.ts`

Create a Zod schema for validating GET /api/articles query parameters.

```typescript
import { z } from 'zod';

/**
 * Validation schema for GET /api/articles query parameters.
 * All parameters are optional with defaults applied in the API handler.
 */
export const GetArticlesQueryParamsSchema = z.object({
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(val => parseInt(val, 10))
    .pipe(
      z.number()
        .int({ message: 'Limit must be an integer' })
        .min(1, { message: 'Limit must be at least 1' })
        .max(100, { message: 'Limit must not exceed 100' })
    ),
  
  offset: z
    .string()
    .optional()
    .default('0')
    .transform(val => parseInt(val, 10))
    .pipe(
      z.number()
        .int({ message: 'Offset must be an integer' })
        .min(0, { message: 'Offset must be non-negative' })
    ),
  
  sentiment: z
    .enum(['positive', 'neutral', 'negative'], {
      errorMap: () => ({ message: 'Sentiment must be one of: positive, neutral, negative' })
    })
    .optional(),
  
  topicId: z
    .string()
    .uuid({ message: 'Invalid UUID format for topicId' })
    .optional(),
  
  sourceId: z
    .string()
    .uuid({ message: 'Invalid UUID format for sourceId' })
    .optional(),
  
  applyPersonalization: z
    .string()
    .optional()
    .default('false')
    .transform(val => val === 'true')
    .pipe(z.boolean()),
  
  sortBy: z
    .enum(['publication_date', 'created_at'], {
      errorMap: () => ({ message: 'sortBy must be one of: publication_date, created_at' })
    })
    .optional()
    .default('publication_date'),
  
  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'sortOrder must be one of: asc, desc' })
    })
    .optional()
    .default('desc')
});

/**
 * TypeScript type inferred from the validation schema.
 */
export type GetArticlesQueryParamsValidated = z.infer<typeof GetArticlesQueryParamsSchema>;
```

**Tasks:**
- Create file with Zod schema
- Handle string-to-number coercion for limit and offset (URL query params are strings)
- Handle string-to-boolean coercion for applyPersonalization
- Provide default values in schema
- Export schema and inferred type
- Test schema with various valid and invalid inputs

---

### Step 2: Extend Article Service

**File:** `src/lib/services/article.service.ts` (extend existing service)

Add methods to the existing ArticleService for fetching articles with filters and personalization.

```typescript
// Add these methods to the existing ArticleService class

/**
 * Fetches a paginated list of articles with optional filters and personalization.
 * 
 * @param params - Query parameters for filtering, sorting, and pagination
 * @param userId - Optional authenticated user ID for personalization
 * @returns ArticleListResponse with articles, pagination, and filters applied metadata
 */
async getArticles(
  params: GetArticlesQueryParams,
  userId?: string
): Promise<ArticleListResponse> {
  // Build base query
  let query = this.supabase
    .schema('app')
    .from('articles')
    .select(`
      *,
      source:rss_sources(id, name, url),
      article_topics(
        topics(id, name)
      )
    `, { count: 'exact' });

  // Apply filters
  query = this.applyFilters(query, params);

  // Apply personalization if requested
  let userProfile: ProfileEntity | null = null;
  if (params.applyPersonalization && userId) {
    userProfile = await this.getProfile(userId);
    if (!userProfile) {
      throw new Error('PROFILE_NOT_FOUND');
    }
    
    // Apply mood-based sentiment filtering
    if (userProfile.mood) {
      query = query.eq('sentiment', userProfile.mood);
    }
  }

  // Apply sorting
  const sortField = params.sortBy === 'publication_date' ? 'publication_date' : 'created_at';
  const ascending = params.sortOrder === 'asc';
  query = query.order(sortField, { ascending });

  // Calculate fetch limit (over-fetch for blocklist filtering)
  const fetchLimit = params.applyPersonalization && userProfile?.blocklist.length 
    ? params.limit * 2 
    : params.limit;

  // Apply pagination
  query = query.range(params.offset, params.offset + fetchLimit - 1);

  // Execute query
  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  // Apply blocklist filtering if personalization is enabled
  let blockedCount = 0;
  let filteredData = data || [];
  
  if (params.applyPersonalization && userProfile?.blocklist.length) {
    const beforeFilterCount = filteredData.length;
    filteredData = this.applyBlocklistFilter(filteredData, userProfile.blocklist);
    blockedCount = beforeFilterCount - filteredData.length;
    
    // Trim to requested limit
    filteredData = filteredData.slice(0, params.limit);
  }

  // Map to DTOs
  const articles = filteredData.map(article => this.mapArticleToDto(article));

  // Build response
  return {
    data: articles,
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: count || 0,
      hasMore: params.offset + params.limit < (count || 0)
    },
    filtersApplied: {
      sentiment: params.sentiment,
      personalization: params.applyPersonalization,
      blockedItemsCount: blockedCount > 0 ? blockedCount : undefined
    }
  };
}

/**
 * Applies query filters (sentiment, topicId, sourceId) to the Supabase query.
 */
private applyFilters(query: any, params: GetArticlesQueryParams): any {
  // Filter by sentiment
  if (params.sentiment) {
    query = query.eq('sentiment', params.sentiment);
  }

  // Filter by source ID
  if (params.sourceId) {
    query = query.eq('source_id', params.sourceId);
  }

  // Filter by topic ID
  if (params.topicId) {
    // Use inner join to filter articles by topic
    query = query.contains('article_topics.topic_id', [params.topicId]);
  }

  return query;
}

/**
 * Applies blocklist filtering to articles.
 * Filters out articles where title, description, or link contains blocklisted terms.
 */
private applyBlocklistFilter(articles: any[], blocklist: string[]): any[] {
  const lowerBlocklist = blocklist.map(term => term.toLowerCase());
  
  return articles.filter(article => {
    const title = (article.title || '').toLowerCase();
    const description = (article.description || '').toLowerCase();
    const link = (article.link || '').toLowerCase();
    
    // Check if any blocklist term appears in title, description, or link
    for (const term of lowerBlocklist) {
      if (title.includes(term) || description.includes(term) || link.includes(term)) {
        return false; // Article is blocked
      }
    }
    
    return true; // Article passes blocklist filter
  });
}

/**
 * Fetches user profile by user ID.
 */
private async getProfile(userId: string): Promise<ProfileEntity | null> {
  const { data, error } = await this.supabase
    .schema('app')
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    mood: data.mood,
    blocklist: data.blocklist,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Maps database article with relations to ArticleDto.
 */
private mapArticleToDto(article: any): ArticleDto {
  return {
    id: article.id,
    title: article.title,
    description: article.description,
    link: article.link,
    publicationDate: article.publication_date,
    sentiment: article.sentiment,
    source: {
      id: article.source.id,
      name: article.source.name,
      url: article.source.url
    },
    topics: (article.article_topics || [])
      .map((at: any) => at.topics)
      .filter((t: any) => t !== null)
      .map((topic: any) => ({
        id: topic.id,
        name: topic.name
      })),
    createdAt: article.created_at,
    updatedAt: article.updated_at
  };
}
```

**Tasks:**
- Extend existing ArticleService class with new methods
- Implement `getArticles()` main method
- Implement `applyFilters()` helper
- Implement `applyBlocklistFilter()` helper
- Implement `getProfile()` helper
- Implement `mapArticleToDto()` mapper
- Handle edge cases (null data, empty arrays, missing relations)
- Add TypeScript type annotations
- Write unit tests for each method

---

### Step 3: Implement API Route Handler

**File:** `src/pages/api/articles/index.ts` (add GET handler to existing file)

Add the GET handler alongside the existing POST handler.

```typescript
/**
 * GET /api/articles
 * Retrieves a paginated list of articles with optional filtering and personalization.
 *
 * Authentication: Optional (personalization requires authentication)
 * 
 * @returns 200 OK with ArticleListResponse on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if personalization requested without authentication
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  try {
    // Extract query parameters from URL
    const url = new URL(context.request.url);
    const queryParams = {
      limit: url.searchParams.get('limit') || undefined,
      offset: url.searchParams.get('offset') || undefined,
      sentiment: url.searchParams.get('sentiment') || undefined,
      topicId: url.searchParams.get('topicId') || undefined,
      sourceId: url.searchParams.get('sourceId') || undefined,
      applyPersonalization: url.searchParams.get('applyPersonalization') || undefined,
      sortBy: url.searchParams.get('sortBy') || undefined,
      sortOrder: url.searchParams.get('sortOrder') || undefined
    };

    // Validate query parameters
    let validatedParams: GetArticlesQueryParamsValidated;
    try {
      validatedParams = GetArticlesQueryParamsSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Query parameter validation failed", {
          endpoint: "GET /api/articles",
          errors: error.errors
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            })),
            timestamp: new Date().toISOString()
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      throw error;
    }

    // Check authentication if personalization is requested
    if (validatedParams.applyPersonalization && !user) {
      logger.warn("Personalization requested without authentication", {
        endpoint: "GET /api/articles"
      });

      return new Response(
        JSON.stringify({
          error: "Authentication required for personalized filtering",
          code: "AUTHENTICATION_REQUIRED",
          timestamp: new Date().toISOString()
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Fetch articles using ArticleService
    const articleService = new ArticleService(supabase);
    const result = await articleService.getArticles(
      validatedParams,
      user?.id
    );

    // Log success
    logger.info("Articles fetched successfully", {
      endpoint: "GET /api/articles",
      resultCount: result.data.length,
      totalCount: result.pagination.total,
      filtersApplied: result.filtersApplied,
      userId: user?.id || "anonymous"
    });

    // Return success response
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Profile not found error
      if (error.message === 'PROFILE_NOT_FOUND') {
        logger.error("User profile not found", error, {
          endpoint: "GET /api/articles",
          userId: user?.id
        });

        return new Response(
          JSON.stringify({
            error: "User profile not found. Please complete your profile setup.",
            code: "PROFILE_NOT_FOUND",
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to fetch articles", error, {
      endpoint: "GET /api/articles",
      userId: user?.id || "anonymous"
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
```

**Tasks:**
- Add GET export to existing `src/pages/api/articles/index.ts`
- Extract and validate query parameters
- Check authentication for personalization
- Call ArticleService.getArticles()
- Handle errors with appropriate status codes
- Add structured logging
- Return JSON response
- Test endpoint with various query combinations

---

### Step 4: Add Type Definitions for Query Params

**File:** `src/types.ts` (already exists)

Verify that the `GetArticlesQueryParams` type is correctly defined (it already exists in the file, so just verify).

**Tasks:**
- Verify `GetArticlesQueryParams` type exists in `src/types.ts`
- Ensure all fields match the query parameter schema
- No changes needed if types are already correct

---

### Step 5: Create Unit Tests

**File:** `src/lib/services/__tests__/article.service.test.ts` (extend existing test file)

Add tests for the new methods in ArticleService.

```typescript
describe('ArticleService.getArticles', () => {
  test('should fetch articles with default parameters', async () => {
    // TODO: Implement test
  });

  test('should apply sentiment filter', async () => {
    // TODO: Implement test
  });

  test('should apply topic filter', async () => {
    // TODO: Implement test
  });

  test('should apply source filter', async () => {
    // TODO: Implement test
  });

  test('should apply sorting (publication_date desc)', async () => {
    // TODO: Implement test
  });

  test('should apply sorting (created_at asc)', async () => {
    // TODO: Implement test
  });

  test('should apply pagination correctly', async () => {
    // TODO: Implement test
  });

  test('should calculate hasMore correctly', async () => {
    // TODO: Implement test
  });

  test('should apply mood-based filtering when personalization enabled', async () => {
    // TODO: Implement test
  });

  test('should apply blocklist filtering when personalization enabled', async () => {
    // TODO: Implement test
  });

  test('should handle empty results', async () => {
    // TODO: Implement test
  });

  test('should handle database errors', async () => {
    // TODO: Implement test
  });
});

describe('ArticleService.applyBlocklistFilter', () => {
  test('should filter articles with blocklisted terms in title', async () => {
    // TODO: Implement test
  });

  test('should filter articles with blocklisted terms in description', async () => {
    // TODO: Implement test
  });

  test('should filter articles with blocklisted terms in link', async () => {
    // TODO: Implement test
  });

  test('should be case-insensitive', async () => {
    // TODO: Implement test
  });

  test('should handle empty blocklist', async () => {
    // TODO: Implement test
  });
});
```

**File:** `src/pages/api/articles/__tests__/get.test.ts` (new file)

Create integration tests for the GET endpoint.

```typescript
describe('GET /api/articles - Success Scenarios', () => {
  test('should return 200 with default parameters (anonymous user)', async () => {
    // TODO: Implement test
  });

  test('should return articles with nested source and topics', async () => {
    // TODO: Implement test
  });

  test('should return correct pagination metadata', async () => {
    // TODO: Implement test
  });

  test('should filter by sentiment', async () => {
    // TODO: Implement test
  });

  test('should filter by topicId', async () => {
    // TODO: Implement test
  });

  test('should filter by sourceId', async () => {
    // TODO: Implement test
  });

  test('should sort by publication_date desc (default)', async () => {
    // TODO: Implement test
  });

  test('should sort by created_at asc', async () => {
    // TODO: Implement test
  });

  test('should apply personalization for authenticated user', async () => {
    // TODO: Implement test
  });

  test('should return filtersApplied metadata', async () => {
    // TODO: Implement test
  });
});

describe('GET /api/articles - Validation Errors', () => {
  test('should return 400 for invalid limit (< 1)', async () => {
    // TODO: Implement test
  });

  test('should return 400 for invalid limit (> 100)', async () => {
    // TODO: Implement test
  });

  test('should return 400 for invalid offset (< 0)', async () => {
    // TODO: Implement test
  });

  test('should return 400 for invalid sentiment', async () => {
    // TODO: Implement test
  });

  test('should return 400 for invalid topicId (not UUID)', async () => {
    // TODO: Implement test
  });

  test('should return 400 for invalid sourceId (not UUID)', async () => {
    // TODO: Implement test
  });

  test('should return 400 for invalid sortBy', async () => {
    // TODO: Implement test
  });

  test('should return 400 for invalid sortOrder', async () => {
    // TODO: Implement test
  });
});

describe('GET /api/articles - Authentication Errors', () => {
  test('should return 401 when personalization requested without auth', async () => {
    // TODO: Implement test
  });
});
```

**Tasks:**
- Create test files
- Write unit tests for service methods
- Write integration tests for API endpoint
- Mock Supabase client for unit tests
- Use test database for integration tests
- Aim for >80% code coverage

---

### Step 6: Update API Documentation

**File:** `.ai/api-plan.md` (update with GET implementation details)

Update the API documentation to reflect the implemented GET endpoint.

**Tasks:**
- Update status from "Planned" to "Implemented"
- Add examples of successful requests and responses
- Document all query parameters
- Document all error responses
- Add performance notes

---

### Step 7: Manual Testing

Perform manual testing with various scenarios:

**Test Cases:**

1. **Basic listing (anonymous):**
   ```bash
   curl "http://localhost:4321/api/articles?limit=5"
   ```

2. **Filter by sentiment:**
   ```bash
   curl "http://localhost:4321/api/articles?sentiment=positive&limit=10"
   ```

3. **Filter by topic:**
   ```bash
   curl "http://localhost:4321/api/articles?topicId=<uuid>&limit=10"
   ```

4. **Filter by source:**
   ```bash
   curl "http://localhost:4321/api/articles?sourceId=<uuid>&limit=10"
   ```

5. **Personalized listing (authenticated):**
   ```bash
   curl "http://localhost:4321/api/articles?applyPersonalization=true&limit=20" \
     -H "Authorization: Bearer <token>"
   ```

6. **Pagination:**
   ```bash
   curl "http://localhost:4321/api/articles?limit=20&offset=0"
   curl "http://localhost:4321/api/articles?limit=20&offset=20"
   curl "http://localhost:4321/api/articles?limit=20&offset=40"
   ```

7. **Sorting:**
   ```bash
   curl "http://localhost:4321/api/articles?sortBy=created_at&sortOrder=asc&limit=10"
   ```

8. **Invalid parameters:**
   ```bash
   curl "http://localhost:4321/api/articles?limit=200"  # Expect 400
   curl "http://localhost:4321/api/articles?sentiment=invalid"  # Expect 400
   curl "http://localhost:4321/api/articles?topicId=not-a-uuid"  # Expect 400
   ```

9. **Personalization without auth:**
   ```bash
   curl "http://localhost:4321/api/articles?applyPersonalization=true"  # Expect 401
   ```

**Tasks:**
- Execute all test cases
- Verify response structures
- Verify status codes
- Verify error messages
- Test edge cases (empty results, large offsets, etc.)
- Measure response times

---

### Step 8: Performance Testing

**Tasks:**
- Use tools like Apache Bench (ab) or wrk to load test
- Test with various query combinations
- Measure database query times
- Profile personalization overhead
- Identify bottlenecks
- Optimize queries if needed

**Example Load Test:**
```bash
# 100 concurrent requests, 1000 total requests
ab -n 1000 -c 100 "http://localhost:4321/api/articles?limit=20"
```

**Performance Goals:**
- p95 latency < 300ms (no personalization)
- p95 latency < 500ms (with personalization)
- Handle 100+ concurrent requests
- No database connection errors

---

### Step 9: Create Documentation

**File:** `.ai/get-articles-implementation-summary.md`

Create a summary document similar to the POST articles implementation summary.

**Contents:**
- Implementation status
- Files created/modified
- Key features implemented
- API response codes
- Testing summary
- Known limitations
- Future enhancements

**Tasks:**
- Write implementation summary
- Document any deviations from plan
- List any issues encountered
- Provide recommendations for future improvements

---

## Summary

This implementation plan provides a comprehensive guide for implementing the GET /api/articles endpoint with the following key features:

✅ **Public Access:** Articles are readable by everyone, including guests  
✅ **Optional Personalization:** Authenticated users can apply mood and blocklist preferences  
✅ **Flexible Filtering:** Filter by sentiment, topic, and source  
✅ **Configurable Sorting:** Sort by publication date or created date  
✅ **Pagination:** Offset-based pagination with limit and hasMore metadata  
✅ **Nested Data:** Articles include nested source and topics for complete representation  
✅ **Comprehensive Validation:** All query parameters validated with Zod  
✅ **Error Handling:** Detailed error responses with appropriate status codes  
✅ **Security:** RLS policies, input validation, authentication checks  
✅ **Performance:** Optimized database queries with indexes  
✅ **Logging:** Structured logging for monitoring and debugging  

**Estimated Implementation Time:** 8-12 hours (including testing and documentation)

**Dependencies:**
- Existing ArticleService (extend)
- Existing middleware (no changes needed)
- Database schema (already implemented)
- Type definitions (already implemented)

**Follow-Up Tasks:**
- Implement frontend integration
- Add caching layer (future enhancement)
- Implement cursor-based pagination (future enhancement)
- Add analytics tracking (future enhancement)

