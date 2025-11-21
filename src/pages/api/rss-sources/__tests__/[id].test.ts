/**
 * Integration tests for GET, PATCH, and DELETE /api/rss-sources/:id endpoints
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import { GET, PATCH, DELETE } from "../[id].ts";
import { RssSourceService } from "../../../../lib/services/rss-source.service.ts";

// Mock RssSourceService
vi.mock("../../../../lib/services/rss-source.service.ts");
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
function createMockContext(
  url: string,
  method: string,
  id: string,
  body: unknown = null,
  user: User | null = null
): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : null,
    }),
    params: { id },
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
 * Test Suite: GET /api/rss-sources/:id
 */
describe("GET /api/rss-sources/:id", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 200 with RSS source", async () => {
    const mockSource = {
      id: validId,
      name: "BBC News",
      url: "https://bbc.com/rss",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.spyOn(RssSourceService.prototype, "getRssSourceById").mockResolvedValue(mockSource);

    const context = createMockContext(`http://localhost:3000/api/rss-sources/${validId}`, "GET", validId);
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(validId);
    expect(body.name).toBe("BBC News");
  });

  test("should return 404 for non-existent source", async () => {
    vi.spyOn(RssSourceService.prototype, "getRssSourceById").mockResolvedValue(null);

    const context = createMockContext(`http://localhost:3000/api/rss-sources/${validId}`, "GET", validId);
    const response = await GET(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("RSS source not found");
    expect(body.code).toBe("NOT_FOUND");
  });

  test("should return 400 for invalid UUID format", async () => {
    const invalidId = "not-a-uuid";
    const context = createMockContext(`http://localhost:3000/api/rss-sources/${invalidId}`, "GET", invalidId);
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 when id is missing", async () => {
    const context = createMockContext("http://localhost:3000/api/rss-sources/", "GET", "");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("RSS source ID is required");
  });
});

/**
 * Test Suite: PATCH /api/rss-sources/:id - Authentication
 */
describe("PATCH /api/rss-sources/:id - Authentication", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 401 without authentication", async () => {
    const payload = { name: "Updated Name" };
    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "PATCH",
      validId,
      payload,
      null
    );
    const response = await PATCH(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  test("should return 401 for non-service-role user", async () => {
    const payload = { name: "Updated Name" };
    const regularUser = {
      id: "user-123",
      role: "authenticated",
    } as User;

    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "PATCH",
      validId,
      payload,
      regularUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
  });
});

/**
 * Test Suite: PATCH /api/rss-sources/:id - Validation
 */
describe("PATCH /api/rss-sources/:id - Validation", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 400 for invalid UUID format", async () => {
    const payload = { name: "Updated Name" };
    const invalidId = "not-a-uuid";
    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${invalidId}`,
      "PATCH",
      invalidId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 when no fields provided", async () => {
    const payload = {};
    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "PATCH",
      validId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 for invalid URL format", async () => {
    const payload = { url: "not-a-valid-url" };
    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "PATCH",
      validId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });
});

/**
 * Test Suite: PATCH /api/rss-sources/:id - Success
 */
describe("PATCH /api/rss-sources/:id - Success", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 200 with updated RSS source", async () => {
    const payload = { name: "Updated Name" };
    const mockUpdatedSource = {
      id: validId,
      name: payload.name,
      url: "https://example.com/rss",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    };

    vi.spyOn(RssSourceService.prototype, "updateRssSource").mockResolvedValue(mockUpdatedSource);

    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "PATCH",
      validId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(validId);
    expect(body.name).toBe(payload.name);
  });
});

/**
 * Test Suite: PATCH /api/rss-sources/:id - Errors
 */
describe("PATCH /api/rss-sources/:id - Errors", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 404 for non-existent source", async () => {
    const payload = { name: "Updated Name" };
    vi.spyOn(RssSourceService.prototype, "updateRssSource").mockRejectedValue(new Error("NOT_FOUND"));

    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "PATCH",
      validId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("RSS source not found");
  });

  test("should return 409 for duplicate URL", async () => {
    const payload = { url: "https://example.com/rss" };
    vi.spyOn(RssSourceService.prototype, "updateRssSource").mockRejectedValue(new Error("DUPLICATE_URL"));

    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "PATCH",
      validId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("RSS source with this URL already exists");
  });
});

/**
 * Test Suite: DELETE /api/rss-sources/:id - Authentication
 */
describe("DELETE /api/rss-sources/:id - Authentication", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 401 without authentication", async () => {
    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "DELETE",
      validId,
      null,
      null
    );
    const response = await DELETE(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  test("should return 401 for non-service-role user", async () => {
    const regularUser = {
      id: "user-123",
      role: "authenticated",
    } as User;

    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "DELETE",
      validId,
      null,
      regularUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
  });
});

/**
 * Test Suite: DELETE /api/rss-sources/:id - Success
 */
describe("DELETE /api/rss-sources/:id - Success", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 204 on successful deletion", async () => {
    vi.spyOn(RssSourceService.prototype, "deleteRssSource").mockResolvedValue(undefined);

    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "DELETE",
      validId,
      null,
      serviceRoleUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});

/**
 * Test Suite: DELETE /api/rss-sources/:id - Errors
 */
describe("DELETE /api/rss-sources/:id - Errors", () => {
  const validId = "550e8400-e29b-41d4-a716-446655440000";
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 404 for non-existent source", async () => {
    vi.spyOn(RssSourceService.prototype, "deleteRssSource").mockRejectedValue(new Error("NOT_FOUND"));

    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${validId}`,
      "DELETE",
      validId,
      null,
      serviceRoleUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("RSS source not found");
  });

  test("should return 400 for invalid UUID format", async () => {
    const invalidId = "not-a-uuid";
    const context = createMockContext(
      `http://localhost:3000/api/rss-sources/${invalidId}`,
      "DELETE",
      invalidId,
      null,
      serviceRoleUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });
});
