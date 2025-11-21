# GET /api/profile - Get User Profile

Retrieve the authenticated user's profile with their mood preferences and blocklist settings.

## Authentication

**Required:** User authentication

This endpoint requires a valid Supabase JWT token for an authenticated user. Users can only access their own profile.

```
Authorization: Bearer <user_jwt_token>
```

## Request

**Method:** `GET`  
**URL:** `/api/profile`  
**Content-Type:** Not required (no request body)

### Request Body

None

### Example Request with curl

```bash
curl -X GET https://your-domain.com/api/profile \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

## Response

### Success Response (200 OK)

Returns the user's profile entity with all preferences.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "mood": "positive",
  "blocklist": [
    "covid",
    "election",
    "tabloid.com"
  ],
  "createdAt": "2025-11-10T08:00:00Z",
  "updatedAt": "2025-11-15T09:00:00Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique profile identifier |
| `userId` | string (UUID) | Reference to authenticated user (matches token) |
| `mood` | enum \| null | User's preferred mood filter: "positive", "neutral", "negative", or null (no preference) |
| `blocklist` | array of strings | List of keywords and URL fragments to filter out |
| `createdAt` | string (ISO 8601) | When the profile was created |
| `updatedAt` | string (ISO 8601) | When the profile was last updated |

### Error Responses

#### 401 Unauthorized - Authentication Required

Returned when no authentication token is provided or the token is invalid.

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### 404 Not Found - Profile Not Found

Returned when the authenticated user doesn't have a profile yet. The frontend should call POST /api/profile to create one.

```json
{
  "error": "Profile not found",
  "code": "PROFILE_NOT_FOUND",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

## Implementation Details

### Data Flow

1. **Authentication Check**: Validates user JWT token
2. **User Extraction**: Extracts user ID from authenticated context
3. **Profile Query**: Queries `app.profiles` table filtered by `user_id`
4. **RLS Enforcement**: Database-level security ensures users can only access their own profile
5. **Response Mapping**: Converts database snake_case to camelCase DTO format
6. **Response**: Returns profile entity or 404 if not found

### Security

- **Row-Level Security (RLS)**: Database policies enforce user isolation
- **User Context**: User ID is always derived from authenticated token, never from request
- **No User ID in Request**: Request body should never include `userId` (security risk)

## Usage Examples

### TypeScript Example

```typescript
async function getUserProfile(token: string) {
  const response = await fetch('https://your-domain.com/api/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 200) {
    const profile = await response.json();
    console.log('User mood:', profile.mood);
    console.log('Blocklist items:', profile.blocklist.length);
    return profile;
  } else if (response.status === 404) {
    // Profile doesn't exist - create one
    return null;
  } else {
    const error = await response.json();
    throw new Error(error.error);
  }
}
```

### React Example

```typescript
import { useQuery } from '@tanstack/react-query';

function useProfile() {
  const { data: session } = useSession(); // Supabase session
  
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Profile doesn't exist yet
        }
        throw new Error('Failed to fetch profile');
      }
      
      return response.json();
    },
    enabled: !!session,
  });
}
```

## Performance

- **Target latency**: < 100ms (p95)
- **Caching**: Consider caching profile data on client side
- **Cache invalidation**: Invalidate cache on PATCH/DELETE operations

## See Also

- [POST /api/profile](./POST-profile.md) - Create profile
- [PATCH /api/profile](./PATCH-profile.md) - Update profile
- [DELETE /api/profile](./DELETE-profile.md) - Delete profile

