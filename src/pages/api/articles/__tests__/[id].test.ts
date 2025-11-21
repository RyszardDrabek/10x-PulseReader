/**
 * Integration tests for GET, PATCH, DELETE /api/articles/:id endpoints
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach, type MockedFunction } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import type { ArticleDto, ArticleEntity } from "../../../../types.ts";
import { GET, PATCH, DELETE } from "../[id].ts";
import { ArticleService } from "../../../../lib/services/article.service.ts";

// Mock ArticleService
vi.mock("../../../../lib/services/article.service.ts");
vi.mock("../../../../lib/utils/logger.ts", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Creates a mock Astro API context for GET requests
 */
function createMockGetContext(url: string, articleId: string, user: User | null = null): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url, { method: "GET" }),
    params: { id: articleId },
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
 * Creates a mock Astro API context for PATCH/DELETE requests
 */
function createMockContext(
  url: string,
  method: "PATCH" | "DELETE",
  articleId: string,
  body: unknown,
  user: User | null = null
): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    params: { id: articleId },
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
 * Creates a mock ArticleDto
 */
function createMockArticleDto(overrides: Partial<ArticleDto> = {}): ArticleDto {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Test Article",
    description: "Test description",
    link: "https://example.com/article",
    publicationDate: new Date().toISOString(),
    sentiment: "positive",
    source: {
      id: "660e8400-e29b-41d4-a716-446655440000",
      name: "Test Source",
      url: "https://example.com/rss",
    },
    topics: [
      {
        id: "770e8400-e29b-41d4-a716-446655440000",
        name: "technology",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock ArticleEntity
 */
function createMockArticleEntity(overrides: Partial<ArticleEntity> = {}): ArticleEntity {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    sourceId: "660e8400-e29b-41d4-a716-446655440000",
    title: "Test Article",
    description: "Test description",
    link: "https://example.com/article",
    publicationDate: new Date().toISOString(),
    sentiment: "positive",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// =====================================================================================
// GET /api/articles/:id Tests
// =====================================================================================

/**
 * Test Suite: GET /api/articles/:id - Success Scenarios
 */
describe("GET /api/articles/:id - Success Scenarios", () => {
  let mockGetArticleById: MockedFunction<ArticleService["getArticleById"]>;
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetArticleById = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticleById: mockGetArticleById,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 200 with article data (public access)
   *
   * Action:
   * - Send GET request to /api/articles/:id without authentication
   *
   * Expected:
   * - Status: 200
   * - Body: ArticleDto with nested source and topics
   * - Content-Type: application/json
   */
  test("should return 200 with article data (public access)", async () => {
    const mockArticle = createMockArticleDto({ id: articleId });
    mockGetArticleById.mockResolvedValue(mockArticle);

    const context = createMockGetContext(`http://localhost:3000/api/articles/${articleId}`, articleId, null);
    const response = await GET(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.id).toBe(articleId);
    expect(body.title).toBe(mockArticle.title);
    expect(body.source).toBeDefined();
    expect(body.topics).toBeDefined();
    expect(mockGetArticleById).toHaveBeenCalledWith(articleId);
  });
});

/**
 * Test Suite: GET /api/articles/:id - Validation Errors
 */
describe("GET /api/articles/:id - Validation Errors", () => {
  let mockGetArticleById: MockedFunction<ArticleService["getArticleById"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetArticleById = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticleById: mockGetArticleById,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 400 for invalid UUID format
   *
   * Action:
   * - Send GET request with invalid UUID in path parameter
   *
   * Expected:
   * - Status: 400
   * - Body: { error: "Validation failed", details: [...], timestamp: "..." }
   */
  test("should return 400 for invalid UUID format", async () => {
    const invalidId = "not-a-uuid";
    const context = createMockGetContext(`http://localhost:3000/api/articles/${invalidId}`, invalidId, null);
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.some((d: { field: string }) => d.field === "id")).toBe(true);
    expect(mockGetArticleById).not.toHaveBeenCalled();
  });

  /**
   * Test: Should return 400 for missing article ID
   *
   * Action:
   * - Send GET request without article ID in path
   *
   * Expected:
   * - Status: 400
   * - Body: { error: "Article ID is required", code: "MISSING_PARAMETER", timestamp: "..." }
   */
  test("should return 400 for missing article ID", async () => {
    const context = createMockGetContext("http://localhost:3000/api/articles/", "", null);
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Article ID is required");
    expect(body.code).toBe("MISSING_PARAMETER");
  });
});

/**
 * Test Suite: GET /api/articles/:id - Error Scenarios
 */
describe("GET /api/articles/:id - Error Scenarios", () => {
  let mockGetArticleById: MockedFunction<ArticleService["getArticleById"]>;
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetArticleById = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticleById: mockGetArticleById,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 404 when article not found
   *
   * Action:
   * - Send GET request for non-existent article ID
   *
   * Expected:
   * - Status: 404
   * - Body: { error: "Article not found", code: "NOT_FOUND", timestamp: "..." }
   */
  test("should return 404 when article not found", async () => {
    mockGetArticleById.mockRejectedValue(new Error("ARTICLE_NOT_FOUND"));

    const context = createMockGetContext(`http://localhost:3000/api/articles/${articleId}`, articleId, null);
    const response = await GET(context);

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Article not found");
    expect(body.code).toBe("NOT_FOUND");
    expect(body.timestamp).toBeDefined();
  });
});

// =====================================================================================
// PATCH /api/articles/:id Tests
// =====================================================================================

/**
 * Test Suite: PATCH /api/articles/:id - Authentication
 */
describe("PATCH /api/articles/:id - Authentication", () => {
  const articleId = "550e8400-e29b-41d4-a716-446655440000";
  const validPayload = {
    sentiment: "neutral",
    topicIds: ["770e8400-e29b-41d4-a716-446655440000"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Should return 401 without authentication
   */
  test("should return 401 without authentication", async () => {
    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      validPayload,
      null
    );
    const response = await PATCH(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  /**
   * Test: Should return 401 for non-service-role user
   */
  test("should return 401 for non-service-role user", async () => {
    const regularUser = createMockRegularUser();
    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      validPayload,
      regularUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
    expect(body.code).toBe("FORBIDDEN");
  });
});

/**
 * Test Suite: PATCH /api/articles/:id - Validation
 */
describe("PATCH /api/articles/:id - Validation", () => {
  const serviceRoleUser = createMockServiceRoleUser();
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Should return 400 for invalid UUID format
   */
  test("should return 400 for invalid UUID format", async () => {
    const invalidId = "not-a-uuid";
    const payload = { sentiment: "positive" };
    const context = createMockContext(
      `http://localhost:3000/api/articles/${invalidId}`,
      "PATCH",
      invalidId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
  });

  /**
   * Test: Should return 400 for invalid sentiment value
   */
  test("should return 400 for invalid sentiment value", async () => {
    const payload = { sentiment: "invalid" };
    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details.some((d: { field: string }) => d.field === "sentiment")).toBe(true);
  });

  /**
   * Test: Should return 400 for invalid topicIds format
   */
  test("should return 400 for invalid topicIds format", async () => {
    const payload = { topicIds: ["not-a-uuid"] };
    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  /**
   * Test: Should return 400 for invalid JSON
   */
  test("should return 400 for invalid JSON", async () => {
    const invalidJson = "{ invalid json }";
    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      invalidJson,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON in request body");
    expect(body.code).toBe("INVALID_JSON");
  });
});

/**
 * Test Suite: PATCH /api/articles/:id - Success Scenarios
 */
describe("PATCH /api/articles/:id - Success Scenarios", () => {
  let mockUpdateArticle: MockedFunction<ArticleService["updateArticle"]>;
  const serviceRoleUser = createMockServiceRoleUser();
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateArticle = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          updateArticle: mockUpdateArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 200 with updated article
   */
  test("should return 200 with updated article", async () => {
    const payload = { sentiment: "neutral" };
    const updatedArticle = createMockArticleEntity({ id: articleId, sentiment: "neutral" });
    mockUpdateArticle.mockResolvedValue(updatedArticle);

    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(articleId);
    expect(body.sentiment).toBe("neutral");
    expect(mockUpdateArticle).toHaveBeenCalledWith(articleId, payload);
  });

  /**
   * Test: Should return 200 when updating topicIds only
   */
  test("should return 200 when updating topicIds only", async () => {
    const payload = { topicIds: ["770e8400-e29b-41d4-a716-446655440000"] };
    const updatedArticle = createMockArticleEntity({ id: articleId });
    mockUpdateArticle.mockResolvedValue(updatedArticle);

    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(200);
    expect(mockUpdateArticle).toHaveBeenCalledWith(articleId, payload);
  });
});

/**
 * Test Suite: PATCH /api/articles/:id - Error Scenarios
 */
describe("PATCH /api/articles/:id - Error Scenarios", () => {
  let mockUpdateArticle: MockedFunction<ArticleService["updateArticle"]>;
  const serviceRoleUser = createMockServiceRoleUser();
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateArticle = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          updateArticle: mockUpdateArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 404 when article not found
   */
  test("should return 404 when article not found", async () => {
    const payload = { sentiment: "neutral" };
    mockUpdateArticle.mockRejectedValue(new Error("ARTICLE_NOT_FOUND"));

    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Article not found");
    expect(body.code).toBe("NOT_FOUND");
  });

  /**
   * Test: Should return 400 for invalid topic IDs (non-existent topics)
   */
  test("should return 400 for invalid topic IDs", async () => {
    // Use valid UUID format but non-existent topic IDs
    const invalidIds = ["880e8400-e29b-41d4-a716-446655440000"];
    const payload = { topicIds: invalidIds };
    mockUpdateArticle.mockRejectedValue(new Error(`INVALID_TOPIC_IDS:${JSON.stringify(invalidIds)}`));

    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "PATCH",
      articleId,
      payload,
      serviceRoleUser
    );
    const response = await PATCH(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("One or more topic IDs are invalid");
    expect(body.code).toBe("INVALID_TOPIC_IDS");
    expect(body.details.invalidIds).toEqual(invalidIds);
  });
});

// =====================================================================================
// DELETE /api/articles/:id Tests
// =====================================================================================

/**
 * Test Suite: DELETE /api/articles/:id - Authentication
 */
describe("DELETE /api/articles/:id - Authentication", () => {
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Should return 401 without authentication
   */
  test("should return 401 without authentication", async () => {
    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "DELETE",
      articleId,
      null,
      null
    );
    const response = await DELETE(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  /**
   * Test: Should return 401 for non-service-role user
   */
  test("should return 401 for non-service-role user", async () => {
    const regularUser = createMockRegularUser();
    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "DELETE",
      articleId,
      null,
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
 * Test Suite: DELETE /api/articles/:id - Validation
 */
describe("DELETE /api/articles/:id - Validation", () => {
  const serviceRoleUser = createMockServiceRoleUser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Should return 400 for invalid UUID format
   */
  test("should return 400 for invalid UUID format", async () => {
    const invalidId = "not-a-uuid";
    const context = createMockContext(
      `http://localhost:3000/api/articles/${invalidId}`,
      "DELETE",
      invalidId,
      null,
      serviceRoleUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
  });
});

/**
 * Test Suite: DELETE /api/articles/:id - Success Scenarios
 */
describe("DELETE /api/articles/:id - Success Scenarios", () => {
  let mockDeleteArticle: MockedFunction<ArticleService["deleteArticle"]>;
  const serviceRoleUser = createMockServiceRoleUser();
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteArticle = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          deleteArticle: mockDeleteArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 204 No Content on successful deletion
   */
  test("should return 204 No Content on successful deletion", async () => {
    mockDeleteArticle.mockResolvedValue(undefined);

    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "DELETE",
      articleId,
      null,
      serviceRoleUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(mockDeleteArticle).toHaveBeenCalledWith(articleId);
  });
});

/**
 * Test Suite: DELETE /api/articles/:id - Error Scenarios
 */
describe("DELETE /api/articles/:id - Error Scenarios", () => {
  let mockDeleteArticle: MockedFunction<ArticleService["deleteArticle"]>;
  const serviceRoleUser = createMockServiceRoleUser();
  const articleId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteArticle = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          deleteArticle: mockDeleteArticle,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 404 when article not found
   */
  test("should return 404 when article not found", async () => {
    mockDeleteArticle.mockRejectedValue(new Error("ARTICLE_NOT_FOUND"));

    const context = createMockContext(
      `http://localhost:3000/api/articles/${articleId}`,
      "DELETE",
      articleId,
      null,
      serviceRoleUser
    );
    const response = await DELETE(context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Article not found");
    expect(body.code).toBe("NOT_FOUND");
  });
});
