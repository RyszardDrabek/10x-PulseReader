/**
 * Integration tests for GET and POST /api/topics endpoints
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
 * Test Suite: GET /api/topics
 */
describe("GET /api/topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 200 with paginated topics", async () => {
    const mockTopics = {
      data: [
        {
          id: "topic-1",
          name: "Technology",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "topic-2",
          name: "Politics",
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ],
      pagination: {
        limit: 100,
        offset: 0,
        total: 2,
        hasMore: false,
      },
    };

    vi.spyOn(TopicService.prototype, "findAll").mockResolvedValue(mockTopics);

    const context = createMockContext("http://localhost:3000/api/topics?limit=100&offset=0", "GET");
    const response = await GET(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.limit).toBe(100);
    expect(body.pagination.offset).toBe(0);
    expect(body.pagination.hasMore).toBe(false);
  });

  test("should apply search filter when provided", async () => {
    const mockTopics = {
      data: [
        {
          id: "topic-1",
          name: "Technology",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      pagination: {
        limit: 100,
        offset: 0,
        total: 1,
        hasMore: false,
      },
    };

    vi.spyOn(TopicService.prototype, "findAll").mockResolvedValue(mockTopics);

    const context = createMockContext("http://localhost:3000/api/topics?search=tech", "GET");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Technology");
  });

  test("should return 400 for invalid limit", async () => {
    const context = createMockContext("http://localhost:3000/api/topics?limit=invalid", "GET");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.details).toBeDefined();
  });

  test("should return 400 for limit exceeding maximum", async () => {
    const context = createMockContext("http://localhost:3000/api/topics?limit=1000", "GET");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 for negative offset", async () => {
    const context = createMockContext("http://localhost:3000/api/topics?offset=-1", "GET");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 500 when Supabase client is not initialized", async () => {
    const context = createMockContext("http://localhost:3000/api/topics", "GET");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.locals.supabase = null as any;

    const response = await GET(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Server configuration error: Supabase client not available");
    expect(body.code).toBe("CONFIGURATION_ERROR");
  });

  test("should use default pagination when parameters not provided", async () => {
    const mockTopics = {
      data: [],
      pagination: {
        limit: 100,
        offset: 0,
        total: 0,
        hasMore: false,
      },
    };

    vi.spyOn(TopicService.prototype, "findAll").mockResolvedValue(mockTopics);

    const context = createMockContext("http://localhost:3000/api/topics", "GET");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pagination.limit).toBe(100);
    expect(body.pagination.offset).toBe(0);
  });
});

/**
 * Test Suite: POST /api/topics - Authentication
 */
describe("POST /api/topics - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 401 when not authenticated", async () => {
    const context = createMockContext("http://localhost:3000/api/topics", "POST", { name: "Technology" }, null);
    const response = await POST(context);

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

    const context = createMockContext("http://localhost:3000/api/topics", "POST", { name: "Technology" }, regularUser);
    const response = await POST(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
    expect(body.code).toBe("FORBIDDEN");
  });
});

/**
 * Test Suite: POST /api/topics - Validation
 */
describe("POST /api/topics - Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 400 for invalid JSON", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext("http://localhost:3000/api/topics", "POST", "invalid json", serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON in request body");
    expect(body.code).toBe("INVALID_JSON");
  });

  test("should return 400 when name is missing", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext("http://localhost:3000/api/topics", "POST", {}, serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  test("should return 400 when name is empty", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext("http://localhost:3000/api/topics", "POST", { name: "" }, serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("should return 400 when name exceeds maximum length", async () => {
    const serviceUser = createMockServiceRoleUser();
    const longName = "a".repeat(501);
    const context = createMockContext("http://localhost:3000/api/topics", "POST", { name: longName }, serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });
});

/**
 * Test Suite: POST /api/topics - Success Cases
 */
describe("POST /api/topics - Success Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 201 when creating new topic", async () => {
    const mockTopic = {
      id: "topic-1",
      name: "Climate Change",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.spyOn(TopicService.prototype, "createOrFindTopic").mockResolvedValue({
      topic: mockTopic,
      created: true,
    });

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics",
      "POST",
      { name: "Climate Change" },
      serviceUser
    );
    const response = await POST(context);

    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.id).toBe("topic-1");
    expect(body.name).toBe("Climate Change");
    expect(body.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(body.updatedAt).toBe("2024-01-01T00:00:00Z");
  });

  test("should return 200 when topic already exists (case-insensitive)", async () => {
    const mockTopic = {
      id: "topic-1",
      name: "climate change",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.spyOn(TopicService.prototype, "createOrFindTopic").mockResolvedValue({
      topic: mockTopic,
      created: false,
    });

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics",
      "POST",
      { name: "Climate Change" },
      serviceUser
    );
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("topic-1");
    expect(body.name).toBe("climate change");
  });

  test("should trim whitespace from topic name", async () => {
    const mockTopic = {
      id: "topic-1",
      name: "Technology",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    vi.spyOn(TopicService.prototype, "createOrFindTopic").mockResolvedValue({
      topic: mockTopic,
      created: true,
    });

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(
      "http://localhost:3000/api/topics",
      "POST",
      { name: "  Technology  " },
      serviceUser
    );
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe("Technology");
  });

  test("should return 500 when Supabase client is not initialized", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext("http://localhost:3000/api/topics", "POST", { name: "Technology" }, serviceUser);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.locals.supabase = null as any;

    const response = await POST(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Server configuration error: Supabase client not available");
  });
});
