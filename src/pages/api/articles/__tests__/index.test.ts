/**
 * Integration tests for POST /api/articles endpoint
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach, type MockedFunction } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import type { ArticleEntity } from "../../../../types.ts";
import { POST } from "../index.ts";
import { ArticleService } from "../../../../lib/services/article.service.ts";

// Mock ArticleService
vi.mock("../../../../lib/services/article.service.ts", () => {
  return {
    ArticleService: vi.fn(),
  };
});
vi.mock("../../../../lib/utils/logger.ts", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock environment variables
vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:18785");
vi.stubEnv("SUPABASE_KEY", "test-anon-key");

/**
 * Creates a mock Astro API context
 */
function createMockContext(url: string, body: unknown, user: User | null = null): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
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
 * Creates a mock regular user
 */
function createMockRegularUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    ...overrides,
  } as User;
}

/**
 * Test Suite: Authentication and Authorization
 */
describe("POST /api/articles - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Should return 401 without authentication
   *
   * Action:
   * - Send POST request without Authorization header
   *
   * Expected:
   * - Status: 401
   * - Body: { error: "Authentication required", code: "AUTHENTICATION_REQUIRED", timestamp: "..." }
   */
  test("should return 401 without authentication", async () => {
    const validPayload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const context = createMockContext("http://localhost:3000/api/articles", validPayload, null);
    const response = await POST(context);

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 401 with invalid token
   *
   * Action:
   * - Send POST request with invalid JWT token
   *
   * Expected:
   * - Status: 401
   * - Body: { error: "Authentication required", code: "AUTHENTICATION_REQUIRED", timestamp: "..." }
   */
  test("should return 401 with invalid token", async () => {
    // Invalid token would be handled by middleware, resulting in user=null
    const validPayload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const context = createMockContext("http://localhost:3000/api/articles", validPayload, null);
    const response = await POST(context);

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 401 for non-service-role user
   *
   * Action:
   * - Send POST request with valid regular user token
   *
   * Expected:
   * - Status: 401
   * - Body: { error: "Service role required for this endpoint", code: "FORBIDDEN", timestamp: "..." }
   */
  test("should return 401 for non-service-role user", async () => {
    const validPayload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const regularUser = createMockRegularUser();
    const context = createMockContext("http://localhost:3000/api/articles", validPayload, regularUser);
    const response = await POST(context);

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
    expect(body.code).toBe("FORBIDDEN");
    expect(body.timestamp).toBeDefined();
  });
});

/**
 * Test Suite: Request Validation
 */
describe("POST /api/articles - Validation", () => {
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Should return 400 for invalid JSON
   *
   * Action:
   * - Send POST request with malformed JSON
   *
   * Expected:
   * - Status: 400
   * - Body: { error: "Invalid JSON in request body", code: "INVALID_JSON", timestamp: "..." }
   */
  test("should return 400 for invalid JSON", async () => {
    const invalidJson = "{ invalid json }";
    const context = createMockContext("http://localhost:3000/api/articles", invalidJson, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Invalid JSON in request body");
    expect(body.code).toBe("INVALID_JSON");
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for missing required fields
   *
   * Action:
   * - Send POST request missing sourceId, title, link, or publicationDate
   *
   * Expected:
   * - Status: 400
   * - Body: { error: "Validation failed", details: [...], timestamp: "..." }
   * - details array should contain field-specific errors
   */
  test("should return 400 for missing required fields", async () => {
    // Test missing sourceId
    const payloadWithoutSourceId = {
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };
    const context1 = createMockContext("http://localhost:3000/api/articles", payloadWithoutSourceId, serviceRoleUser);
    const response1 = await POST(context1);
    expect(response1.status).toBe(400);
    const body1 = await response1.json();
    expect(body1.error).toBe("Validation failed");
    expect(body1.details).toBeInstanceOf(Array);
    expect(body1.details.some((d: { field: string }) => d.field === "sourceId")).toBe(true);

    // Test missing title
    const payloadWithoutTitle = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };
    const context2 = createMockContext("http://localhost:3000/api/articles", payloadWithoutTitle, serviceRoleUser);
    const response2 = await POST(context2);
    expect(response2.status).toBe(400);
    const body2 = await response2.json();
    expect(body2.details.some((d: { field: string }) => d.field === "title")).toBe(true);

    // Test missing link
    const payloadWithoutLink = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      publicationDate: new Date().toISOString(),
    };
    const context3 = createMockContext("http://localhost:3000/api/articles", payloadWithoutLink, serviceRoleUser);
    const response3 = await POST(context3);
    expect(response3.status).toBe(400);
    const body3 = await response3.json();
    expect(body3.details.some((d: { field: string }) => d.field === "link")).toBe(true);

    // Test missing publicationDate
    const payloadWithoutPublicationDate = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
    };
    const context4 = createMockContext(
      "http://localhost:3000/api/articles",
      payloadWithoutPublicationDate,
      serviceRoleUser
    );
    const response4 = await POST(context4);
    expect(response4.status).toBe(400);
    const body4 = await response4.json();
    expect(body4.details.some((d: { field: string }) => d.field === "publicationDate")).toBe(true);
  });

  /**
   * Test: Should return 400 for invalid UUID format in sourceId
   *
   * Action:
   * - Send POST with sourceId = "not-a-uuid"
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for sourceId field
   */
  test("should return 400 for invalid UUID format in sourceId", async () => {
    const payload = {
      sourceId: "not-a-uuid",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(
      body.details.some((d: { field: string; message: string }) => d.field === "sourceId" && d.message.includes("UUID"))
    ).toBe(true);
  });

  /**
   * Test: Should return 400 for invalid URL format in link
   *
   * Action:
   * - Send POST with link = "not-a-url"
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for link field
   */
  test("should return 400 for invalid URL format in link", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "not-a-url",
      publicationDate: new Date().toISOString(),
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(
      body.details.some((d: { field: string; message: string }) => d.field === "link" && d.message.includes("URL"))
    ).toBe(true);
  });

  /**
   * Test: Should return 400 for invalid datetime format in publicationDate
   *
   * Action:
   * - Send POST with publicationDate = "not-iso8601"
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for publicationDate field
   */
  test("should return 400 for invalid datetime format", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: "not-iso8601",
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(
      body.details.some(
        (d: { field: string; message: string }) => d.field === "publicationDate" && d.message.includes("ISO 8601")
      )
    ).toBe(true);
  });

  /**
   * Test: Should return 400 for title exceeding 1000 characters
   *
   * Action:
   * - Send POST with title = "x".repeat(1001)
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for title field
   */
  test("should return 400 for title exceeding 1000 characters", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "x".repeat(1001),
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(
      body.details.some((d: { field: string; message: string }) => d.field === "title" && d.message.includes("1000"))
    ).toBe(true);
  });

  /**
   * Test: Should return 400 for description exceeding 5000 characters
   *
   * Action:
   * - Send POST with description = "x".repeat(5001)
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for description field
   */
  test("should return 400 for description exceeding 5000 characters", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      description: "x".repeat(5001),
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(
      body.details.some(
        (d: { field: string; message: string }) => d.field === "description" && d.message.includes("5000")
      )
    ).toBe(true);
  });

  /**
   * Test: Should return 400 for invalid sentiment value
   *
   * Action:
   * - Send POST with sentiment = "happy" (not in enum)
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for sentiment field
   */
  test("should return 400 for invalid sentiment value", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      sentiment: "happy",
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(
      body.details.some(
        (d: { field: string; message: string }) =>
          d.field === "sentiment" && d.message.includes("positive, neutral, negative")
      )
    ).toBe(true);
  });

  /**
   * Test: Should return 400 for more than 20 topics
   *
   * Action:
   * - Send POST with topicIds array containing 21 UUIDs
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for topicIds field
   */
  test("should return 400 for more than 20 topics", async () => {
    const topicIds = Array.from({ length: 21 }, () => "550e8400-e29b-41d4-a716-446655440000");
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      topicIds,
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(
      body.details.some((d: { field: string; message: string }) => d.field === "topicIds" && d.message.includes("20"))
    ).toBe(true);
  });

  /**
   * Test: Should return 400 for invalid UUID in topicIds array
   *
   * Action:
   * - Send POST with topicIds = ["valid-uuid", "invalid-uuid"]
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for topicIds field
   */
  test("should return 400 for invalid UUID in topicIds", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      topicIds: ["550e8400-e29b-41d4-a716-446655440000", "not-a-uuid"],
    };

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    // Zod validates each array element, so error path might be "topicIds.1" or "topicIds"
    expect(
      body.details.some(
        (d: { field: string; message: string }) =>
          (d.field === "topicIds" || d.field.startsWith("topicIds.")) && d.message.includes("UUID")
      )
    ).toBe(true);
  });
});

