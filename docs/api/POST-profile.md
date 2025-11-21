# POST /api/profile - Create User Profile

Create a new profile for the authenticated user with their mood preferences and blocklist settings.

## Authentication

**Required:** User authentication

This endpoint requires a valid Supabase JWT token for an authenticated user. Users can only create their own profile.

```
Authorization: Bearer <user_jwt_token>
```

## Request

**Method:** `POST`  
**URL:** `/api/profile`  
**Content-Type:** `application/json`

### Request Body

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `mood` | enum \| null | No | User's preferred mood filter | One of: "positive", "neutral", "negative", or null (defaults to null) |
| `blocklist` | array of strings | No | List of keywords and URL fragments to filter out | Max 100 items, each item max 200 characters, defaults to empty array |

**Note:** `userId` is automatically derived from the authenticated user's token and should NOT be included in the request body.

### Example Request

```json
{
  "mood": "positive",
  "blocklist": ["covid", "election", "tabloid.com"]
}
```

### Example with curl

```bash
curl -X POST https://your-domain.com/api/profile \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mood": "positive",
    "blocklist": ["covid", "election"]
  }'
```

### Minimal Request (all fields optional)

```json
{}
```

This will create a profile with default values:
- `mood`: `null` (no preference)
- `blocklist`: `[]` (empty array)

## Response

### Success Response (201 Created)

Returns the created profile entity with database-generated fields populated.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "mood": "positive",
  "blocklist": [
    "covid",
    "election"
  ],
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

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
      "message": "Maximum 100 items allowed in blocklist"
    }
  ],
  "timestamp": "2025-11-15T10:00:00Z"
}
```

**Common validation errors:**
- Invalid mood value (not in enum: "positive", "neutral", "negative", or null)
- Blocklist item exceeds 200 characters
- Blocklist contains more than 100 items
- Blocklist item is empty string

#### 400 Bad Request - Invalid JSON

```json
{
  "error": "Invalid JSON in request body",
  "code": "INVALID_JSON",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

#### 401 Unauthorized - Authentication Required

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

#### 409 Conflict - Profile Already Exists

Returned when the user already has a profile. Use PATCH /api/profile to update instead.

```json
{
  "error": "Profile already exists for this user",
  "code": "PROFILE_EXISTS",
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

1. **Authentication Check**: Validates user JWT token
2. **User Extraction**: Extracts user ID from authenticated context
3. **Duplicate Check**: Verifies user doesn't already have a profile
4. **Request Parsing**: Parses JSON body
5. **Input Validation**: Validates against Zod schema
6. **Profile Creation**: Inserts profile into database with `user_id` from authenticated user
7. **RLS Enforcement**: Database-level security ensures users can only create their own profile
8. **Response**: Returns created profile entity

### Security

- **Row-Level Security (RLS)**: Database policies enforce user isolation
- **User ID Enforcement**: `userId` is always derived from authenticated context, never from request body
- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Protection**: Uses Supabase parameterized queries

## Usage Examples

### TypeScript Example

```typescript
async function createProfile(
  token: string,
  preferences: {
    mood?: 'positive' | 'neutral' | 'negative' | null;
    blocklist?: string[];
  }
) {
  const response = await fetch('https://your-domain.com/api/profile', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  });

  if (response.status === 201) {
    const profile = await response.json();
    console.log('Profile created:', profile.id);
    return profile;
  } else if (response.status === 409) {
    console.log('Profile already exists, use PATCH to update');
    throw new Error('Profile already exists');
  } else {
    const error = await response.json();
    throw new Error(error.error);
  }
}
```

### React Example - Onboarding Flow

```typescript
import { useMutation } from '@tanstack/react-query';

function useCreateProfile() {
  const { data: session } = useSession();
  
  return useMutation({
    mutationFn: async (preferences: {
      mood?: 'positive' | 'neutral' | 'negative' | null;
      blocklist?: string[];
    }) => {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      return response.json();
    },
  });
}

// Usage in component
function OnboardingForm() {
  const createProfile = useCreateProfile();
  
  const handleSubmit = async (formData: FormData) => {
    try {
      await createProfile.mutateAsync({
        mood: formData.get('mood') as string,
        blocklist: formData.getAll('blocklist') as string[],
      });
      // Redirect to main feed
    } catch (error) {
      if (error.message.includes('already exists')) {
        // Profile exists, redirect to settings
      }
    }
  };
  
  // ... form JSX
}
```

## Best Practices

1. **Onboarding**: Call this endpoint after user registration to create initial profile
2. **Error Handling**: Handle 409 Conflict gracefully (profile may have been auto-created)
3. **Validation**: Validate blocklist items on client side before sending (trim whitespace, check length)
4. **Default Values**: All fields are optional - profile can be created with empty preferences

## Performance

- **Target latency**: < 150ms (p95)
- **Database**: Uses unique index on `user_id` for fast duplicate checks

## See Also

- [GET /api/profile](./GET-profile.md) - Retrieve profile
- [PATCH /api/profile](./PATCH-profile.md) - Update profile
- [DELETE /api/profile](./DELETE-profile.md) - Delete profile

