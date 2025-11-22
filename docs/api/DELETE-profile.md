# DELETE /api/profile - Delete User Profile

Delete the authenticated user's profile. This removes all user preferences including mood and blocklist settings.

## Authentication

**Required:** User authentication

This endpoint requires a valid Supabase JWT token for an authenticated user. Users can only delete their own profile.

```
Authorization: Bearer <user_jwt_token>
```

## Request

**Method:** `DELETE`  
**URL:** `/api/profile`  
**Content-Type:** Not required (no request body)

### Request Body

None

### Example Request with curl

```bash
curl -X DELETE https://your-domain.com/api/profile \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

## Response

### Success Response (204 No Content)

Returns no content on successful deletion.

**Status Code:** `204 No Content`  
**Response Body:** Empty

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

Returned when the authenticated user doesn't have a profile to delete.

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
3. **Profile Existence Check**: Verifies profile exists for user
4. **Profile Deletion**: Deletes profile from database
5. **RLS Enforcement**: Database-level security ensures users can only delete their own profile
6. **Response**: Returns 204 No Content on success

### Security

- **Row-Level Security (RLS)**: Database policies enforce user isolation
- **User ID Enforcement**: `userId` is always derived from authenticated context
- **Cascade Behavior**: Profile deletion is handled by database (no cascade needed as profile has no dependent records)

## Usage Examples

### TypeScript Example

```typescript
async function deleteProfile(token: string) {
  const response = await fetch("https://your-domain.com/api/profile", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    console.log("Profile deleted successfully");
    return true;
  } else if (response.status === 404) {
    console.log("Profile not found");
    return false;
  } else {
    const error = await response.json();
    throw new Error(error.error);
  }
}
```

### React Example - Account Deletion Flow

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

function useDeleteProfile() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/profile', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.status === 204) {
        return true;
      } else if (response.status === 404) {
        // Profile doesn't exist - treat as success
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.error);
      }
    },
    onSuccess: () => {
      // Clear profile cache
      queryClient.removeQueries({ queryKey: ['profile'] });
      // Optionally redirect to onboarding or logout
      router.push('/onboarding');
    },
  });
}

// Usage in component
function AccountSettings() {
  const deleteProfile = useDeleteProfile();

  const handleDeleteProfile = async () => {
    if (!confirm('Are you sure you want to delete your profile? This will reset all your preferences.')) {
      return;
    }

    try {
      await deleteProfile.mutateAsync();
      // Show success message
    } catch (error) {
      // Show error message
    }
  };

  return (
    <button onClick={handleDeleteProfile}>
      Delete Profile
    </button>
  );
}
```

## Use Cases

### Account Cleanup

When a user wants to reset their preferences or delete their account:

```typescript
// Delete profile before account deletion
await deleteProfile(token);
// Then delete user account via Supabase Auth
```

### Reset Preferences

Users can delete their profile to reset all preferences, then create a new one:

```typescript
// Delete existing profile
await deleteProfile(token);
// Create new profile with default preferences
await createProfile(token, {});
```

## Best Practices

1. **Confirmation**: Always ask for user confirmation before deleting profile
2. **User Feedback**: Show clear messaging about what will be deleted
3. **Recreation**: Inform users they can create a new profile after deletion
4. **Error Handling**: Handle 404 gracefully (profile may not exist)
5. **Cache Clearing**: Clear profile cache after successful deletion

## Performance

- **Target latency**: < 100ms (p95)
- **Database**: Uses indexed `user_id` lookup for fast profile deletion

## See Also

- [GET /api/profile](./GET-profile.md) - Retrieve profile
- [POST /api/profile](./POST-profile.md) - Create profile
- [PATCH /api/profile](./PATCH-profile.md) - Update profile
