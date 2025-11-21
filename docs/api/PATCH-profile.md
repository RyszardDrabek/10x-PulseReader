# PATCH /api/profile - Update User Profile

Update the authenticated user's profile preferences. Supports partial updates - only provided fields are updated.

## Authentication

**Required:** User authentication

This endpoint requires a valid Supabase JWT token for an authenticated user. Users can only update their own profile.

```
Authorization: Bearer <user_jwt_token>
```

## Request

**Method:** `PATCH`  
**URL:** `/api/profile`  
**Content-Type:** `application/json`

### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `mood` | enum \| null | No | User's preferred mood filter | One of: "positive", "neutral", "negative", or null |
| `blocklist` | array of strings | No | List of keywords and URL fragments to filter out | Max 100 items, each item max 200 characters |

**Note:** `userId` is automatically derived from the authenticated user's token and should NOT be included in the request body.

### Example Requests

#### Update Only Mood

```json
{
  "mood": "positive"
}
```

#### Update Only Blocklist

```json
{
  "blocklist": ["covid", "election", "tabloid.com"]
}
```

#### Update Both Fields

```json
{
  "mood": "neutral",
  "blocklist": ["politics"]
}
```

#### Clear Mood Preference (set to null)

```json
{
  "mood": null
}
```

### Example with curl

```bash
curl -X PATCH https://your-domain.com/api/profile \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mood": "positive",
    "blocklist": ["covid", "election"]
  }'
```

## Response

### Success Response (200 OK)

Returns the updated profile entity with all fields (not just updated ones).

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
  "updatedAt": "2025-11-15T10:30:00Z"
}
```

**Note:** The `updatedAt` timestamp reflects the update time.

### Error Responses

#### 400 Bad Request - Validation Error

Returned when the request body fails validation.

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "mood",
      "message": "Invalid mood value. Must be one of: positive, neutral, negative, or null"
    },
    {
      "field": "blocklist",
      "message": "Blocklist items cannot be empty"
    }
  ],
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**Common validation errors:**
- Invalid mood value (not in enum)
- Blocklist item exceeds 200 characters
- Blocklist contains more than 100 items
- Blocklist item is empty string

#### 400 Bad Request - Invalid JSON

```json
{
  "error": "Invalid JSON in request body",
  "code": "INVALID_JSON",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### 401 Unauthorized - Authentication Required

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

#### 404 Not Found - Profile Not Found

Returned when the authenticated user doesn't have a profile. Call POST /api/profile to create one first.

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
3. **Request Parsing**: Parses JSON body
4. **Input Validation**: Validates against Zod schema
5. **Profile Existence Check**: Verifies profile exists for user
6. **Partial Update**: Updates only provided fields in database
7. **RLS Enforcement**: Database-level security ensures users can only update their own profile
8. **Timestamp Update**: Database trigger automatically updates `updated_at` timestamp
9. **Response**: Returns updated profile entity with all fields

### Partial Update Behavior

- **Only provided fields are updated**: If you only send `mood`, `blocklist` remains unchanged
- **Empty request body**: If no fields are provided, returns existing profile unchanged
- **Null values**: Explicitly setting `mood: null` clears the mood preference

### Security

- **Row-Level Security (RLS)**: Database policies enforce user isolation
- **User ID Enforcement**: `userId` is always derived from authenticated context, never from request body
- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Protection**: Uses Supabase parameterized queries

## Usage Examples

### TypeScript Example

```typescript
async function updateProfile(
  token: string,
  updates: {
    mood?: 'positive' | 'neutral' | 'negative' | null;
    blocklist?: string[];
  }
) {
  const response = await fetch('https://your-domain.com/api/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (response.status === 200) {
    const profile = await response.json();
    console.log('Profile updated:', profile.id);
    return profile;
  } else if (response.status === 404) {
    console.log('Profile not found, create one first');
    throw new Error('Profile not found');
  } else {
    const error = await response.json();
    throw new Error(error.error);
  }
}
```

### React Example - Settings Form

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useUpdateProfile() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: {
      mood?: 'positive' | 'neutral' | 'negative' | null;
      blocklist?: string[];
    }) => {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate profile query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// Usage in component
function SettingsForm() {
  const updateProfile = useUpdateProfile();
  const { data: profile } = useProfile();
  
  const handleMoodChange = async (mood: 'positive' | 'neutral' | 'negative' | null) => {
    try {
      await updateProfile.mutateAsync({ mood });
      // Show success toast
    } catch (error) {
      // Show error toast
    }
  };
  
  const handleBlocklistUpdate = async (blocklist: string[]) => {
    try {
      await updateProfile.mutateAsync({ blocklist });
      // Show success toast
    } catch (error) {
      // Show error toast
    }
  };
  
  // ... form JSX
}
```

### Clearing Preferences

```typescript
// Clear mood preference (show all sentiments)
await updateProfile({ mood: null });

// Clear blocklist (no filtering)
await updateProfile({ blocklist: [] });

// Clear both
await updateProfile({ mood: null, blocklist: [] });
```

## Best Practices

1. **Partial Updates**: Only send fields that need to be updated
2. **Optimistic Updates**: Update UI optimistically, then sync with server response
3. **Error Handling**: Handle 404 gracefully (profile may need to be created first)
4. **Validation**: Validate blocklist items on client side before sending
5. **Cache Invalidation**: Invalidate profile cache after successful update

## Performance

- **Target latency**: < 150ms (p95)
- **Database**: Uses indexed `user_id` lookup for fast profile retrieval

## See Also

- [GET /api/profile](./GET-profile.md) - Retrieve profile
- [POST /api/profile](./POST-profile.md) - Create profile
- [DELETE /api/profile](./DELETE-profile.md) - Delete profile

