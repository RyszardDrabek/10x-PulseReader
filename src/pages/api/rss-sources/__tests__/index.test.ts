/**
 * Integration tests for GET and POST /api/rss-sources endpoints
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import { GET, POST } from "../index.ts";
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
function createMockContext(url: string, method: string, body: unknown = null, user: User | null = null): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : null,
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
 * Test Suite: GET /api/rss-sources
 */
describe("GET /api/rss-sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 200 with paginated RSS sources", async () => {
    const mockSources = {
      data: [
        {
          id: "source-1",
          name: "BBC News",
          url: "https://bbc.com/rss",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      pagination: {
        limit: 50,
        offset: 0,
        total: 1,
        hasMore: false,
      },
    };

    vi.spyOn(RssSourceService.prototype, "getRssSources").mockResolvedValue(mockSources);

    const context = createMockContext("http://localhost:3000/api/rss-sources?limit=50&offset=0", "GET");
    const response = await GET(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
  });

  test("should return 400 for invalid limit", async () => {
    const context = createMockContext("http://localhost:3000/api/rss-sources?limit=invalid", "GET");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  test("should return 400 for invalid offset", async () => {
    const context = createMockContext("http://localhost:3000/api/rss-sources?offset=-1", "GET");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 500 when Supabase client is not initialized", async () => {
    const context = createMockContext("http://localhost:3000/api/rss-sources", "GET");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.locals.supabase = null as any;

    const response = await GET(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Server configuration error: Supabase client not available");
  });
});

/**
 * Test Suite: POST /api/rss-sources - Authentication
 */
describe("POST /api/rss-sources - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 401 without authentication", async () => {
    const validPayload = {
      name: "Test Source",
      url: "https://example.com/rss",
    };

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", validPayload, null);
    const response = await POST(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  test("should return 401 for non-service-role user", async () => {
    const validPayload = {
      name: "Test Source",
      url: "https://example.com/rss",
    };

    const regularUser = {
      id: "user-123",
      email: "test@example.com",
      aud: "authenticated",
      role: "authenticated",
    } as User;

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", validPayload, regularUser);
    const response = await POST(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
    expect(body.code).toBe("FORBIDDEN");
  });
});

/**
 * Test Suite: POST /api/rss-sources - Validation
 */
describe("POST /api/rss-sources - Validation", () => {
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 400 for invalid JSON", async () => {
    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", "invalid json", serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON in request body");
    expect(body.code).toBe("INVALID_JSON");
  });

  test("should return 400 for missing name", async () => {
    const invalidPayload = {
      url: "https://example.com/rss",
    };

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", invalidPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  test("should return 400 for missing url", async () => {
    const invalidPayload = {
      name: "Test Source",
    };

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", invalidPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 for invalid URL format", async () => {
    const invalidPayload = {
      name: "Test Source",
      url: "not-a-valid-url",
    };

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", invalidPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 for name too long", async () => {
    const invalidPayload = {
      name: "a".repeat(501),
      url: "https://example.com/rss",
    };

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", invalidPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 for URL too long", async () => {
    const invalidPayload = {
      name: "Test Source",
      url: `https://example.com/${"a".repeat(2000)}`,
    };

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", invalidPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });
});

/**
 * Test Suite: POST /api/rss-sources - Success Cases
 */
describe("POST /api/rss-sources - Success", () => {
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 201 with created RSS source", async () => {
    const validPayload = {
      name: "Test Source",
      url: "https://example.com/rss",
    };

    const mockCreatedSource = {
      id: "source-1",
      name: validPayload.name,
      url: validPayload.url,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.spyOn(RssSourceService.prototype, "createRssSource").mockResolvedValue(mockCreatedSource);

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", validPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe("source-1");
    expect(body.name).toBe(validPayload.name);
    expect(body.url).toBe(validPayload.url);
  });
});

/**
 * Test Suite: POST /api/rss-sources - Error Cases
 */
describe("POST /api/rss-sources - Errors", () => {
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 409 for duplicate URL", async () => {
    const validPayload = {
      name: "Test Source",
      url: "https://example.com/rss",
    };

    vi.spyOn(RssSourceService.prototype, "createRssSource").mockRejectedValue(new Error("DUPLICATE_URL"));

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", validPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("RSS source with this URL already exists");
    expect(body.code).toBe("DUPLICATE_URL");
  });

  test("should return 500 for unexpected errors", async () => {
    const validPayload = {
      name: "Test Source",
      url: "https://example.com/rss",
    };

    vi.spyOn(RssSourceService.prototype, "createRssSource").mockRejectedValue(new Error("Unexpected error"));

    const context = createMockContext("http://localhost:3000/api/rss-sources", "POST", validPayload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
