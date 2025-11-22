# API Endpoint Implementation Plan: Profile Management (/api/profile)

## 1. Endpoint Overview

The `/api/profile` endpoint provides full CRUD operations for managing authenticated user profiles and preferences. This endpoint enables users to configure their content filtering preferences (mood and blocklist) that are used to personalize their article feed experience.

**Key Features:**

- Full CRUD operations (GET, POST, PATCH, DELETE)
- Authentication required for all operations
- User can only access their own profile (enforced by RLS)
- Supports mood-based filtering preferences (positive, neutral, negative, or null)
- Supports blocklist for filtering out unwanted content
- Auto-creation capability for seamless user onboarding

**Primary Use Cases:**

1. User viewing their profile settings after registration
2. User updating preferences (mood or blocklist)
3. User creating initial profile after account creation
4. User deleting their profile (account cleanup)

**Response Time Target:** < 200ms p95 latency for all operations

---

## 2. Request Details

### HTTP Methods

| Method   | Endpoint       | Purpose                                         |
| -------- | -------------- | ----------------------------------------------- |
| `GET`    | `/api/profile` | Retrieve authenticated user's profile           |
| `POST`   | `/api/profile` | Create new profile for authenticated user       |
| `PATCH`  | `/api/profile` | Update authenticated user's profile preferences |
| `DELETE` | `/api/profile` | Delete authenticated user's profile             |

### URL Structure

All endpoints use the same base path:

```
/api/profile
```

### Authentication

**Required for all operations**

- **Authentication Header:** `Authorization: Bearer <supabase_jwt_token>`
- **User Context:** Extracted from `context.locals.user` (set by middleware)
- **RLS Enforcement:** Database-level security ensures users can only access their own profile

### Request Parameters

#### GET /api/profile

- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** None

#### POST /api/profile

- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** Required
  ```json
  {
    "mood": "neutral" | "positive" | "negative" | null,
    "blocklist": string[]
  }
  ```

#### PATCH /api/profile

- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** Required (partial update)
  ```json
  {
    "mood": "positive" | "neutral" | "negative" | null,
    "blocklist": string[]
  }
  ```
  Both fields are optional for partial updates.

#### DELETE /api/profile

- **Path Parameters:** None
- **Query Parameters:** None
- **Request Body:** None

### Example Requests

**GET Request:**

```http
GET /api/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**POST Request:**

```http
POST /api/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "mood": "positive",
  "blocklist": ["covid", "election"]
}
```

**PATCH Request:**

```http
PATCH /api/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "mood": "neutral",
  "blocklist": ["tabloid.com"]
}
```

**DELETE Request:**

```http
DELETE /api/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Used Types

The following types from `src/types.ts` are used in this implementation:

### Entity Types

```typescript
ProfileEntity {
  id: string;
  userId: string;
  mood: UserMood | null;
  blocklist: string[];
  createdAt: string;
  updatedAt: string;
}

UserMood = "positive" | "neutral" | "negative"
```

### DTO Types

```typescript
ProfileDto = ProfileEntity; // Direct mapping
```

### Command Models

```typescript
CreateProfileCommand {
  mood?: UserMood | null;
  blocklist?: string[];
}

UpdateProfileCommand {
  mood?: UserMood | null;
  blocklist?: string[];
}
```

### Database Types

```typescript
ProfileInsert {
  id?: string;
  userId: string;
  mood?: UserMood | null;
  blocklist?: string[];
  createdAt?: string;
  updatedAt?: string;
}

ProfileUpdate {
  mood?: UserMood | null;
  blocklist?: string[];
  updatedAt?: string;
}
```

### Validation Schemas (to be created)

Zod schemas will be created in `src/lib/validation/profile.schema.ts`:

```typescript
CreateProfileCommandSchema;
UpdateProfileCommandSchema;
```

---

## 4. Response Details

### GET /api/profile

#### Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "mood": "positive",
  "blocklist": ["covid", "election", "tabloid.com"],
  "createdAt": "2025-11-10T08:00:00Z",
  "updatedAt": "2025-11-15T09:00:00Z"
}
```

#### Error Responses

**401 Unauthorized:**

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**404 Not Found:**

```json
{
  "error": "Profile not found",
  "code": "PROFILE_NOT_FOUND",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**Note:** The specification mentions "should auto-create" for 404, but the implementation should return 404. Auto-creation can be handled by the frontend calling POST if needed.

### POST /api/profile

#### Success Response (201 Created)

**Status Code:** `201 Created`

**Content-Type:** `application/json`

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "mood": "neutral",
  "blocklist": [],
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

#### Error Responses

**400 Bad Request - Validation Error:**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "mood",
      "message": "Invalid mood value. Must be one of: positive, neutral, negative, or null"
    }
  ],
  "timestamp": "2025-11-15T10:00:00Z"
}
```

**401 Unauthorized:**

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

**409 Conflict:**

```json
{
  "error": "Profile already exists for this user",
  "code": "PROFILE_EXISTS",
  "timestamp": "2025-11-15T10:00:00Z"
}
```

### PATCH /api/profile

#### Success Response (200 OK)

**Status Code:** `200 OK`

**Content-Type:** `application/json`

**Response Body:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "mood": "positive",
  "blocklist": ["covid", "election", "tabloid.com"],
  "updatedAt": "2025-11-15T10:30:00Z"
}
```

**Note:** Response includes all profile fields, not just updated ones. The `updatedAt` timestamp reflects the update time.

#### Error Responses

**400 Bad Request - Invalid Mood:**

