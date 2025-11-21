# POST /api/topics - Create Topic

Create a new topic or return existing topic if name already exists (case-insensitive). Implements upsert behavior for idempotent topic creation.

**Note:** This endpoint requires service role authentication and is intended for use by AI analysis jobs and admin interfaces.

## Authentication

**Required:** Service role authentication

This endpoint requires a valid Supabase service role JWT token.

```
Authorization: Bearer <service_role_token>
```

## Request

**Method:** `POST`  
**URL:** `/api/topics`  
**Content-Type:** `application/json`

### Request Body

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `name` | string | Yes | Topic name | Min: 1 character, Max: 500 characters, trimmed |

### Example Request

```json
{
  "name": "climate change"
}
```

### Example with curl

```bash
curl -X POST https://your-domain.com/api/topics \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "climate change"
  }'
```

## Response

### Success Response (201 Created)

Returned when a new topic is created.

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "climate change",
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

### Success Response (200 OK)

Returned when a topic with the same name (case-insensitive) already exists. The existing topic is returned.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "climate change",
  "createdAt": "2025-11-10T00:00:00Z",
  "updatedAt": "2025-11-10T00:00:00Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique topic identifier |
| `name` | string | Topic name (may differ in case from request) |
| `createdAt` | string (ISO 8601) | When the topic was created |
| `updatedAt` | string (ISO 8601) | When the topic was last updated |

### Error Responses

#### 400 Bad Request - Validation Error

Returned when the request body fails validation.

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "name",
      "message": "Name cannot be empty"
    }
  ],
  "timestamp": "2025-11-15T10:00:00Z"
}
```

**Common validation errors:**
- `name` is missing
- `name` is empty string
- `name` exceeds 500 characters
- `name` contains only whitespace (will be trimmed)

#### 400 Bad Request - Invalid JSON

```json
{
  "error": "Invalid JSON in request body",
  "code": "INVALID_JSON",
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
2. **Request Parsing**: Parses JSON body
3. **Input Validation**: Validates against Zod schema (name required, 1-500 chars)
4. **Case-Insensitive Lookup**: Checks if topic with same name exists (case-insensitive)
5. **Upsert Logic**:
   - If exists: Returns existing topic with 200 OK
   - If not exists: Creates new topic and returns with 201 Created
6. **Response Mapping**: Converts database snake_case to camelCase DTO format

### Upsert Behavior

The endpoint implements an "upsert" pattern:
- **Case-insensitive matching**: "Technology", "technology", and "TECHNOLOGY" are considered the same topic
- **Idempotent**: Multiple calls with the same name return the same topic
- **Status codes**: 201 for new topics, 200 for existing topics

This enables idempotent topic creation for AI analysis jobs that may attempt to create the same topic multiple times.

### Security

- **Service Role Only**: Only service role can create topics
- **Input Validation**: All inputs are validated and sanitized (trimmed)
- **SQL Injection Protection**: Uses Supabase parameterized queries
- **Case-Insensitive Uniqueness**: Enforced at database level with unique index on `lower(name)`

## Usage Examples

### TypeScript Example - AI Analysis Job

```typescript
async function createTopicIfNotExists(
  serviceRoleToken: string,
  topicName: string
) {
  const response = await fetch('https://your-domain.com/api/topics', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: topicName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const topic = await response.json();
  const wasCreated = response.status === 201;
  
  console.log(
    wasCreated ? 'Created new topic' : 'Topic already exists',
    topic.id
  );
  
  return topic;
}

// Usage in AI analysis job
async function analyzeArticle(article: Article) {
  const topics = extractTopics(article); // AI analysis
  
  for (const topicName of topics) {
    // Idempotent - safe to call multiple times
    await createTopicIfNotExists(serviceRoleToken, topicName);
  }
}
```

### Batch Topic Creation Example

```typescript
async function createTopicsBatch(
  serviceRoleToken: string,
  topicNames: string[]
) {
  const results = await Promise.allSettled(
    topicNames.map((name) =>
      createTopicIfNotExists(serviceRoleToken, name)
    )
  );

  const created = results.filter((r) => r.status === 'fulfilled').length;
  const errors = results.filter((r) => r.status === 'rejected').length;

  console.log(`Created/found ${created} topics, ${errors} errors`);
  
  return results;
}
```

### Error Handling Example

```typescript
async function createTopicWithErrorHandling(
  serviceRoleToken: string,
  topicName: string
) {
  try {
    const response = await fetch('/api/topics', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: topicName }),
    });

    if (response.status === 400) {
      const error = await response.json();
      console.error('Validation error:', error.details);
      throw new Error('Invalid topic name');
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

    if (!response.ok) {
      throw new Error('Failed to create topic');
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

1. **Idempotency**: This endpoint is idempotent - safe to call multiple times with the same name
2. **Case Handling**: Topic names are case-insensitive - "Technology" and "technology" are the same
3. **Whitespace**: Topic names are automatically trimmed
4. **Error Handling**: Always check status code to determine if topic was created (201) or found (200)
5. **Service Role**: Only use service role tokens - never expose to client-side code

## Performance

- **Target latency**: < 200ms (p95)
- **Case-Insensitive Lookup**: Uses database index on `lower(name)` for fast lookups
- **Idempotency**: Enables safe retry logic in AI analysis jobs

## See Also

- [GET /api/topics](./GET-topics.md) - List all topics
- [GET /api/topics/:id](./GET-topic-by-id.md) - Get single topic
- [DELETE /api/topics/:id](./DELETE-topic-by-id.md) - Delete topic

