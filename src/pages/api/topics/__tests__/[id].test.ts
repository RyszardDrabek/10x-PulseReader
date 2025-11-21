/**
 * Integration tests for GET and DELETE /api/topics/:id endpoints
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import { GET, DELETE } from "../[id].ts";
import { TopicService } from "../../../../lib/services/topic.service.ts";

// Mock TopicService
vi.mock("../../../../lib/services/topic.service.ts");
vi.mock("../../../../lib/utils/logger.ts", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Creates a mock Astro API context
 */
function createMockContext(url: string, method: string, topicId: string, user: User | null = null): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url, {
      method,
    }),
    params: {
      id: topicId,
    },
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
 * Creates a mock service role user
 */
function createMockServiceRoleUser(overrides: Partial<User> = {}): User {
  return {
    id: "service-role-user",
    email: "service@example.com",
    aud: "service_role",
    role: "service_role",
    ...overrides,
  } as User;
}

/**
 * Test Suite: GET /api/topics/:id
 */
describe("GET /api/topics/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 200 with topic when found", async () => {
    const mockTopic = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Technology",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.spyOn(TopicService.prototype, "findById").mockResolvedValue(mockTopic);

    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "GET",
      "550e8400-e29b-41d4-a716-446655440000"
    );
    const response = await GET(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(body.name).toBe("Technology");
    expect(body.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(body.updatedAt).toBe("2024-01-01T00:00:00Z");
  });

  test("should return 404 when topic not found", async () => {
    vi.spyOn(TopicService.prototype, "findById").mockResolvedValue(null);

    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440001",
      "GET",
      "550e8400-e29b-41d4-a716-446655440001"
    );
    const response = await GET(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Topic does not exist");
    expect(body.code).toBe("NOT_FOUND");
  });

  test("should return 400 for invalid UUID format", async () => {
    const context = createMockContext("http://localhost:3000/api/topics/invalid-uuid", "GET", "invalid-uuid");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.details).toBeDefined();
  });

  test("should return 400 when id parameter is missing", async () => {
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "GET",
      ""
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (context.params as any).id = undefined;

    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Topic ID is required");
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  test("should return 500 when Supabase client is not initialized", async () => {
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "GET",
      "550e8400-e29b-41d4-a716-446655440000"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.locals.supabase = null as any;

    const response = await GET(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Server configuration error: Supabase client not available");
    expect(body.code).toBe("CONFIGURATION_ERROR");
  });

  test("should be publicly accessible (no authentication required)", async () => {
    const mockTopic = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Technology",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.spyOn(TopicService.prototype, "findById").mockResolvedValue(mockTopic);

    // No user provided
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "GET",
      "550e8400-e29b-41d4-a716-446655440000",
      null
    );
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});

/**
 * Test Suite: DELETE /api/topics/:id - Authentication
 */
describe("DELETE /api/topics/:id - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 401 when not authenticated", async () => {
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "DELETE",
      "550e8400-e29b-41d4-a716-446655440000",
      null
    );
    const response = await DELETE(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  test("should return 401 when user is not service role", async () => {
    const regularUser = {
      id: "user-1",
      email: "user@example.com",
      aud: "authenticated",
      role: "authenticated",
    } as User;

    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "DELETE",
      "550e8400-e29b-41d4-a716-446655440000",
      regularUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
    expect(body.code).toBe("FORBIDDEN");
  });
});

/**
 * Test Suite: DELETE /api/topics/:id - Validation
 */
describe("DELETE /api/topics/:id - Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 400 for invalid UUID format", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics/invalid-uuid",
      "DELETE",
      "invalid-uuid",
      serviceUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.details).toBeDefined();
  });

  test("should return 400 when id parameter is missing", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext("http://localhost:3000/api/topics/", "DELETE", "", serviceUser);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (context.params as any).id = undefined;

    const response = await DELETE(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Topic ID is required");
    expect(body.code).toBe("VALIDATION_ERROR");
  });
});

/**
 * Test Suite: DELETE /api/topics/:id - Success Cases
 */
describe("DELETE /api/topics/:id - Success Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 204 when topic deleted successfully", async () => {
    vi.spyOn(TopicService.prototype, "deleteTopic").mockResolvedValue();

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "DELETE",
      "550e8400-e29b-41d4-a716-446655440000",
      serviceUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  test("should return 404 when topic not found", async () => {
    vi.spyOn(TopicService.prototype, "deleteTopic").mockRejectedValue(new Error("NOT_FOUND"));

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440001",
      "DELETE",
      "550e8400-e29b-41d4-a716-446655440001",
      serviceUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Topic does not exist");
    expect(body.code).toBe("NOT_FOUND");
  });

  test("should return 500 when Supabase client is not initialized", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "DELETE",
      "550e8400-e29b-41d4-a716-446655440000",
      serviceUser
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.locals.supabase = null as any;

    const response = await DELETE(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Server configuration error: Supabase client not available");
  });

  test("should handle database errors gracefully", async () => {
    vi.spyOn(TopicService.prototype, "deleteTopic").mockRejectedValue(new Error("Database connection failed"));

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics/550e8400-e29b-41d4-a716-446655440000",
      "DELETE",
      "550e8400-e29b-41d4-a716-446655440000",
      serviceUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