```json
{
  "error": "Invalid mood value. Must be one of: positive, neutral, negative, or null",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**400 Bad Request - Validation Error:**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "blocklist",
      "message": "Blocklist must be an array of strings"
    }
  ],
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**401 Unauthorized:**

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**404 Not Found:**

```json
{
  "error": "Profile not found",
  "code": "PROFILE_NOT_FOUND",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

### DELETE /api/profile

#### Success Response (204 No Content)

**Status Code:** `204 No Content`

**Content-Type:** None (no response body)

#### Error Responses

**401 Unauthorized:**

```json
{
  "error": "Authentication required",
  "code": "AUTHENTICATION_REQUIRED",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

**404 Not Found:**

```json
{
  "error": "Profile not found",
  "code": "PROFILE_NOT_FOUND",
  "timestamp": "2025-11-15T10:30:00Z"
}
```

---

## 5. Data Flow

### High-Level Flow Diagram

```
┌──────────────┐
│    Client    │
└──────┬───────┘
       │ HTTP Request (GET/POST/PATCH/DELETE)
       ▼
┌──────────────────────────────────────────────────────────┐
│              Astro API Route Handler                      │
│  (src/pages/api/profile/index.ts)                        │
├──────────────────────────────────────────────────────────┤
│  1. Extract user from context.locals.user                │
│  2. Validate authentication (401 if missing)             │
│  3. Parse and validate request body (if applicable)      │
│  4. Call ProfileService method                           │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              ProfileService                               │
│  (src/lib/services/profile.service.ts)                   │
├──────────────────────────────────────────────────────────┤
│  1. Map command to database format (snake_case)          │
│  2. Execute Supabase query                               │
│  3. Handle database errors                               │
│  4. Map response to entity format (camelCase)            │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Supabase Database                            │
│  (app.profiles table)                                    │
├──────────────────────────────────────────────────────────┤
│  1. RLS policies enforce user_id = auth.uid()             │
│  2. Execute query (SELECT/INSERT/UPDATE/DELETE)          │
│  3. Return result or error                               │
└──────┬───────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              Response Mapping                             │
├──────────────────────────────────────────────────────────┤
│  1. Convert snake_case to camelCase                       │
│  2. Map to ProfileDto                                    │
│  3. Return JSON response                                  │
└──────────────────────────────────────────────────────────┘
```

### Detailed Flow by Operation

#### GET /api/profile Flow

1. **Request Reception:**
   - Route handler receives GET request
   - Extracts user from `context.locals.user`
   - Validates user exists (return 401 if not)

2. **Service Call:**
   - Calls `ProfileService.getProfile(userId)`
   - Service queries `app.profiles` table filtered by `user_id`
   - RLS policy ensures only user's own profile is returned

3. **Response Handling:**
   - If profile found: Map to `ProfileDto` and return 200 OK
   - If profile not found: Return 404 Not Found
   - If database error: Log and return 500 Internal Server Error

#### POST /api/profile Flow

1. **Request Reception:**
   - Route handler receives POST request
   - Extracts user from `context.locals.user`
   - Validates user exists (return 401 if not)
   - Parses request body JSON

2. **Validation:**
   - Validates request body with Zod schema (`CreateProfileCommandSchema`)
   - Returns 400 Bad Request if validation fails

3. **Service Call:**
   - Calls `ProfileService.createProfile(userId, command)`
   - Service checks if profile already exists (return 409 Conflict)
   - Service inserts new profile with `user_id` from authenticated user
   - RLS policy ensures user can only insert their own profile

4. **Response Handling:**
   - If created successfully: Map to `ProfileDto` and return 201 Created
   - If profile exists: Return 409 Conflict
   - If database error: Log and return 500 Internal Server Error

#### PATCH /api/profile Flow

1. **Request Reception:**
   - Route handler receives PATCH request
   - Extracts user from `context.locals.user`
   - Validates user exists (return 401 if not)
   - Parses request body JSON

2. **Validation:**
   - Validates request body with Zod schema (`UpdateProfileCommandSchema`)
   - Validates mood enum value if provided
   - Returns 400 Bad Request if validation fails

3. **Service Call:**
   - Calls `ProfileService.updateProfile(userId, command)`
   - Service checks if profile exists (return 404 if not)
   - Service updates only provided fields (partial update)
   - RLS policy ensures user can only update their own profile
   - Database trigger updates `updated_at` timestamp automatically

4. **Response Handling:**
   - If updated successfully: Map to `ProfileDto` and return 200 OK
   - If profile not found: Return 404 Not Found
   - If database error: Log and return 500 Internal Server Error

#### DELETE /api/profile Flow

1. **Request Reception:**
   - Route handler receives DELETE request
   - Extracts user from `context.locals.user`
   - Validates user exists (return 401 if not)

2. **Service Call:**
   - Calls `ProfileService.deleteProfile(userId)`
   - Service checks if profile exists (return 404 if not)
   - Service deletes profile
   - RLS policy ensures user can only delete their own profile

3. **Response Handling:**
   - If deleted successfully: Return 204 No Content
   - If profile not found: Return 404 Not Found
   - If database error: Log and return 500 Internal Server Error

---

## 6. Security Considerations

### Authentication

1. **Token Validation:**
   - All endpoints require valid Supabase JWT token
   - Token is validated by middleware (`src/middleware/index.ts`)
   - User context is extracted from `context.locals.user`
   - Missing or invalid token returns 401 Unauthorized

2. **User Context Extraction:**
   ```typescript
   const user = context.locals.user;
   if (!user || !user.id) {
     return new Response(
       JSON.stringify({
         error: "Authentication required",
         code: "AUTHENTICATION_REQUIRED",
       }),
       { status: 401 }
     );
   }
   ```

### Authorization

1. **Row-Level Security (RLS):**
   - Database enforces user isolation via RLS policies
   - Users can only access profiles where `user_id = auth.uid()`
   - Policies exist for SELECT, INSERT, UPDATE, DELETE operations
   - Service layer should still validate user context for clear error messages

2. **User ID Enforcement:**
   - `userId` is always derived from authenticated user context
   - Request body should NOT include `userId` (security risk)
   - Service methods accept `userId` as parameter, not from request

### Input Validation

1. **Request Body Validation:**
   - Use Zod schemas for all input validation
   - Validate `mood` enum: must be "positive", "neutral", "negative", or null
   - Validate `blocklist`: must be array of strings
   - Sanitize blocklist items (trim whitespace, validate length)
   - Return 400 Bad Request with detailed validation errors

2. **Data Type Validation:**
   - Ensure `mood` is valid enum value or null
   - Ensure `blocklist` is array of strings
   - Validate array length limits (e.g., max 100 items in blocklist)
   - Validate string length for blocklist items (e.g., max 200 characters per item)

3. **Business Logic Validation:**
   - POST: Check for existing profile before creation (409 Conflict)
   - PATCH/DELETE: Check profile exists before update/delete (404 Not Found)
   - Ensure `userId` matches authenticated user (RLS handles this, but validate for clear errors)

### Data Protection

1. **Error Message Sanitization:**
   - Never expose internal database errors to clients
   - Return generic error messages for 500 errors
   - Include detailed validation errors for 400 errors (helpful for debugging)
   - Log full error details server-side for debugging

2. **SQL Injection Prevention:**
   - Use Supabase query builder (parameterized queries)
   - Never construct SQL strings manually
   - All queries use `.eq()`, `.insert()`, `.update()` methods

3. **Data Exposure:**
   - Only return profile data for authenticated user
   - Never expose other users' profiles
   - RLS policies provide defense-in-depth

### Security Threats and Mitigations

| Threat                                       | Mitigation                                                         |
| -------------------------------------------- | ------------------------------------------------------------------ |
| Unauthorized access to other users' profiles | RLS policies enforce user isolation                                |
| SQL injection attacks                        | Use Supabase query builder (parameterized queries)                 |
| Invalid input causing database errors        | Zod validation before database operations                          |
| Token tampering                              | Supabase validates JWT signature and expiration                    |
| Missing authentication                       | Middleware validates token before route handler                    |
| User ID manipulation                         | Extract userId from authenticated context, never from request body |

---

## 7. Error Handling

### Error Response Format

All error responses follow this structure:

```typescript
interface ErrorResponse {
  error: string; // Human-readable error message
  code?: string; // Machine-readable error code (optional)
  details?: ValidationErrorDetails[] | Record<string, unknown>; // Additional error details
  timestamp?: string; // ISO 8601 timestamp
}

interface ValidationErrorDetails {
  field?: string;
  message: string;
}
```

### Error Scenarios by Endpoint

#### GET /api/profile

| Error Scenario               | Status Code | Error Code              | Response Message             |
| ---------------------------- | ----------- | ----------------------- | ---------------------------- |
| Missing authentication token | 401         | AUTHENTICATION_REQUIRED | Authentication required      |
| Invalid/expired token        | 401         | AUTHENTICATION_REQUIRED | Authentication required      |
| Profile not found            | 404         | PROFILE_NOT_FOUND       | Profile not found            |
| Database connection error    | 500         | DATABASE_ERROR          | Internal server error        |
| Unexpected error             | 500         | INTERNAL_ERROR          | An unexpected error occurred |

#### POST /api/profile

| Error Scenario               | Status Code | Error Code              | Response Message                                                         |
| ---------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------ |
| Missing authentication token | 401         | AUTHENTICATION_REQUIRED | Authentication required                                                  |
| Invalid JSON in request body | 400         | INVALID_JSON            | Invalid JSON in request body                                             |
| Invalid mood value           | 400         | VALIDATION_ERROR        | Invalid mood value. Must be one of: positive, neutral, negative, or null |
| Invalid blocklist format     | 400         | VALIDATION_ERROR        | Blocklist must be an array of strings                                    |
| Profile already exists       | 409         | PROFILE_EXISTS          | Profile already exists for this user                                     |
| Database connection error    | 500         | DATABASE_ERROR          | Internal server error                                                    |
| Unexpected error             | 500         | INTERNAL_ERROR          | An unexpected error occurred                                             |

#### PATCH /api/profile

| Error Scenario               | Status Code | Error Code              | Response Message                                                         |
| ---------------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------ |
| Missing authentication token | 401         | AUTHENTICATION_REQUIRED | Authentication required                                                  |
| Invalid JSON in request body | 400         | INVALID_JSON            | Invalid JSON in request body                                             |
| Invalid mood value           | 400         | VALIDATION_ERROR        | Invalid mood value. Must be one of: positive, neutral, negative, or null |
| Invalid blocklist format     | 400         | VALIDATION_ERROR        | Blocklist must be an array of strings                                    |
| Profile not found            | 404         | PROFILE_NOT_FOUND       | Profile not found                                                        |
| Database connection error    | 500         | DATABASE_ERROR          | Internal server error                                                    |
| Unexpected error             | 500         | INTERNAL_ERROR          | An unexpected error occurred                                             |

#### DELETE /api/profile

| Error Scenario               | Status Code | Error Code              | Response Message             |
| ---------------------------- | ----------- | ----------------------- | ---------------------------- |
| Missing authentication token | 401         | AUTHENTICATION_REQUIRED | Authentication required      |
| Profile not found            | 404         | PROFILE_NOT_FOUND       | Profile not found            |
| Database connection error    | 500         | DATABASE_ERROR          | Internal server error        |
| Unexpected error             | 500         | INTERNAL_ERROR          | An unexpected error occurred |

### Error Handling Implementation

**1. Authentication Errors:**

```typescript
const user = context.locals.user;
if (!user || !user.id) {
  return new Response(
    JSON.stringify({
      error: "Authentication required",
      code: "AUTHENTICATION_REQUIRED",
      timestamp: new Date().toISOString(),
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**2. Validation Errors (Zod):**

```typescript
try {
  const validatedCommand = CreateProfileCommandSchema.parse(requestBody);
} catch (error) {
  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        details: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
        timestamp: new Date().toISOString(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  throw error;
}
```

**3. Business Logic Errors:**

```typescript
// Profile already exists (POST)
if (existingProfile) {
  return new Response(
    JSON.stringify({
      error: "Profile already exists for this user",
      code: "PROFILE_EXISTS",
      timestamp: new Date().toISOString(),
    }),
    { status: 409, headers: { "Content-Type": "application/json" } }
  );
}

// Profile not found (GET, PATCH, DELETE)
if (!profile) {
  return new Response(
    JSON.stringify({
      error: "Profile not found",
      code: "PROFILE_NOT_FOUND",
      timestamp: new Date().toISOString(),
    }),
    { status: 404, headers: { "Content-Type": "application/json" } }
  );
}
```

**4. Database Errors:**

```typescript
try {
  const result = await profileService.createProfile(userId, command);
} catch (error) {
  logger.error("Database error creating profile", {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });

  // Check for specific database errors
  if (error instanceof DatabaseError) {
    // Handle unique constraint violation (409 Conflict)
    if (error.supabaseError.code === "23505") {
      return new Response(
        JSON.stringify({
          error: "Profile already exists for this user",
          code: "PROFILE_EXISTS",
          timestamp: new Date().toISOString(),
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Generic database error
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      code: "DATABASE_ERROR",
      timestamp: new Date().toISOString(),
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

**5. Unexpected Errors:**

```typescript
catch (error) {
  logger.error("Unexpected error in profile endpoint", {
    endpoint: request.method,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  return new Response(
    JSON.stringify({
      error: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
      timestamp: new Date().toISOString()
    }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
```

### Error Logging

All errors should be logged with appropriate severity levels:

- **401 Unauthorized:** Log as warning (expected for unauthenticated requests)
- **400 Bad Request:** Log as warning (client error, expected)
- **404 Not Found:** Log as info (expected behavior)
- **409 Conflict:** Log as info (expected behavior for duplicate creation)
- **500 Internal Server Error:** Log as error/critical with full stack trace

---

## 8. Performance Considerations

### Database Queries

1. **Index Usage:**
   - `idx_profiles_user_id` index ensures fast lookups by `user_id`
   - All queries filter by `user_id`, leveraging the index
   - Expected query time: < 50ms for indexed lookups

2. **Query Optimization:**
   - Use `.single()` for GET operations (expects exactly one result)
   - Use `.select("*")` to fetch all fields (small table, acceptable)
   - Avoid N+1 queries (not applicable for profile endpoint)

3. **Connection Pooling:**
   - Supabase client handles connection pooling automatically
   - No manual connection management required

### Response Size

- Profile entity is small (~200-500 bytes JSON)
- Blocklist array can grow, but typical size is < 50 items
- No pagination needed for single profile response

### Caching Considerations

1. **Client-Side Caching:**
   - Profile data can be cached on client side
   - Cache invalidation on PATCH/DELETE operations
   - Consider ETag headers for conditional requests (future enhancement)

2. **Server-Side Caching:**
   - Not recommended for user-specific data (low benefit, high complexity)
   - RLS policies make caching difficult

### Performance Targets

- **GET /api/profile:** < 100ms p95 latency
- **POST /api/profile:** < 150ms p95 latency
- **PATCH /api/profile:** < 150ms p95 latency
- **DELETE /api/profile:** < 100ms p95 latency

### Potential Bottlenecks

1. **Database Connection:**
   - Supabase connection pooling handles this
   - Monitor connection pool usage in production

2. **RLS Policy Evaluation:**
   - RLS policies add minimal overhead (< 5ms)
   - Policies are optimized for `user_id` lookups

3. **JSON Parsing:**
   - Request body parsing is negligible for small payloads
   - Use streaming JSON parser for large blocklists (if needed)

---

## 9. Implementation Steps

### Step 1: Create Validation Schemas

**File:** `src/lib/validation/profile.schema.ts`

1. Create Zod schemas for `CreateProfileCommand` and `UpdateProfileCommand`
2. Validate `mood` enum: "positive" | "neutral" | "negative" | null
3. Validate `blocklist`: array of strings, optional, max length per item
4. Export schemas for use in route handler

**Validation Rules:**

- `mood`: Optional, must be one of "positive", "neutral", "negative", or null
- `blocklist`: Optional array, each item must be non-empty string, max 200 characters per item, max 100 items total

### Step 2: Create Profile Service

**File:** `src/lib/services/profile.service.ts`

1. Create `ProfileService` class following `ArticleService` pattern
2. Implement `getProfile(userId: string): Promise<ProfileEntity | null>`
3. Implement `createProfile(userId: string, command: CreateProfileCommand): Promise<ProfileEntity>`
4. Implement `updateProfile(userId: string, command: UpdateProfileCommand): Promise<ProfileEntity>`
5. Implement `deleteProfile(userId: string): Promise<void>`
6. Add helper method to check if profile exists
7. Map database responses from snake_case to camelCase
8. Handle database errors (unique constraint violations, not found, etc.)

**Service Methods:**

```typescript
class ProfileService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getProfile(userId: string): Promise<ProfileEntity | null>;
  async createProfile(userId: string, command: CreateProfileCommand): Promise<ProfileEntity>;
  async updateProfile(userId: string, command: UpdateProfileCommand): Promise<ProfileEntity>;
  async deleteProfile(userId: string): Promise<void>;
  private async profileExists(userId: string): Promise<boolean>;
  private mapDbToEntity(row: Database["app"]["Tables"]["profiles"]["Row"]): ProfileEntity;
}
```

### Step 3: Create API Route Handler

**File:** `src/pages/api/profile/index.ts`

1. Create Astro API route handler with all HTTP methods (GET, POST, PATCH, DELETE)
2. Extract user from `context.locals.user`
3. Validate authentication for all methods
4. Parse request body for POST/PATCH
5. Validate request body with Zod schemas
6. Call appropriate ProfileService method
7. Handle errors and return appropriate status codes
8. Map responses to DTOs

**Route Handler Structure:**

```typescript
export const prerender = false;

export const GET: APIRoute = async (context) => {
  /* ... */
};
export const POST: APIRoute = async (context) => {
  /* ... */
};
export const PATCH: APIRoute = async (context) => {
  /* ... */
};
export const DELETE: APIRoute = async (context) => {
  /* ... */
};
```

### Step 4: Implement GET Handler

1. Extract user from context
2. Validate authentication (return 401 if missing)
3. Call `profileService.getProfile(userId)`
4. Return 200 OK with ProfileDto if found
5. Return 404 Not Found if profile doesn't exist
6. Handle errors appropriately

### Step 5: Implement POST Handler

1. Extract user from context
2. Validate authentication (return 401 if missing)
3. Parse request body JSON
4. Validate request body with `CreateProfileCommandSchema`
5. Check if profile already exists (return 409 Conflict if exists)
6. Call `profileService.createProfile(userId, command)`
7. Return 201 Created with ProfileDto
8. Handle validation errors (400), conflict errors (409), and database errors (500)

### Step 6: Implement PATCH Handler

1. Extract user from context
2. Validate authentication (return 401 if missing)
3. Parse request body JSON
4. Validate request body with `UpdateProfileCommandSchema`
5. Check if profile exists (return 404 if not found)
6. Call `profileService.updateProfile(userId, command)`
7. Return 200 OK with updated ProfileDto
8. Handle validation errors (400), not found errors (404), and database errors (500)

### Step 7: Implement DELETE Handler

1. Extract user from context
2. Validate authentication (return 401 if missing)
3. Check if profile exists (return 404 if not found)
4. Call `profileService.deleteProfile(userId)`
5. Return 204 No Content on success
6. Handle not found errors (404) and database errors (500)

### Step 8: Add Error Handling

1. Implement comprehensive error handling for all scenarios
2. Use try-catch blocks around service calls
3. Handle Zod validation errors
4. Handle database errors (unique constraint violations, not found)
5. Handle unexpected errors
6. Log errors with appropriate severity levels
7. Return appropriate HTTP status codes and error messages

### Step 9: Add Logging

1. Import logger from `src/lib/utils/logger.ts`
2. Log authentication failures (warning level)
3. Log validation errors (warning level)
4. Log business logic errors (info level for expected, error level for unexpected)
5. Log database errors (error level with full details)
6. Log successful operations (debug level, optional)

### Step 10: Write Unit Tests

**File:** `src/lib/services/__tests__/profile.service.test.ts`

1. Test `getProfile` method:
   - Returns profile when exists
   - Returns null when not found
   - Handles database errors

2. Test `createProfile` method:
   - Creates profile successfully
   - Handles duplicate profile (409 Conflict)
   - Handles database errors

3. Test `updateProfile` method:
   - Updates profile successfully
   - Handles partial updates
   - Handles profile not found (404)
   - Handles database errors

4. Test `deleteProfile` method:
   - Deletes profile successfully
   - Handles profile not found (404)
   - Handles database errors

### Step 11: Write Integration Tests

**File:** `src/pages/api/profile/__tests__/index.test.ts`

1. Test GET endpoint:
   - Returns 200 OK with profile when authenticated
   - Returns 401 when not authenticated
   - Returns 404 when profile doesn't exist

2. Test POST endpoint:
   - Returns 201 Created when profile created successfully
   - Returns 401 when not authenticated
   - Returns 400 when validation fails
   - Returns 409 when profile already exists

3. Test PATCH endpoint:
   - Returns 200 OK when profile updated successfully
   - Returns 401 when not authenticated
   - Returns 400 when validation fails
   - Returns 404 when profile doesn't exist

4. Test DELETE endpoint:
   - Returns 204 No Content when profile deleted successfully
   - Returns 401 when not authenticated
   - Returns 404 when profile doesn't exist

### Step 12: Update Documentation

1. Update API documentation with endpoint details
2. Add examples for all operations
3. Document error responses
4. Update OpenAPI/Swagger spec if applicable

### Step 13: Code Review and Refactoring

1. Review code for consistency with existing patterns
2. Ensure error handling is comprehensive
3. Verify logging is appropriate
4. Check for code duplication
5. Ensure type safety throughout

### Step 14: Performance Testing

1. Test endpoint response times
2. Verify database query performance
3. Test with various blocklist sizes
4. Monitor database connection usage

### Step 15: Security Review

1. Verify authentication is enforced
2. Verify RLS policies are working correctly
3. Test with invalid tokens
4. Test with malformed request bodies
5. Verify user isolation (users can't access other users' profiles)

---

## Summary

This implementation plan provides comprehensive guidance for implementing the `/api/profile` CRUD endpoints. The plan follows established patterns from the existing codebase (ArticleService, article endpoints) and ensures:

- **Security:** Authentication required, RLS enforcement, input validation
- **Error Handling:** Comprehensive error scenarios with appropriate status codes
- **Performance:** Optimized database queries, appropriate indexing
- **Maintainability:** Clear separation of concerns, consistent patterns, comprehensive logging

The implementation should be straightforward following the existing ArticleService and article endpoint patterns, with the main differences being:

- Simpler data model (no joins or complex relationships)
- User-scoped operations (all operations filtered by authenticated user)
- Simpler validation (mood enum and blocklist array)
