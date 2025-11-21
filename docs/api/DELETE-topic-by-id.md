# DELETE /api/topics/:id - Delete Topic

Delete a topic by its unique identifier. Database CASCADE automatically removes all article-topic associations.

**Note:** This endpoint requires service role authentication and is intended for use by admin interfaces.

## Authentication

**Required:** Service role authentication

This endpoint requires a valid Supabase service role JWT token.

```
Authorization: Bearer <service_role_token>
```

## Request

**Method:** `DELETE`  
**URL:** `/api/topics/:id`  
**Content-Type:** Not required (no request body)

### Path Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `id` | string (UUID) | Yes | Topic identifier | Valid UUID format |

### Example Request with curl

```bash
curl -X DELETE https://your-domain.com/api/topics/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_TOKEN"
```

## Response

### Success Response (204 No Content)

Returned when the topic is successfully deleted. Response body is empty.

**Status Code:** `204 No Content`  
**Response Body:** Empty

### Error Responses

#### 400 Bad Request - Invalid UUID Format

Returned when the topic ID is not a valid UUID.

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "id",
      "message": "Invalid UUID format"
    }
  ],
  "timestamp": "2025-11-15T10:00:00Z"
}
```

#### 401 Unauthorized - Authentication Required

Returned when no authentication token is provided.

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

#### 401 Unauthorized - Service Role Required

Returned when the authenticated user is not a service role.

```json
{
  "error": "Service role required for this endpoint",
  "code": "FORBIDDEN",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

#### 404 Not Found - Topic Does Not Exist

Returned when no topic exists with the provided ID.

```json
{
  "error": "Topic does not exist",
  "code": "NOT_FOUND",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

## Implementation Details

### Data Flow

1. **Authentication Check**: Validates service role JWT token
2. **Path Parameter Extraction**: Extracts `id` from URL path
3. **UUID Validation**: Validates UUID format using Zod schema
4. **Existence Check**: Verifies topic exists before deletion
5. **Database Deletion**: Deletes topic from `app.topics` table
6. **CASCADE**: Database automatically removes all associated records from `app.article_topics`

### Cascade Deletion

When deleting a topic:
- The topic record is removed from `app.topics`
- Database CASCADE automatically removes all associated records from `app.article_topics`
- Articles themselves are not affected (only the topic associations)
- No manual cleanup of associations is required

### Security

- **Service Role Only**: Only service role can delete topics
- **UUID Validation**: Prevents SQL injection through format validation
- **Parameterized Queries**: Uses Supabase query builder for safe database access
- **Existence Verification**: Verifies topic exists before deletion to provide clear error messages

## Usage Examples

### TypeScript Example

```typescript
async function deleteTopic(
  serviceRoleToken: string,
  topicId: string
) {
  const response = await fetch(
    `https://your-domain.com/api/topics/${topicId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceRoleToken}`,
      },
    }
  );

  if (response.status === 204) {
    console.log('Topic deleted successfully');
    return true;
  }

  if (response.status === 404) {
    console.log('Topic not found');
    return false;
  }

  const error = await response.json();
  throw new Error(error.error);
}

// Usage
await deleteTopic(serviceRoleToken, '550e8400-e29b-41d4-a716-446655440000');
```

### React Example - Admin Interface

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useDeleteTopic() {
  const queryClient = useQueryClient();
  const { data: session } = useSession(); // Supabase session with service role

  return useMutation({
    mutationFn: async (topicId: string) => {
      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.status === 404) {
        throw new Error('Topic not found');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      return true; // 204 No Content
    },
    onSuccess: () => {
      // Invalidate topics list to refresh UI
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });
}

// Usage in component
function TopicAdminPanel() {
  const deleteTopic = useDeleteTopic();

  const handleDelete = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic?')) {
      return;
    }

    try {
      await deleteTopic.mutateAsync(topicId);
      alert('Topic deleted successfully');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    // ... UI with delete buttons
  );
}
```

### Error Handling Example

```typescript
async function deleteTopicWithErrorHandling(
  serviceRoleToken: string,
  topicId: string
) {
  try {
    const response = await fetch(`/api/topics/${topicId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceRoleToken}`,
      },
    });

    if (response.status === 400) {
      const error = await response.json();
      console.error('Invalid UUID format:', error.details);
      throw new Error('Invalid topic ID format');
    }

    if (response.status === 401) {
      const error = await response.json();
      if (error.code === 'AUTHENTICATION_REQUIRED') {
        throw new Error('Service role token required');
      }
      if (error.code === 'FORBIDDEN') {
        throw new Error('Service role required for this operation');
      }
    }

    if (response.status === 404) {
      return false; // Topic doesn't exist
    }

    if (response.status === 204) {
      return true; // Successfully deleted
    }

    throw new Error('Failed to delete topic');
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      console.error('Network error:', error);
    }
    throw error;
  }
}
```

## Best Practices

1. **Confirmation**: Always confirm deletion in UI before calling this endpoint
2. **Cascade Awareness**: Understand that deleting a topic removes all article-topic associations
3. **Error Handling**: Handle 404 gracefully (topic may have already been deleted)
4. **Service Role**: Only use service role tokens - never expose to client-side code
5. **UI Updates**: Invalidate topics list cache after successful deletion

## Performance

- **Target latency**: < 150ms (p95)
- **CASCADE**: Database handles cascade deletion efficiently
- **Existence Check**: Uses indexed primary key lookup for fast verification

## See Also

- [GET /api/topics](./GET-topics.md) - List all topics
- [GET /api/topics/:id](./GET-topic-by-id.md) - Get single topic
- [POST /api/topics](./POST-topics.md) - Create topic