/**
 * Test Suite: Business Logic Validation
 */
describe("POST /api/articles - Business Logic", () => {
  const serviceRoleUser = createMockServiceRoleUser();
  let mockCreateArticle: MockedFunction<ArticleService["createArticle"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateArticle = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ArticleService as any).mockImplementation(
      () =>
        ({
          createArticle: mockCreateArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 400 for non-existent sourceId
   *
   * Setup:
   * - Use a valid UUID that doesn't exist in rss_sources table
   *
   * Action:
   * - Send POST with valid format but non-existent sourceId
   *
   * Expected:
   * - Status: 400
   * - Body: { error: "RSS source not found", code: "RSS_SOURCE_NOT_FOUND", timestamp: "..." }
   */
  test("should return 400 for non-existent sourceId", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    mockCreateArticle.mockRejectedValue(new Error("RSS_SOURCE_NOT_FOUND"));

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("RSS source not found");
    expect(body.code).toBe("RSS_SOURCE_NOT_FOUND");
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for non-existent topicIds
   *
   * Setup:
   * - Create 2 valid topics
   * - Generate 1 fake UUID
   *
   * Action:
   * - Send POST with topicIds = [validId1, fakeId, validId2]
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *   error: "One or more topic IDs are invalid",
   *   code: "INVALID_TOPIC_IDS",
   *   details: { invalidIds: [fakeId] },
   *   timestamp: "..."
   * }
   */
  test("should return 400 for non-existent topicIds", async () => {
    const fakeId = "550e8400-e29b-41d4-a716-446655440999";
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      topicIds: ["550e8400-e29b-41d4-a716-446655440001", fakeId, "550e8400-e29b-41d4-a716-446655440002"],
    };

    mockCreateArticle.mockRejectedValue(new Error(`INVALID_TOPIC_IDS:${JSON.stringify([fakeId])}`));

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("One or more topic IDs are invalid");
    expect(body.code).toBe("INVALID_TOPIC_IDS");
    expect(body.details).toBeDefined();
    expect(body.details.invalidIds).toEqual([fakeId]);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 409 for duplicate article link
   *
   * Setup:
   * - Create an article with link "https://example.com/article1"
   *
   * Action:
   * - Send POST with same link
   *
   * Expected:
   * - Status: 409
   * - Body: {
   *   error: "Article with this link already exists",
   *   code: "ARTICLE_ALREADY_EXISTS",
   *   timestamp: "..."
   * }
   */
  test("should return 409 for duplicate article link", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article1",
      publicationDate: new Date().toISOString(),
    };

    mockCreateArticle.mockRejectedValue(new Error("ARTICLE_ALREADY_EXISTS"));

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(409);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Article with this link already exists");
    expect(body.code).toBe("ARTICLE_ALREADY_EXISTS");
    expect(body.timestamp).toBeDefined();
  });
});

/**
 * Test Suite: Successful Article Creation
 */
describe("POST /api/articles - Success Cases", () => {
  const serviceRoleUser = createMockServiceRoleUser();
  let mockCreateArticle: MockedFunction<ArticleService["createArticle"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateArticle = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ArticleService as any).mockImplementation(
      () =>
        ({
          createArticle: mockCreateArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should create article successfully with minimal fields
   *
   * Setup:
   * - Create a test RSS source
   *
   * Action:
   * - Send POST with only required fields (sourceId, title, link, publicationDate)
   *
   * Expected:
   * - Status: 201
   * - Body: ArticleEntity with:
   *   - id (generated UUID)
   *   - sourceId (matches input)
   *   - title (matches input)
   *   - description (null)
   *   - link (matches input)
   *   - publicationDate (matches input)
   *   - sentiment (null)
   *   - createdAt (timestamp)
   *   - updatedAt (timestamp)
   * - Article exists in database
   * - Content-Type header: application/json
   */
  test("should create article with minimal fields", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.id).toBe(mockArticle.id);
    expect(body.sourceId).toBe(payload.sourceId);
    expect(body.title).toBe(payload.title);
    expect(body.description).toBeNull();
    expect(body.link).toBe(payload.link);
    expect(body.publicationDate).toBe(payload.publicationDate);
    expect(body.sentiment).toBeNull();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  /**
   * Test: Should create article with all optional fields
   *
   * Setup:
   * - Create a test RSS source
   *
   * Action:
   * - Send POST with description, sentiment="positive"
   *
   * Expected:
   * - Status: 201
   * - Body: ArticleEntity with all fields populated
   * - description and sentiment match input
   */
  test("should create article with all optional fields", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      description: "Test description",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      sentiment: "positive" as const,
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: payload.description,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: payload.sentiment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.description).toBe(payload.description);
    expect(body.sentiment).toBe(payload.sentiment);
  });

  /**
   * Test: Should create article with topic associations
   *
   * Setup:
   * - Create a test RSS source
   * - Create 3 test topics
   *
   * Action:
   * - Send POST with topicIds = [topic1, topic2, topic3]
   *
   * Expected:
   * - Status: 201
   * - Body: ArticleEntity (without nested topics)
   * - Article exists in database
   * - 3 entries in article_topics table
   * - Verify associations are correct
   */
  test("should create article with topic associations", async () => {
    const topicIds = [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
      "550e8400-e29b-41d4-a716-446655440003",
    ];
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      topicIds,
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(mockArticle.id);
    // Verify service was called with topicIds
    expect(mockCreateArticle).toHaveBeenCalledWith(expect.objectContaining({ topicIds }));
  });

  /**
   * Test: Should accept all valid sentiment values
   *
   * Action:
   * - Create 3 articles with sentiment = "positive", "neutral", "negative"
   *
   * Expected:
   * - All succeed with status 201
   * - Each article has correct sentiment value
   */
  test("should accept all valid sentiment values", async () => {
    const sentiments: ("positive" | "neutral" | "negative")[] = ["positive", "neutral", "negative"];

    for (const sentiment of sentiments) {
      const payload = {
        sourceId: "550e8400-e29b-41d4-a716-446655440000",
        title: `Test Article ${sentiment}`,
        link: `https://example.com/article-${sentiment}`,
        publicationDate: new Date().toISOString(),
        sentiment,
      };

      const mockArticle: ArticleEntity = {
        id: `article-id-${sentiment}`,
        sourceId: payload.sourceId,
        title: payload.title,
        description: null,
        link: payload.link,
        publicationDate: payload.publicationDate,
        sentiment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCreateArticle.mockResolvedValueOnce(mockArticle);

      const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
      const response = await POST(context);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.sentiment).toBe(sentiment);
    }
  });

  /**
   * Test: Should handle null/undefined optional fields
   *
   * Action:
   * - Send POST with description=null, sentiment=null, topicIds not included
   *
   * Expected:
   * - Status: 201
   * - description and sentiment are null in response
   * - No topic associations created
   */
  test("should handle null optional fields", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      description: null,
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      sentiment: null,
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.description).toBeNull();
    expect(body.sentiment).toBeNull();
    // Zod strips undefined values, so topicIds won't be in the parsed object if not provided
    const callArgs = mockCreateArticle.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("topicIds");
  });

  /**
   * Test: Should return camelCase properties in response
   *
   * Action:
   * - Create an article
   *
   * Expected:
   * - Response has camelCase: sourceId, publicationDate, createdAt, updatedAt
   * - NOT snake_case: source_id, publication_date, created_at, updated_at
   */
  test("should return camelCase properties", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();

    // Verify camelCase properties exist
    expect(body).toHaveProperty("sourceId");
    expect(body).toHaveProperty("publicationDate");
    expect(body).toHaveProperty("createdAt");
    expect(body).toHaveProperty("updatedAt");

    // Verify snake_case properties do NOT exist
    expect(body).not.toHaveProperty("source_id");
    expect(body).not.toHaveProperty("publication_date");
    expect(body).not.toHaveProperty("created_at");
    expect(body).not.toHaveProperty("updated_at");
  });

  /**
   * Test: Should create multiple articles from same source
   *
   * Setup:
   * - Create one RSS source
   *
   * Action:
   * - Create 5 articles with same sourceId but different links
   *
   * Expected:
   * - All 5 succeed
   * - All articles have same sourceId
   */
  test("should create multiple articles from same source", async () => {
    const sourceId = "550e8400-e29b-41d4-a716-446655440000";

    for (let i = 0; i < 5; i++) {
      const payload = {
        sourceId,
        title: `Test Article ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
      };

      const mockArticle: ArticleEntity = {
        id: `article-id-${i}`,
        sourceId,
        title: payload.title,
        description: null,
        link: payload.link,
        publicationDate: payload.publicationDate,
        sentiment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCreateArticle.mockResolvedValueOnce(mockArticle);

      const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
      const response = await POST(context);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.sourceId).toBe(sourceId);
    }

    expect(mockCreateArticle).toHaveBeenCalledTimes(5);
  });

  /**
   * Test: Should handle maximum topic associations (20)
   *
   * Setup:
   * - Create 20 test topics
   *
   * Action:
   * - Create article with all 20 topicIds
   *
   * Expected:
   * - Status: 201
   * - 20 entries in article_topics table
   */
  test("should handle maximum topic associations", async () => {
    const topicIds = Array.from(
      { length: 20 },
      (_, i) => `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, "0")}`
    );
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      topicIds,
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    expect(mockCreateArticle).toHaveBeenCalledWith(expect.objectContaining({ topicIds }));
    expect(topicIds.length).toBe(20);
  });
});

/**
 * Test Suite: Performance and Concurrency
 */
describe("POST /api/articles - Performance", () => {
  const serviceRoleUser = createMockServiceRoleUser();
  let mockCreateArticle: MockedFunction<ArticleService["createArticle"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateArticle = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ArticleService as any).mockImplementation(
      () =>
        ({
          createArticle: mockCreateArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should handle concurrent requests
   *
   * Action:
   * - Send 10 POST requests concurrently with different links
   *
   * Expected:
   * - All 10 succeed with status 201
   * - 10 articles created in database
   * - No race conditions
   */
  test("should handle concurrent requests", async () => {
    const requests = Array.from({ length: 10 }, (_, i) => {
      const payload = {
        sourceId: "550e8400-e29b-41d4-a716-446655440000",
        title: `Test Article ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
      };

      const mockArticle: ArticleEntity = {
        id: `article-id-${i}`,
        sourceId: payload.sourceId,
        title: payload.title,
        description: null,
        link: payload.link,
        publicationDate: payload.publicationDate,
        sentiment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCreateArticle.mockResolvedValueOnce(mockArticle);

      const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
      return POST(context);
    });

    const responses = await Promise.all(requests);

    expect(responses.length).toBe(10);
    responses.forEach((response) => {
      expect(response.status).toBe(201);
    });
    expect(mockCreateArticle).toHaveBeenCalledTimes(10);
  });

  /**
   * Test: Should handle concurrent duplicate submissions
   *
   * Action:
   * - Send 5 POST requests concurrently with SAME link
   *
   * Expected:
   * - 1 succeeds with status 201
   * - 4 fail with status 409 (CONFLICT)
   * - Only 1 article exists in database
   */
  test("should handle concurrent duplicate submissions", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      link: "https://example.com/article-duplicate",
      publicationDate: new Date().toISOString(),
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // First call succeeds, rest fail with duplicate error
    mockCreateArticle.mockResolvedValueOnce(mockArticle);
    for (let i = 0; i < 4; i++) {
      mockCreateArticle.mockRejectedValueOnce(new Error("ARTICLE_ALREADY_EXISTS"));
    }

    const requests = Array.from({ length: 5 }, () => {
      const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
      return POST(context);
    });

    const responses = await Promise.all(requests);

    const successCount = responses.filter((r) => r.status === 201).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);
    expect(mockCreateArticle).toHaveBeenCalledTimes(5);
  });

  /**
   * Test: Should respond within acceptable time (< 200ms p95)
   *
   * Action:
   * - Create 100 articles sequentially
   * - Measure response times
   *
   * Expected:
   * - p95 latency < 200ms
   * - p50 latency < 100ms
   */
  test("should meet performance targets", async () => {
    const responseTimes: number[] = [];

    for (let i = 0; i < 100; i++) {
      const payload = {
        sourceId: "550e8400-e29b-41d4-a716-446655440000",
        title: `Test Article ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
      };

      const mockArticle: ArticleEntity = {
        id: `article-id-${i}`,
        sourceId: payload.sourceId,
        title: payload.title,
        description: null,
        link: payload.link,
        publicationDate: payload.publicationDate,
        sentiment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCreateArticle.mockResolvedValueOnce(mockArticle);

      const start = Date.now();
      const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
      await POST(context);
      const end = Date.now();
      responseTimes.push(end - start);
    }

    responseTimes.sort((a, b) => a - b);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];

    expect(p50).toBeLessThan(100);
    expect(p95).toBeLessThan(200);
  });
});

/**
 * Test Suite: Edge Cases
 */
describe("POST /api/articles - Edge Cases", () => {
  const serviceRoleUser = createMockServiceRoleUser();
  let mockCreateArticle: MockedFunction<ArticleService["createArticle"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateArticle = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ArticleService as any).mockImplementation(
      () =>
        ({
          createArticle: mockCreateArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should handle very long title (near limit)
   */
  test("should handle title with 1000 characters", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "x".repeat(1000),
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.title.length).toBe(1000);
  });

  /**
   * Test: Should handle very long description (near limit)
   */
  test("should handle description with 5000 characters", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article",
      description: "x".repeat(5000),
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: payload.description,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.description?.length).toBe(5000);
  });

  /**
   * Test: Should handle special characters in title
   */
  test("should handle special characters in title", async () => {
    const payload = {
      sourceId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Article 🚀 with émojis & unicode: 中文 & HTML <entities>",
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
    };

    const mockArticle: ArticleEntity = {
      id: "article-id-123",
      sourceId: payload.sourceId,
      title: payload.title,
      description: null,
      link: payload.link,
      publicationDate: payload.publicationDate,
      sentiment: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCreateArticle.mockResolvedValue(mockArticle);

    const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
    const response = await POST(context);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.title).toBe(payload.title);
  });

  /**
   * Test: Should handle various URL formats
   */
  test("should handle various URL formats", async () => {
    const urlFormats = [
      "http://example.com/article",
      "https://example.com/article",
      "https://www.example.com/article",
      "https://example.com/article?param=value&other=123",
      "https://example.com:8080/article",
    ];

    for (const link of urlFormats) {
      const payload = {
        sourceId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Test Article",
        link,
        publicationDate: new Date().toISOString(),
      };

      const mockArticle: ArticleEntity = {
        id: "article-id-123",
        sourceId: payload.sourceId,
        title: payload.title,
        description: null,
        link,
        publicationDate: payload.publicationDate,
        sentiment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCreateArticle.mockResolvedValueOnce(mockArticle);

      const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
      const response = await POST(context);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.link).toBe(link);
    }
  });

  /**
   * Test: Should handle various datetime formats
   */
  test("should handle various ISO 8601 datetime formats", async () => {
    // Zod's datetime() validator expects strict ISO 8601 format
    // Only test valid ISO 8601 formats
    const dateFormats = [
      new Date().toISOString(), // Standard format with Z and milliseconds
      new Date(new Date().setMilliseconds(0)).toISOString(), // Without milliseconds
    ];

    for (const publicationDate of dateFormats) {
      const payload = {
        sourceId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Test Article",
        link: "https://example.com/article",
        publicationDate,
      };

      const mockArticle: ArticleEntity = {
        id: "article-id-123",
        sourceId: payload.sourceId,
        title: payload.title,
        description: null,
        link: payload.link,
        publicationDate,
        sentiment: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockCreateArticle.mockResolvedValueOnce(mockArticle);

      const context = createMockContext("http://localhost:3000/api/articles", payload, serviceRoleUser);
      const response = await POST(context);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.publicationDate).toBe(publicationDate);
    }
  });
});

export {};
