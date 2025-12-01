/**
 * Integration tests for /api/profile endpoints
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach, type MockedFunction } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import type { ProfileEntity } from "../../../../types.ts";
import { GET, POST, PATCH, DELETE } from "../index.ts";
import { ProfileService } from "../../../../lib/services/profile.service.ts";

// Mock ProfileService
vi.mock("../../../../lib/services/profile.service.ts");
vi.mock("../../../../lib/utils/logger.ts", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase createClient to return a mock client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
  })),
}));

/**
 * Creates a mock Astro API context
 */
function createMockContext(url: string, method: string, body: unknown = null, user: User | null = null): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body && typeof body === "string" ? body : body ? JSON.stringify(body) : undefined,
    }),
    params: {},
    props: {},
    locals: {
      supabase: mockSupabase,
      user,
    },
    url: new URL(url),
    site: undefined,
    redirect: vi.fn(),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
    },
    generator: "test",
  } as unknown as APIContext;
}

/**
 * Creates a mock authenticated user
 */
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    ...overrides,
  } as User;
}

/**
 * Creates a mock profile entity
 */
function createMockProfile(overrides: Partial<ProfileEntity> = {}): ProfileEntity {
  return {
    id: "profile-123",
    userId: "user-123",
    mood: "neutral",
    blocklist: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Test Suite: GET /api/profile
 */
describe("GET /api/profile", () => {
  let mockGetProfile: MockedFunction<ProfileService["getProfile"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProfile = vi.fn();
    vi.mocked(ProfileService).mockImplementation(
      () =>
        ({
          getProfile: mockGetProfile,
        }) as unknown as ProfileService
    );
  });

  test("should return 200 OK with profile when authenticated", async () => {
    const user = createMockUser();
    const mockProfile = createMockProfile();

    mockGetProfile.mockResolvedValue(mockProfile);

    const context = createMockContext("http://localhost:3000/api/profile", "GET", null, user);
    const response = await GET(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.id).toBe(mockProfile.id);
    expect(body.userId).toBe(mockProfile.userId);
    expect(body.mood).toBe(mockProfile.mood);
    expect(body.blocklist).toEqual(mockProfile.blocklist);
  });

  test("should return 401 when not authenticated", async () => {
    const context = createMockContext("http://localhost:3000/api/profile", "GET", null, null);
    const response = await GET(context);

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
    expect(body.timestamp).toBeDefined();
  });

  test("should return 404 when profile doesn't exist", async () => {
    const user = createMockUser();

    mockGetProfile.mockResolvedValue(null);

    const context = createMockContext("http://localhost:3000/api/profile", "GET", null, user);
    const response = await GET(context);

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Profile not found");
    expect(body.code).toBe("PROFILE_NOT_FOUND");
    expect(body.timestamp).toBeDefined();
  });

  test("should always initialize Supabase client", async () => {
    const user = createMockUser();
    const context = createMockContext("http://localhost:3000/api/profile", "GET", null, user);
    // Override locals.supabase to null - client should still work
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.locals.supabase = null as any;

    // This should work since we now always create a service role client
    mockGetProfile.mockResolvedValue(createMockProfile());

    const response = await GET(context);

    expect(response.status).toBe(200);
  });
});

/**
 * Test Suite: POST /api/profile
 */
describe("POST /api/profile", () => {
  let mockCreateProfile: MockedFunction<ProfileService["createProfile"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateProfile = vi.fn();
    vi.mocked(ProfileService).mockImplementation(
      () =>
        ({
          createProfile: mockCreateProfile,
        }) as unknown as ProfileService
    );
  });

  test("should return 201 Created when profile created successfully", async () => {
    const user = createMockUser();
    const payload = {
      mood: "positive",
      blocklist: ["covid", "election"],
    };
    const mockProfile = createMockProfile({ mood: "positive", blocklist: ["covid", "election"] });

    mockCreateProfile.mockResolvedValue(mockProfile);

    const context = createMockContext("http://localhost:3000/api/profile", "POST", payload, user);
    const response = await POST(context);

    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.id).toBe(mockProfile.id);
    expect(body.mood).toBe("positive");
    expect(body.blocklist).toEqual(["covid", "election"]);
  });

  test("should return 401 when not authenticated", async () => {
    const payload = {
      mood: "neutral",
      blocklist: [],
    };

    const context = createMockContext("http://localhost:3000/api/profile", "POST", payload, null);
    const response = await POST(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  test("should return 400 when validation fails", async () => {
    const user = createMockUser();
    const payload = {
      mood: "invalid-mood",
      blocklist: "not-an-array",
    };

    const context = createMockContext("http://localhost:3000/api/profile", "POST", payload, user);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
  });

  test("should return 409 when profile already exists", async () => {
    const user = createMockUser();
    const payload = {
      mood: "neutral",
      blocklist: [],
    };

    mockCreateProfile.mockRejectedValue(new Error("PROFILE_EXISTS"));

    const context = createMockContext("http://localhost:3000/api/profile", "POST", payload, user);
    const response = await POST(context);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Profile already exists for this user");
    expect(body.code).toBe("PROFILE_EXISTS");
  });

  test("should return 400 for invalid JSON", async () => {
    const user = createMockUser();
    const invalidJson = "{ invalid json }";

    const context = createMockContext("http://localhost:3000/api/profile", "POST", invalidJson, user);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON in request body");
    expect(body.code).toBe("INVALID_JSON");
  });

  test("should validate mood enum values", async () => {
    const user = createMockUser();
    const validMoods = ["positive", "neutral", "negative", null];

    for (const mood of validMoods) {
      const payload = { mood, blocklist: [] };
      const mockProfile = createMockProfile({
        mood: mood as "positive" | "neutral" | "negative" | null,
      });

      mockCreateProfile.mockResolvedValueOnce(mockProfile);

      const context = createMockContext("http://localhost:3000/api/profile", "POST", payload, user);
      const response = await POST(context);

      expect(response.status).toBe(201);
    }
  });

  test("should validate blocklist array constraints", async () => {
    const user = createMockUser();

    // Test max items (100)
    const tooManyItems = Array.from({ length: 101 }, (_, i) => `item-${i}`);
    const payload = {
      mood: "neutral",
      blocklist: tooManyItems,
    };

    const context = createMockContext("http://localhost:3000/api/profile", "POST", payload, user);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.details.some((d: { field: string }) => d.field === "blocklist")).toBe(true);
  });
});

/**
 * Test Suite: PATCH /api/profile
 */
describe("PATCH /api/profile", () => {
  let mockUpdateProfile: MockedFunction<ProfileService["updateProfile"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile = vi.fn();
    vi.mocked(ProfileService).mockImplementation(
      () =>
        ({
          updateProfile: mockUpdateProfile,
        }) as unknown as ProfileService
    );
  });

  test("should return 200 OK when profile updated successfully", async () => {
    const user = createMockUser();
    const payload = {
      mood: "positive",
      blocklist: ["covid"],
    };
    const updatedProfile = createMockProfile({ mood: "positive", blocklist: ["covid"] });

    mockUpdateProfile.mockResolvedValue(updatedProfile);

    const context = createMockContext("http://localhost:3000/api/profile", "PATCH", payload, user);
    const response = await PATCH(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.mood).toBe("positive");
    expect(body.blocklist).toEqual(["covid"]);
  });

  test("should return 401 when not authenticated", async () => {
    const payload = {
      mood: "neutral",
    };

    const context = createMockContext("http://localhost:3000/api/profile", "PATCH", payload, null);
    const response = await PATCH(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  test("should return 400 when validation fails", async () => {
    const user = createMockUser();
    const payload = {
      mood: "invalid-mood",
    };

    const context = createMockContext("http://localhost:3000/api/profile", "PATCH", payload, user);
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 404 when profile doesn't exist", async () => {
    const user = createMockUser();
    const payload = {
      mood: "neutral",
    };

    mockUpdateProfile.mockRejectedValue(new Error("PROFILE_NOT_FOUND"));

    const context = createMockContext("http://localhost:3000/api/profile", "PATCH", payload, user);
    const response = await PATCH(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Profile not found");
    expect(body.code).toBe("PROFILE_NOT_FOUND");
  });

  test("should support partial updates", async () => {
    const user = createMockUser();

    // Update only mood
    const payload1 = { mood: "positive" };
    const updatedProfile1 = createMockProfile({ mood: "positive" });
    mockUpdateProfile.mockResolvedValueOnce(updatedProfile1);

    const context1 = createMockContext("http://localhost:3000/api/profile", "PATCH", payload1, user);
    const response1 = await PATCH(context1);
    expect(response1.status).toBe(200);

    // Update only blocklist
    const payload2 = { blocklist: ["new-item"] };
    const updatedProfile2 = createMockProfile({ blocklist: ["new-item"] });
    mockUpdateProfile.mockResolvedValueOnce(updatedProfile2);

    const context2 = createMockContext("http://localhost:3000/api/profile", "PATCH", payload2, user);
    const response2 = await PATCH(context2);
    expect(response2.status).toBe(200);
  });

  test("should handle setting mood to null", async () => {
    const user = createMockUser();
    const payload = {
      mood: null,
    };
    const updatedProfile = createMockProfile({ mood: null });

    mockUpdateProfile.mockResolvedValue(updatedProfile);

    const context = createMockContext("http://localhost:3000/api/profile", "PATCH", payload, user);
    const response = await PATCH(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mood).toBeNull();
  });

  test("should handle mood selection and blocklist updates (settings save)", async () => {
    const user = createMockUser();

    // Test mood selection (positive)
    const moodPayload = { mood: "positive" };
    const moodUpdatedProfile = createMockProfile({ mood: "positive", blocklist: [] });
    mockUpdateProfile.mockResolvedValueOnce(moodUpdatedProfile);

    const moodContext = createMockContext("http://localhost:3000/api/profile", "PATCH", moodPayload, user);
    const moodResponse = await PATCH(moodContext);

    expect(moodResponse.status).toBe(200);
    const moodBody = await moodResponse.json();
    expect(moodBody.mood).toBe("positive");
    expect(moodBody.blocklist).toEqual([]);

    // Test blocklist update
    const blocklistPayload = { blocklist: ["politics", "sports"] };
    const blocklistUpdatedProfile = createMockProfile({ mood: "positive", blocklist: ["politics", "sports"] });
    mockUpdateProfile.mockResolvedValueOnce(blocklistUpdatedProfile);

    const blocklistContext = createMockContext("http://localhost:3000/api/profile", "PATCH", blocklistPayload, user);
    const blocklistResponse = await PATCH(blocklistContext);

    expect(blocklistResponse.status).toBe(200);
    const blocklistBody = await blocklistResponse.json();
    expect(blocklistBody.mood).toBe("positive");
    expect(blocklistBody.blocklist).toEqual(["politics", "sports"]);

    // Test combined mood and blocklist update
    const combinedPayload = { mood: "negative", blocklist: ["weather"] };
    const combinedUpdatedProfile = createMockProfile({ mood: "negative", blocklist: ["weather"] });
    mockUpdateProfile.mockResolvedValueOnce(combinedUpdatedProfile);

    const combinedContext = createMockContext("http://localhost:3000/api/profile", "PATCH", combinedPayload, user);
    const combinedResponse = await PATCH(combinedContext);

    expect(combinedResponse.status).toBe(200);
    const combinedBody = await combinedResponse.json();
    expect(combinedBody.mood).toBe("negative");
    expect(combinedBody.blocklist).toEqual(["weather"]);
  });
});

/**
 * Test Suite: DELETE /api/profile
 */
describe("DELETE /api/profile", () => {
  let mockDeleteProfile: MockedFunction<ProfileService["deleteProfile"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteProfile = vi.fn();
    vi.mocked(ProfileService).mockImplementation(
      () =>
        ({
          deleteProfile: mockDeleteProfile,
        }) as unknown as ProfileService
    );
  });

  test("should return 204 No Content when profile deleted successfully", async () => {
    const user = createMockUser();

    mockDeleteProfile.mockResolvedValue(undefined);

    const context = createMockContext("http://localhost:3000/api/profile", "DELETE", null, user);
    const response = await DELETE(context);

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  test("should return 401 when not authenticated", async () => {
    const context = createMockContext("http://localhost:3000/api/profile", "DELETE", null, null);
    const response = await DELETE(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  test("should return 404 when profile doesn't exist", async () => {
    const user = createMockUser();

    mockDeleteProfile.mockRejectedValue(new Error("PROFILE_NOT_FOUND"));

    const context = createMockContext("http://localhost:3000/api/profile", "DELETE", null, user);
    const response = await DELETE(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Profile not found");
    expect(body.code).toBe("PROFILE_NOT_FOUND");
  });
});

export {};
