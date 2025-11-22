# GET /api/topics - List Topics

Retrieve a paginated list of topics with optional search filtering. Topics are AI-generated categories used to classify articles.

## Authentication

**Required:** None (public endpoint)

This endpoint is publicly accessible and does not require authentication.

## Request

**Method:** `GET`  
**URL:** `/api/topics`  
**Content-Type:** Not required (no request body)

### Query Parameters

| Parameter | Type    | Required | Default | Description                              | Constraints      |
| --------- | ------- | -------- | ------- | ---------------------------------------- | ---------------- |
| `limit`   | integer | No       | 100     | Number of topics per page                | Min: 1, Max: 500 |
| `offset`  | integer | No       | 0       | Pagination offset                        | Min: 0           |
| `search`  | string  | No       | -       | Search topics by name (case-insensitive) | Optional         |

### Example Request with curl

```bash
# Get first page of topics
curl -X GET https://your-domain.com/api/topics?limit=50&offset=0

# Search for topics containing "technology"
curl -X GET https://your-domain.com/api/topics?search=technology&limit=100
```

## Response

### Success Response (200 OK)

Returns a paginated list of topics.

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "technology",
      "createdAt": "2025-11-10T00:00:00Z",
      "updatedAt": "2025-11-10T00:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
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

**Response Fields:**

| Field                | Type              | Description                               |
| -------------------- | ----------------- | ----------------------------------------- |
| `data`               | array             | Array of topic objects                    |
| `data[].id`          | string (UUID)     | Unique topic identifier                   |
| `data[].name`        | string            | Topic name                                |
| `data[].createdAt`   | string (ISO 8601) | When the topic was created                |
| `data[].updatedAt`   | string (ISO 8601) | When the topic was last updated           |
| `pagination`         | object            | Pagination metadata                       |
| `pagination.limit`   | integer           | Number of items per page                  |
| `pagination.offset`  | integer           | Number of items skipped                   |
| `pagination.total`   | integer           | Total number of topics matching the query |
| `pagination.hasMore` | boolean           | Whether there are more topics available   |

### Error Responses

#### 400 Bad Request - Validation Error

Returned when query parameters fail validation.

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "limit",
      "message": "Limit must not exceed 500"
    }
  ],
  "timestamp": "2025-11-15T10:00:00Z"
}
```

**Common validation errors:**

- `limit` exceeds maximum (500)
- `limit` is less than 1
- `offset` is negative
- `limit` or `offset` is not an integer

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

1. **Query Parameter Extraction**: Extracts `limit`, `offset`, and `search` from URL
2. **Parameter Validation**: Validates parameters using Zod schema
3. **Database Query**: Queries `app.topics` table with pagination and optional search filter
4. **Search Filter**: Uses case-insensitive `ILIKE` pattern matching if `search` parameter provided
5. **Response Mapping**: Converts database snake_case to camelCase DTO format
6. **Pagination Calculation**: Calculates `hasMore` flag based on total count

### Search Behavior

- Search is case-insensitive
- Uses pattern matching: `ILIKE '%search%'`
- Searches only in the `name` field
- Empty or whitespace-only search strings are ignored

### Sorting

Topics are sorted alphabetically by name (ascending) by default.

## Usage Examples

### TypeScript Example

```typescript
async function getTopics(params?: { limit?: number; offset?: number; search?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());
  if (params?.search) queryParams.append("search", params.search);

  const response = await fetch(`https://your-domain.com/api/topics?${queryParams.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}

// Usage
const topics = await getTopics({ limit: 50, search: "tech" });
console.log(`Found ${topics.pagination.total} topics`);
```

### React Example - Topic Selector Component

```typescript
import { useQuery } from '@tanstack/react-query';

function useTopics(search?: string) {
  return useQuery({
    queryKey: ['topics', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '100');

      const response = await fetch(`/api/topics?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      return response.json();
    },
  });
}

function TopicSelector() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useTopics(search);

  return (
    <div>
      <input
        type="text"
        placeholder="Search topics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isLoading ? (
        <div>Loading topics...</div>
      ) : (
        <select>
          {data?.data.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
```

### Pagination Example

```typescript
async function getAllTopics() {
  const allTopics = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`https://your-domain.com/api/topics?limit=${limit}&offset=${offset}`);
    const data = await response.json();

    allTopics.push(...data.data);
    hasMore = data.pagination.hasMore;
    offset += limit;
  }

  return allTopics;
}
```

## Best Practices

1. **Pagination**: Use `limit` and `offset` for large datasets to avoid loading all topics
2. **Search**: Use search parameter to filter topics client-side before displaying
3. **Caching**: Consider caching topic list since topics change infrequently
4. **Default Limit**: Use default limit of 100 unless you need more (max 500)

## Performance

- **Target latency**: < 200ms (p95)
- **Pagination**: Default limit of 100 balances performance and usability
- **Search**: Case-insensitive search uses database indexes for fast lookups
- **Caching**: Topics change infrequently - consider caching for 5-10 minutes

## See Also

- [GET /api/topics/:id](./GET-topic-by-id.md) - Get single topic
- [POST /api/topics](./POST-topics.md) - Create topic (service role)
- [DELETE /api/topics/:id](./DELETE-topic-by-id.md) - Delete topic (service role)
