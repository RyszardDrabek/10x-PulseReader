# POST /api/articles - Create Article

Create a new article in the PulseReader system. This endpoint is used by the RSS fetching cron job to ingest articles from configured RSS sources.

## Authentication

**Required:** Service role authentication

This endpoint requires a valid Supabase service role JWT token. Regular users cannot access this endpoint.

```
Authorization: Bearer <service_role_jwt_token>
```

## Request

**Method:** `POST`  
**URL:** `/api/articles`  
**Content-Type:** `application/json`

### Request Body

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `sourceId` | string (UUID) | Yes | Reference to the RSS source | Must exist in `rss_sources` table |
| `title` | string | Yes | Article title from RSS feed | 1-1000 characters |
| `link` | string (URL) | Yes | Unique URL to the full article | Must be valid URL, unique across all articles |
| `publicationDate` | string (ISO 8601) | Yes | When the article was published | Valid ISO 8601 datetime |
| `description` | string \| null | No | Article description or excerpt | Max 5000 characters, defaults to null |
| `sentiment` | enum \| null | No | AI-analyzed sentiment | One of: "positive", "neutral", "negative", or null |
| `topicIds` | array of UUIDs | No | IDs of topics to associate | Max 20 topics, all must exist in `topics` table |

### Example Request

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

### Example with curl

```bash
curl -X POST https://your-domain.com/api/articles \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Breaking: Major Climate Agreement Reached",
    "description": "World leaders have agreed to significant emissions reductions...",
    "link": "https://bbcnews.com/world/climate-agreement-2025",
    "publicationDate": "2025-11-15T10:30:00Z",
    "sentiment": "positive"
  }'
```

## Response

### Success Response (201 Created)

Returns the created article entity with database-generated fields populated.

**Note:** The response does NOT include nested `source` or `topics` objects. This is a simplified response suitable for the cron job use case.

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

### Error Responses

#### 400 Bad Request - Validation Error

Returned when the request body fails validation.

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

**Common validation errors:**
- Missing required fields (sourceId, title, link, publicationDate)
- Invalid UUID format for sourceId or topicIds
- Invalid URL format for link
- Invalid ISO 8601 datetime for publicationDate
- Title exceeds 1000 characters
- Description exceeds 5000 characters
- Invalid sentiment value (not in enum)
- More than 20 topics in topicIds array

#### 400 Bad Request - Invalid Source ID

```json
{
  "error": "RSS source not found",
  "code": "INVALID_SOURCE_ID",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 400 Bad Request - Invalid Topic IDs

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

#### 401 Unauthorized - Authentication Required

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 401 Unauthorized - Service Role Required

```json
{
  "error": "Service role required for this endpoint",
  "code": "FORBIDDEN",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 409 Conflict - Duplicate Article

Returned when an article with the same link already exists.

```json
{
  "error": "Article with this link already exists",
  "code": "CONFLICT",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

**Note:** This is expected behavior when RSS feeds contain duplicate articles. The cron job should continue with the next article when receiving a 409 response.

#### 500 Internal Server Error

```json
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

## Implementation Details

### Data Flow

1. **Authentication Check**: Validates service role JWT token
2. **Request Parsing**: Parses JSON body
3. **Input Validation**: Validates against Zod schema
4. **Source Validation**: Verifies RSS source exists
5. **Topic Validation**: Verifies all topic IDs exist (if provided)
6. **Article Creation**: Inserts article into database
7. **Topic Associations**: Creates article-topic associations (if provided)
8. **Response**: Returns created article entity

### Transaction Safety

The implementation uses a rollback mechanism: if topic associations fail after article creation, the article is automatically deleted to maintain data integrity.

### Duplicate Detection

The database enforces a unique constraint on the `link` field. Attempting to create an article with a duplicate link will result in a 409 Conflict response.

## Usage in Cron Job

### TypeScript Example

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function ingestArticle(articleData: {
  sourceId: string;
  title: string;
  link: string;
  publicationDate: string;
  description?: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  topicIds?: string[];
}) {
  // Get service role token (already authenticated with service role key)
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch('https://your-domain.com/api/articles', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(articleData),
  });

  if (response.status === 201) {
    const article = await response.json();
    console.log('Article created:', article.id);
    return article;
  } else if (response.status === 409) {
    console.log('Article already exists, skipping');
    return null;
  } else {
    const error = await response.json();
    console.error('Failed to create article:', error);
    throw new Error(error.error);
  }
}
```

### Error Handling Best Practices

When using this endpoint in a cron job:

1. **409 Conflicts**: Consider these normal and continue processing
2. **400 Errors**: Log for investigation (might indicate RSS feed format issues)
3. **401 Errors**: Check service role token validity
4. **500 Errors**: Retry with exponential backoff

### Performance Considerations

- Target latency: < 200ms per article (p95)
- Recommended batch size: Process articles sequentially or in small batches (10-20 concurrent)
- Rate limiting: None for MVP (service role only)

## Environment Variables

Required environment variables:

```
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Security

- ⚠️ **Never expose the service role key** in client-side code
- ⚠️ **Only use in server-side cron jobs** or backend services
- Service role bypasses Row Level Security (RLS) policies
- All inputs are validated and sanitized
- SQL injection protection via Supabase parameterized queries

## See Also

- [GET /api/articles](./get-articles.md) - Retrieve articles
- [GET /api/articles/:id](./get-article-by-id.md) - Get specific article
- [PATCH /api/articles/:id](./update-article.md) - Update article (service role)

