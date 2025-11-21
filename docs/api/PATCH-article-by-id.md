# PATCH /api/articles/:id - Update Article

Update an article's sentiment and topic associations. This endpoint is used by the AI analysis job to update articles after processing.

## Authentication

**Required:** Service role authentication

This endpoint requires a valid Supabase service role JWT token. Regular users cannot access this endpoint.

```
Authorization: Bearer <service_role_jwt_token>
```

## Request

**Method:** `PATCH`  
**URL:** `/api/articles/:id`  
**Content-Type:** `application/json`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of the article to update |

### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `sentiment` | enum \| null | No | AI-analyzed sentiment | One of: "positive", "neutral", "negative", or null |
| `topicIds` | array of UUIDs | No | IDs of topics to associate | Max 20 topics, all must exist in `topics` table |

### Example Request

```json
{
  "sentiment": "neutral",
  "topicIds": [
    "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
    "a9b8c7d6-e5f4-3210-abcd-ef9876543210"
  ]
}
```

### Example with curl

```bash
curl -X PATCH https://your-domain.com/api/articles/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sentiment": "neutral",
    "topicIds": ["f1e2d3c4-b5a6-7890-fedc-ba0987654321"]
  }'
```

## Response

### Success Response (200 OK)

Returns the updated article entity with the modified fields.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sourceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Breaking: Major Climate Agreement Reached",
  "description": "World leaders have agreed to significant emissions reductions...",
  "link": "https://bbcnews.com/world/climate-agreement-2025",
  "publicationDate": "2025-11-15T10:30:00Z",
  "sentiment": "neutral",
  "createdAt": "2025-11-15T10:35:22.123Z",
  "updatedAt": "2025-11-15T11:00:00.456Z"
}
```

**Note:** The response does NOT include nested `source` or `topics` objects. This is a simplified response suitable for the AI analysis job use case.

### Error Responses

#### 400 Bad Request - Validation Error

Returned when the request body fails validation.

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "sentiment",
      "message": "Sentiment must be one of: positive, neutral, negative, or null"
    }
  ],
  "timestamp": "2025-11-15T11:00:00Z"
}
```

**Common validation errors:**
- Invalid UUID format for article ID in path
- Invalid sentiment value (not in enum)
- Invalid UUID format in topicIds array
- More than 20 topics in topicIds array

#### 400 Bad Request - Invalid Topic IDs

```json
{
  "error": "One or more topic IDs are invalid",
  "code": "INVALID_TOPIC_IDS",
  "details": {
    "invalidIds": ["880e8400-e29b-41d4-a716-446655440000"]
  },
  "timestamp": "2025-11-15T11:00:00Z"
}
```

#### 401 Unauthorized - Authentication Required

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T11:00:00Z"
}
```

#### 401 Unauthorized - Service Role Required

```json
{
  "error": "Service role required for this endpoint",
  "code": "FORBIDDEN",
  "timestamp": "2025-11-15T11:00:00Z"
}
```

#### 404 Not Found

Returned when the article with the specified ID does not exist.

```json
{
  "error": "Article not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-11-15T11:00:00Z"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T11:00:00Z"
}
```

## Implementation Details

### Data Flow

1. **Authentication Check**: Validates service role JWT token
2. **Path Parameter Validation**: Validates UUID format
3. **Request Parsing**: Parses JSON body
4. **Input Validation**: Validates against Zod schema
5. **Article Existence Check**: Verifies article exists
6. **Topic Validation**: Verifies all topic IDs exist (if provided)
7. **Article Update**: Updates article fields in database
8. **Topic Associations Update**: Replaces existing topic associations
9. **Response**: Returns updated article entity

### Topic Associations Update Behavior

When `topicIds` is provided:
- All existing topic associations for the article are deleted
- New associations are created with the provided topic IDs
- If topic association creation fails, the article update is rolled back

When `topicIds` is not provided:
- Existing topic associations remain unchanged
- Only article fields (like sentiment) are updated

### Transaction Safety

The implementation uses a rollback mechanism: if topic associations fail after article update, the article is restored to its original state to maintain data integrity.

## Usage in AI Analysis Job

### TypeScript Example

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateArticleAnalysis(
  articleId: string,
  sentiment: 'positive' | 'neutral' | 'negative' | null,
  topicIds: string[]
) {
  // Get service role token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`https://your-domain.com/api/articles/${articleId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sentiment,
      topicIds,
    }),
  });

  if (response.status === 200) {
    const article = await response.json();
    console.log('Article updated:', article.id);
    return article;
  } else if (response.status === 404) {
    console.log('Article not found');
    return null;
  } else {
    const error = await response.json();
    console.error('Failed to update article:', error);
    throw new Error(error.error);
  }
}
```

### Error Handling Best Practices

When using this endpoint in an AI analysis job:

1. **404 Errors**: Article may have been deleted, log and skip
2. **400 Errors**: Log for investigation (might indicate data issues)
3. **401 Errors**: Check service role token validity
4. **500 Errors**: Retry with exponential backoff

## See Also

- [GET /api/articles/:id](./GET-article-by-id.md) - Get specific article
- [POST /api/articles](./POST-articles.md) - Create article (service role)
- [DELETE /api/articles/:id](./DELETE-article-by-id.md) - Delete article (service role)

