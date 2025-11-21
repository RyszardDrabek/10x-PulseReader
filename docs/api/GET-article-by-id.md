# GET /api/articles/:id - Get Article by ID

Retrieve a single article by its ID. This endpoint is publicly accessible and does not require authentication.

## Authentication

**Optional:** No authentication required

This endpoint is publicly accessible. All users (including guests) can retrieve article details.

## Request

**Method:** `GET`  
**URL:** `/api/articles/:id`  
**Content-Type:** `application/json`

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | Yes | The unique identifier of the article |

### Example Request

```bash
curl https://your-domain.com/api/articles/550e8400-e29b-41d4-a716-446655440000
```

## Response

### Success Response (200 OK)

Returns the complete article with nested source and topics information.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Breaking: Major Climate Agreement Reached",
  "description": "World leaders have agreed to significant emissions reductions...",
  "link": "https://bbcnews.com/world/climate-agreement-2025",
  "publicationDate": "2025-11-15T10:30:00Z",
  "sentiment": "positive",
  "source": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "BBC News - World",
    "url": "http://feeds.bbci.co.uk/news/world/rss.xml"
  },
  "topics": [
    {
      "id": "f1e2d3c4-b5a6-7890-fedc-ba0987654321",
      "name": "climate"
    },
    {
      "id": "a9b8c7d6-e5f4-3210-abcd-ef9876543210",
      "name": "politics"
    }
  ],
  "createdAt": "2025-11-15T10:35:22.123Z",
  "updatedAt": "2025-11-15T10:35:22.123Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique article identifier |
| `title` | string | Article title |
| `description` | string \| null | Article description or excerpt |
| `link` | string (URL) | Link to the full article |
| `publicationDate` | string (ISO 8601) | Original publication date |
| `sentiment` | enum \| null | AI-analyzed sentiment: "positive", "neutral", "negative", or null |
| `source` | object | RSS source information |
| `source.id` | string (UUID) | Source identifier |
| `source.name` | string | Source name |
| `source.url` | string (URL) | RSS feed URL |
| `topics` | array | Associated topics |
| `topics[].id` | string (UUID) | Topic identifier |
| `topics[].name` | string | Topic name |
| `createdAt` | string (ISO 8601) | When the article was created in the system |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

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
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 404 Not Found

Returned when the article with the specified ID does not exist.

```json
{
  "error": "Article not found",
  "code": "NOT_FOUND",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T10:35:00Z"
}
```

## Implementation Details

### Data Flow

1. **Path Parameter Extraction**: Extracts `id` from URL path
2. **UUID Validation**: Validates UUID format using Zod schema
3. **Database Query**: Queries article with JOINs to `rss_sources` and `topics` tables
4. **Response Mapping**: Converts database snake_case to camelCase DTO format
5. **Response**: Returns ArticleDto with nested source and topics

### Performance Considerations

- Single database query with JOINs for optimal performance
- Database indexes ensure fast lookups by article ID
- Response includes all related data in one request

## Usage Examples

### JavaScript/TypeScript

```typescript
async function getArticle(articleId: string) {
  const response = await fetch(`https://your-domain.com/api/articles/${articleId}`);
  
  if (response.status === 200) {
    const article = await response.json();
    console.log('Article:', article.title);
    console.log('Source:', article.source.name);
    console.log('Topics:', article.topics.map(t => t.name));
    return article;
  } else if (response.status === 404) {
    console.log('Article not found');
    return null;
  } else {
    const error = await response.json();
    throw new Error(error.error);
  }
}
```

### React Example

```typescript
import { useEffect, useState } from 'react';

function ArticleDetail({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<ArticleDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const response = await fetch(`/api/articles/${articleId}`);
        if (response.ok) {
          const data = await response.json();
          setArticle(data);
        }
      } catch (error) {
        console.error('Failed to fetch article:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArticle();
  }, [articleId]);

  if (loading) return <div>Loading...</div>;
  if (!article) return <div>Article not found</div>;

  return (
    <article>
      <h1>{article.title}</h1>
      <p>{article.description}</p>
      <p>Source: {article.source.name}</p>
      <p>Topics: {article.topics.map(t => t.name).join(', ')}</p>
      <a href={article.link}>Read full article</a>
    </article>
  );
}
```

## See Also

- [GET /api/articles](./get-articles.md) - Retrieve paginated list of articles
- [POST /api/articles](./POST-articles.md) - Create article (service role)
- [PATCH /api/articles/:id](./PATCH-article-by-id.md) - Update article (service role)
- [DELETE /api/articles/:id](./DELETE-article-by-id.md) - Delete article (service role)

