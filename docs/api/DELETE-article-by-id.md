# DELETE /api/articles/:id - Delete Article

Delete an article from the PulseReader system. This endpoint is used by the retention policy cron job to remove old articles.

## Authentication

**Required:** Service role authentication

This endpoint requires a valid Supabase service role JWT token. Regular users cannot access this endpoint.

```
Authorization: Bearer <service_role_jwt_token>
```

## Request

**Method:** `DELETE`  
**URL:** `/api/articles/:id`  
**Content-Type:** `application/json`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of the article to delete |

### Example Request

```bash
curl -X DELETE https://your-domain.com/api/articles/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_TOKEN"
```

## Response

### Success Response (204 No Content)

Returns an empty response body on successful deletion.

**Status Code:** `204 No Content`  
**Body:** Empty

### Error Responses

#### 400 Bad Request - Invalid UUID Format

Returned when the article ID is not a valid UUID.

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "id",
      "message": "Invalid UUID format for article ID"
    }
  ],
  "timestamp": "2025-11-15T12:00:00Z"
}
```

#### 401 Unauthorized - Authentication Required

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T12:00:00Z"
}
```

#### 401 Unauthorized - Service Role Required

```json
{
  "error": "Service role required for this endpoint",
  "code": "FORBIDDEN",
  "timestamp": "2025-11-15T12:00:00Z"
}
```

#### 404 Not Found

Returned when the article with the specified ID does not exist.

```json
{
  "error": "Article not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-11-15T12:00:00Z"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T12:00:00Z"
}
```

## Implementation Details

### Data Flow

1. **Authentication Check**: Validates service role JWT token
2. **Path Parameter Validation**: Validates UUID format
3. **Article Existence Check**: Verifies article exists before deletion
4. **Article Deletion**: Deletes article from database
5. **Cascade Deletion**: Database automatically removes `article_topics` associations (CASCADE)
6. **Response**: Returns 204 No Content

### Cascade Behavior

The database schema enforces CASCADE deletion:
- When an article is deleted, all associated `article_topics` records are automatically removed
- No manual cleanup of topic associations is required

### Transaction Safety

The deletion operation is atomic. If the article exists, it will be deleted along with all its associations in a single transaction.

## Usage in Retention Policy Cron Job

### TypeScript Example

```typescript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteOldArticles(articleIds: string[]) {
  // Get service role token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const results = await Promise.allSettled(
    articleIds.map(async (articleId) => {
      const response = await fetch(`https://your-domain.com/api/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        console.log(`Article ${articleId} deleted successfully`);
        return { articleId, success: true };
      } else if (response.status === 404) {
        console.log(`Article ${articleId} not found (already deleted)`);
        return { articleId, success: true }; // Consider 404 as success
      } else {
        const error = await response.json();
        console.error(`Failed to delete article ${articleId}:`, error);
        return { articleId, success: false, error };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;

  console.log(`Deletion complete: ${successful} successful, ${failed} failed`);
  return results;
}
```

### Error Handling Best Practices

When using this endpoint in a retention policy cron job:

1. **404 Errors**: Article may have been already deleted, consider as success
2. **400 Errors**: Log for investigation (might indicate data issues)
3. **401 Errors**: Check service role token validity
4. **500 Errors**: Retry with exponential backoff
5. **Batch Processing**: Use `Promise.allSettled` to handle multiple deletions independently

### Performance Considerations

- Target latency: < 100ms per deletion (p95)
- Recommended batch size: Process deletions in batches of 50-100 articles
- Rate limiting: None for MVP (service role only)
- Database CASCADE ensures efficient deletion of related records

## Security

- ⚠️ **Never expose the service role key** in client-side code
- ⚠️ **Only use in server-side cron jobs** or backend services
- Service role bypasses Row Level Security (RLS) policies
- All inputs are validated and sanitized
- SQL injection protection via Supabase parameterized queries

## See Also

- [GET /api/articles/:id](./GET-article-by-id.md) - Get specific article
- [POST /api/articles](./POST-articles.md) - Create article (service role)
- [PATCH /api/articles/:id](./PATCH-article-by-id.md) - Update article (service role)

