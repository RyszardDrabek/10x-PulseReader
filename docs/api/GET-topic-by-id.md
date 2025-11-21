# GET /api/topics/:id - Get Topic by ID

Retrieve a single topic by its unique identifier.

## Authentication

**Required:** None (public endpoint)

This endpoint is publicly accessible and does not require authentication.

## Request

**Method:** `GET`  
**URL:** `/api/topics/:id`  
**Content-Type:** Not required (no request body)

### Path Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `id` | string (UUID) | Yes | Topic identifier | Valid UUID format |

### Example Request with curl

```bash
curl -X GET https://your-domain.com/api/topics/550e8400-e29b-41d4-a716-446655440000
```

## Response

### Success Response (200 OK)

Returns the topic entity.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "technology",
  "createdAt": "2025-11-10T00:00:00Z",
  "updatedAt": "2025-11-10T00:00:00Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique topic identifier |
| `name` | string | Topic name |
| `createdAt` | string (ISO 8601) | When the topic was created |
| `updatedAt` | string (ISO 8601) | When the topic was last updated |

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

1. **Path Parameter Extraction**: Extracts `id` from URL path
2. **UUID Validation**: Validates UUID format using Zod schema
3. **Database Query**: Queries `app.topics` table filtered by `id`
4. **Response Mapping**: Converts database snake_case to camelCase DTO format
5. **Response**: Returns topic entity or 404 if not found

### Security

- **Public Access**: No authentication required
- **UUID Validation**: Prevents SQL injection through format validation
- **Parameterized Queries**: Uses Supabase query builder for safe database access

## Usage Examples

### TypeScript Example

```typescript
async function getTopicById(topicId: string) {
  const response = await fetch(
    `https://your-domain.com/api/topics/${topicId}`
  );

  if (response.status === 404) {
    return null; // Topic not found
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Usage
const topic = await getTopicById('550e8400-e29b-41d4-a716-446655440000');
if (topic) {
  console.log(`Topic: ${topic.name}`);
}
```

### React Example

```typescript
import { useQuery } from '@tanstack/react-query';

function useTopic(topicId: string | null) {
  return useQuery({
    queryKey: ['topic', topicId],
    queryFn: async () => {
      if (!topicId) return null;

      const response = await fetch(`/api/topics/${topicId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch topic');
      }
      
      return response.json();
    },
    enabled: !!topicId,
  });
}

// Usage in component
function TopicDisplay({ topicId }: { topicId: string }) {
  const { data: topic, isLoading, error } = useTopic(topicId);

  if (isLoading) return <div>Loading topic...</div>;
  if (error) return <div>Error loading topic</div>;
  if (!topic) return <div>Topic not found</div>;

  return (
    <div>
      <h2>{topic.name}</h2>
      <p>Created: {new Date(topic.createdAt).toLocaleDateString()}</p>
    </div>
  );
}
```

### Error Handling Example

```typescript
async function getTopicWithErrorHandling(topicId: string) {
  try {
    const response = await fetch(`/api/topics/${topicId}`);
    
    if (response.status === 400) {
      const error = await response.json();
      console.error('Invalid UUID format:', error.details);
      throw new Error('Invalid topic ID format');
    }
    
    if (response.status === 404) {
      return null; // Topic doesn't exist
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch topic');
    }
    
    return await response.json();
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

1. **Error Handling**: Always handle 404 responses gracefully (topic may have been deleted)
2. **UUID Validation**: Validate UUID format on client side before making request
3. **Caching**: Consider caching individual topics since they rarely change
4. **Null Checks**: Check for null/undefined topicId before making request

## Performance

- **Target latency**: < 100ms (p95)
- **Database**: Uses primary key index for O(1) lookup
- **Caching**: Topics rarely change - consider caching with 15-30 minute TTL

## See Also

- [GET /api/topics](./GET-topics.md) - List all topics
- [POST /api/topics](./POST-topics.md) - Create topic (service role)
- [DELETE /api/topics/:id](./DELETE-topic-by-id.md) - Delete topic (service role)

