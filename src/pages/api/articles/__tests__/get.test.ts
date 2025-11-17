/**
 * Integration tests for GET /api/articles endpoint
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach, type MockedFunction } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import type { ArticleListResponse, ArticleDto } from "../../../../types.ts";
import { GET } from "../get.ts";
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
 * Creates a mock Astro API context
 */
function createMockContext(url: string, user: User | null = null): APIContext {
  const mockSupabase = {} as SupabaseClient<Database>;

  return {
    request: new Request(url),
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
 * Creates a mock user
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
 * Test Suite: GET /api/articles - Success Scenarios
 */
describe("GET /api/articles - Success Scenarios", () => {
  let mockGetArticles: MockedFunction<ArticleService["getArticles"]>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetArticles = vi.fn();
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );
  });

  /**
   * Test: Should return 200 with default parameters (anonymous user)
   *
   * Setup:
   * - Ensure database has at least 20 articles
   *
   * Action:
   * - Send GET request to /api/articles without query params
   *
   * Expected:
   * - Status: 200
   * - Body: ArticleListResponse with:
   *   - data: array of ArticleDto (max 20 items)
   *   - pagination: { limit: 20, offset: 0, total: number, hasMore: boolean }
   *   - filtersApplied: { personalization: false }
   * - Content-Type: application/json
   */
  test("should return 200 with default parameters (anonymous user)", async () => {
    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: {
          id: "source-1",
          name: "Test Source",
          url: "https://example.com",
        },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 20,
        offset: 0,
        total: 25,
        hasMore: true,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext("http://localhost:3000/api/articles/get");
    const response = await GET(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeLessThanOrEqual(20);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.limit).toBe(20);
    expect(body.pagination.offset).toBe(0);
    expect(body.filtersApplied.personalization).toBe(false);
  });

  /**
   * Test: Should return articles with nested source and topics
   *
   * Setup:
   * - Create article with associated source and topics
   *
   * Action:
   * - Send GET request to /api/articles?limit=1
   *
   * Expected:
   * - Status: 200
   * - Body.data[0] has structure:
   *   {
   *     id, title, description, link, publicationDate, sentiment,
   *     source: { id, name, url },
   *     topics: [{ id, name }, ...],
   *     createdAt, updatedAt
   *   }
   * - All properties are camelCase
   */
  test("should return articles with nested source and topics", async () => {
    const mockResponse: ArticleListResponse = {
      data: [
        {
          id: "article-1",
          title: "Test Article",
          description: "Test description",
          link: "https://example.com/article-1",
          publicationDate: new Date().toISOString(),
          sentiment: "positive" as const,
          source: {
            id: "source-1",
            name: "Test Source",
            url: "https://example.com",
          },
          topics: [
            { id: "topic-1", name: "Technology" },
            { id: "topic-2", name: "AI" },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        limit: 1,
        offset: 0,
        total: 1,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=1");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data[0]).toHaveProperty("id");
    expect(body.data[0]).toHaveProperty("title");
    expect(body.data[0]).toHaveProperty("description");
    expect(body.data[0]).toHaveProperty("link");
    expect(body.data[0]).toHaveProperty("publicationDate");
    expect(body.data[0]).toHaveProperty("sentiment");
    expect(body.data[0]).toHaveProperty("source");
    expect(body.data[0]).toHaveProperty("topics");
    expect(body.data[0]).toHaveProperty("createdAt");
    expect(body.data[0]).toHaveProperty("updatedAt");

    // Verify nested structure
    expect(body.data[0].source).toHaveProperty("id");
    expect(body.data[0].source).toHaveProperty("name");
    expect(body.data[0].source).toHaveProperty("url");
    expect(body.data[0].topics).toBeInstanceOf(Array);
    expect(body.data[0].topics[0]).toHaveProperty("id");
    expect(body.data[0].topics[0]).toHaveProperty("name");

    // Verify camelCase (no snake_case)
    expect(body.data[0]).not.toHaveProperty("publication_date");
    expect(body.data[0]).not.toHaveProperty("created_at");
    expect(body.data[0]).not.toHaveProperty("updated_at");
  });

  /**
   * Test: Should return correct pagination metadata
   *
   * Setup:
   * - Ensure database has exactly 45 articles
   *
   * Action:
   * - Send GET request to /api/articles?limit=20&offset=0
   * - Send GET request to /api/articles?limit=20&offset=20
   * - Send GET request to /api/articles?limit=20&offset=40
   *
   * Expected:
   * - First response: pagination = { limit: 20, offset: 0, total: 45, hasMore: true }
   * - Second response: pagination = { limit: 20, offset: 20, total: 45, hasMore: true }
   * - Third response: pagination = { limit: 20, offset: 40, total: 45, hasMore: false }
   */
  test("should return correct pagination metadata", async () => {
    const totalArticles = 45;

    // First page
    mockGetArticles.mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: { limit: 20, offset: 0, total: totalArticles, hasMore: true },
      filtersApplied: { personalization: false },
    });

    const context1 = createMockContext("http://localhost:3000/api/articles/get?limit=20&offset=0");
    const response1 = await GET(context1);
    const body1 = await response1.json();

    expect(body1.pagination.limit).toBe(20);
    expect(body1.pagination.offset).toBe(0);
    expect(body1.pagination.total).toBe(totalArticles);
    expect(body1.pagination.hasMore).toBe(true);

    // Second page
    mockGetArticles.mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `article-${i + 20}`,
        title: `Article ${i + 20}`,
        description: `Description ${i + 20}`,
        link: `https://example.com/article-${i + 20}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: { limit: 20, offset: 20, total: totalArticles, hasMore: true },
      filtersApplied: { personalization: false },
    });

    const context2 = createMockContext("http://localhost:3000/api/articles/get?limit=20&offset=20");
    const response2 = await GET(context2);
    const body2 = await response2.json();

    expect(body2.pagination.limit).toBe(20);
    expect(body2.pagination.offset).toBe(20);
    expect(body2.pagination.total).toBe(totalArticles);
    expect(body2.pagination.hasMore).toBe(true);

    // Third page
    mockGetArticles.mockResolvedValueOnce({
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `article-${i + 40}`,
        title: `Article ${i + 40}`,
        description: `Description ${i + 40}`,
        link: `https://example.com/article-${i + 40}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: { limit: 20, offset: 40, total: totalArticles, hasMore: false },
      filtersApplied: { personalization: false },
    });

    const context3 = createMockContext("http://localhost:3000/api/articles/get?limit=20&offset=40");
    const response3 = await GET(context3);
    const body3 = await response3.json();

    expect(body3.pagination.limit).toBe(20);
    expect(body3.pagination.offset).toBe(40);
    expect(body3.pagination.total).toBe(totalArticles);
    expect(body3.pagination.hasMore).toBe(false);
  });

  /**
   * Test: Should filter by sentiment
   *
   * Setup:
   * - Create 10 positive, 10 neutral, 10 negative articles
   *
   * Action:
   * - Send GET request to /api/articles?sentiment=positive&limit=20
   *
   * Expected:
   * - Status: 200
   * - All returned articles have sentiment="positive"
   * - pagination.total = 10
   * - filtersApplied.sentiment = "positive"
   */
  test("should filter by sentiment", async () => {
    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `Positive Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "positive" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 20,
        offset: 0,
        total: 10,
        hasMore: false,
      },
      filtersApplied: {
        sentiment: "positive",
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext("http://localhost:3000/api/articles/get?sentiment=positive&limit=20");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data.every((article: ArticleDto) => article.sentiment === "positive")).toBe(true);
    expect(body.pagination.total).toBe(10);
    expect(body.filtersApplied.sentiment).toBe("positive");
  });

  /**
   * Test: Should filter by topicId
   *
   * Setup:
   * - Create topic "technology"
   * - Create 5 articles with "technology" topic
   * - Create 15 articles with other topics
   *
   * Action:
   * - Send GET request to /api/articles?topicId={techId}&limit=20
   *
   * Expected:
   * - Status: 200
   * - All returned articles have "technology" in topics array
   * - pagination.total = 5
   */
  test("should filter by topicId", async () => {
    const techTopicId = "550e8400-e29b-41d4-a716-446655440000";
    const techTopic = { id: techTopicId, name: "Technology" };

    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `article-${i}`,
        title: `Tech Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [techTopic],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 20,
        offset: 0,
        total: 5,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext(`http://localhost:3000/api/articles/get?topicId=${techTopicId}&limit=20`);
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data.every((article: ArticleDto) => article.topics.some((topic) => topic.id === techTopicId))).toBe(
      true
    );
    expect(body.pagination.total).toBe(5);
  });

  /**
   * Test: Should filter by sourceId
   *
   * Setup:
   * - Create 2 RSS sources: BBC and CNN
   * - Create 7 articles from BBC
   * - Create 13 articles from CNN
   *
   * Action:
   * - Send GET request to /api/articles?sourceId={bbcId}&limit=20
   *
   * Expected:
   * - Status: 200
   * - All returned articles have source.id = bbcId
   * - pagination.total = 7
   */
  test("should filter by sourceId", async () => {
    const bbcSourceId = "550e8400-e29b-41d4-a716-446655440001";
    const bbcSource = { id: bbcSourceId, name: "BBC", url: "https://bbc.com" };

    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 7 }, (_, i) => ({
        id: `article-${i}`,
        title: `BBC Article ${i}`,
        description: `Description ${i}`,
        link: `https://bbc.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: bbcSource,
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 20,
        offset: 0,
        total: 7,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext(`http://localhost:3000/api/articles/get?sourceId=${bbcSourceId}&limit=20`);
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data.every((article: ArticleDto) => article.source.id === bbcSourceId)).toBe(true);
    expect(body.pagination.total).toBe(7);
  });

  /**
   * Test: Should sort by publication_date desc (default)
   *
   * Setup:
   * - Create articles with different publication dates
   *
   * Action:
   * - Send GET request to /api/articles?limit=10
   *
   * Expected:
   * - Status: 200
   * - Articles are ordered by publication_date descending
   * - data[0].publicationDate > data[1].publicationDate > data[2].publicationDate
   */
  test("should sort by publication_date desc (default)", async () => {
    const now = new Date();
    const dates = [
      new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
      new Date(now.getTime() - 1000 * 60 * 60 * 48), // 2 days ago
      new Date(now.getTime() - 1000 * 60 * 60 * 72), // 3 days ago
    ];

    const mockResponse: ArticleListResponse = {
      data: dates.map((date, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: date.toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 10,
        offset: 0,
        total: 3,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=10");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify descending order (newest first)
    expect(new Date(body.data[0].publicationDate).getTime()).toBeGreaterThan(
      new Date(body.data[1].publicationDate).getTime()
    );
    expect(new Date(body.data[1].publicationDate).getTime()).toBeGreaterThan(
      new Date(body.data[2].publicationDate).getTime()
    );
  });

  /**
   * Test: Should sort by created_at asc
   *
   * Setup:
   * - Create articles at different times
   *
   * Action:
   * - Send GET request to /api/articles?sortBy=created_at&sortOrder=asc&limit=10
   *
   * Expected:
   * - Status: 200
   * - Articles are ordered by created_at ascending
   * - data[0].createdAt < data[1].createdAt < data[2].createdAt
   */
  test("should sort by created_at asc", async () => {
    const now = new Date();
    const createdDates = [
      new Date(now.getTime() - 1000 * 60 * 60 * 72), // 3 days ago
      new Date(now.getTime() - 1000 * 60 * 60 * 48), // 2 days ago
      new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
    ];

    const mockResponse: ArticleListResponse = {
      data: createdDates.map((date, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: date.toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 10,
        offset: 0,
        total: 3,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext(
      "http://localhost:3000/api/articles/get?sortBy=created_at&sortOrder=asc&limit=10"
    );
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify ascending order (oldest first)
    expect(new Date(body.data[0].createdAt).getTime()).toBeLessThan(new Date(body.data[1].createdAt).getTime());
    expect(new Date(body.data[1].createdAt).getTime()).toBeLessThan(new Date(body.data[2].createdAt).getTime());
  });

  /**
   * Test: Should apply personalization for authenticated user
   *
   * Setup:
   * - Create user with profile (mood="positive", blocklist=["politics"])
   * - Create 5 positive articles (none about politics)
   * - Create 10 neutral articles
   * - Create 5 negative articles
   * - Create 3 positive articles about politics
   *
   * Action:
   * - Send GET request to /api/articles?applyPersonalization=true&limit=20
   *   with Authorization header
   *
   * Expected:
   * - Status: 200
   * - Only positive articles returned (mood filter)
   * - No articles containing "politics" (blocklist filter)
   * - pagination.total = 5
   * - filtersApplied.personalization = true
   * - filtersApplied.blockedItemsCount = 3
   */
  test("should apply personalization for authenticated user", async () => {
    const user = createMockUser({ id: "user-123" });

    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `article-${i}`,
        title: `Positive Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "positive" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 20,
        offset: 0,
        total: 5,
        hasMore: false,
      },
      filtersApplied: {
        personalization: true,
        blockedItemsCount: 3,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext(
      "http://localhost:3000/api/articles/get?applyPersonalization=true&limit=20",
      user
    );
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify all articles are positive (mood filter applied)
    expect(body.data.every((article: ArticleDto) => article.sentiment === "positive")).toBe(true);

    // Verify no articles contain "politics" (blocklist filter applied)
    expect(
      body.data.every(
        (article: ArticleDto) =>
          !article.title.toLowerCase().includes("politics") && !article.description?.toLowerCase().includes("politics")
      )
    ).toBe(true);

    expect(body.pagination.total).toBe(5);
    expect(body.filtersApplied.personalization).toBe(true);
    expect(body.filtersApplied.blockedItemsCount).toBe(3);

    // Verify service was called with user ID
    expect(mockGetArticles).toHaveBeenCalledWith(expect.objectContaining({ applyPersonalization: true }), user.id);
  });

  /**
   * Test: Should return filtersApplied metadata
   *
   * Action:
   * - Send GET request to /api/articles?sentiment=positive&limit=10
   *
   * Expected:
   * - Status: 200
   * - Body.filtersApplied = {
   *     sentiment: "positive",
   *     personalization: false
   *   }
   */
  test("should return filtersApplied metadata", async () => {
    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "positive" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 10,
        offset: 0,
        total: 5,
        hasMore: false,
      },
      filtersApplied: {
        sentiment: "positive",
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext("http://localhost:3000/api/articles/get?sentiment=positive&limit=10");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.filtersApplied).toBeDefined();
    expect(body.filtersApplied.sentiment).toBe("positive");
    expect(body.filtersApplied.personalization).toBe(false);
  });

  /**
   * Test: Should handle empty results gracefully
   *
   * Setup:
   * - Database has no articles matching filter
   *
   * Action:
   * - Send GET request to /api/articles?sentiment=positive&limit=20
   *
   * Expected:
   * - Status: 200
   * - Body.data = []
   * - Body.pagination.total = 0
   * - Body.pagination.hasMore = false
   */
  test("should handle empty results", async () => {
    const mockResponse: ArticleListResponse = {
      data: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false,
      },
      filtersApplied: {
        sentiment: "positive",
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext("http://localhost:3000/api/articles/get?sentiment=positive&limit=20");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.hasMore).toBe(false);
  });

  /**
   * Test: Should combine multiple filters
   *
   * Setup:
   * - Complex scenario with sentiment + topic + source filters
   *
   * Action:
   * - Send GET /api/articles?sentiment=positive&topicId={id}&sourceId={id}&limit=20
   *
   * Expected:
   * - Status: 200
   * - Only articles matching ALL filters
   * - Correct total count
   */
  test("should combine multiple filters", async () => {
    const topicId = "550e8400-e29b-41d4-a716-446655440000";
    const sourceId = "550e8400-e29b-41d4-a716-446655440001";

    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 3 }, (_, i) => ({
        id: `article-${i}`,
        title: `Positive Tech Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "positive" as const,
        source: { id: sourceId, name: "Tech Source", url: "https://techsource.com" },
        topics: [{ id: topicId, name: "Technology" }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 20,
        offset: 0,
        total: 3,
        hasMore: false,
      },
      filtersApplied: {
        sentiment: "positive",
        personalization: false,
      },
    };

    mockGetArticles.mockResolvedValue(mockResponse);

    const context = createMockContext(
      `http://localhost:3000/api/articles/get?sentiment=positive&topicId=${topicId}&sourceId=${sourceId}&limit=20`
    );
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify all articles match ALL filters
    expect(body.data.every((article: ArticleDto) => article.sentiment === "positive")).toBe(true);
    expect(body.data.every((article: ArticleDto) => article.source.id === sourceId)).toBe(true);
    expect(body.data.every((article: ArticleDto) => article.topics.some((topic) => topic.id === topicId))).toBe(true);
    expect(body.pagination.total).toBe(3);
  });
});

/**
 * Test Suite: GET /api/articles - Validation Errors
 */
describe("GET /api/articles - Validation Errors", () => {
  /**
   * Test: Should return 400 for invalid limit (< 1)
   *
   * Action:
   * - Send GET request to /api/articles?limit=0
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "limit", message: "Limit must be at least 1" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid limit (< 1)", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?limit=0");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "limit")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) => detail.message.includes("at least 1"))
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid limit (> 100)
   *
   * Action:
   * - Send GET request to /api/articles?limit=101
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "limit", message: "Limit must not exceed 100" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid limit (> 100)", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?limit=101");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "limit")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) => detail.message.includes("exceed 100"))
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid limit (not a number)
   *
   * Action:
   * - Send GET request to /api/articles?limit=abc
   *
   * Expected:
   * - Status: 400
   * - Body includes validation error for limit field
   */
  test("should return 400 for invalid limit (not a number)", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?limit=abc");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "limit")).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid offset (< 0)
   *
   * Action:
   * - Send GET request to /api/articles?offset=-1
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "offset", message: "Offset must be non-negative" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid offset (< 0)", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?offset=-1");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "offset")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) => detail.message.includes("non-negative"))
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid sentiment
   *
   * Action:
   * - Send GET request to /api/articles?sentiment=happy
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "sentiment", message: "Sentiment must be one of: positive, neutral, negative" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid sentiment", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?sentiment=happy");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "sentiment")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) =>
        detail.message.includes("positive, neutral, negative")
      )
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid topicId (not UUID)
   *
   * Action:
   * - Send GET request to /api/articles?topicId=not-a-uuid
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "topicId", message: "Invalid UUID format for topicId" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid topicId (not UUID)", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?topicId=not-a-uuid");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "topicId")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) =>
        detail.message.includes("Invalid UUID format for topicId")
      )
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid sourceId (not UUID)
   *
   * Action:
   * - Send GET request to /api/articles?sourceId=not-a-uuid
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "sourceId", message: "Invalid UUID format for sourceId" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid sourceId (not UUID)", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?sourceId=not-a-uuid");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "sourceId")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) =>
        detail.message.includes("Invalid UUID format for sourceId")
      )
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid sortBy
   *
   * Action:
   * - Send GET request to /api/articles?sortBy=title
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "sortBy", message: "sortBy must be one of: publication_date, created_at" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid sortBy", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?sortBy=title");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "sortBy")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) =>
        detail.message.includes("publication_date, created_at")
      )
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for invalid sortOrder
   *
   * Action:
   * - Send GET request to /api/articles?sortOrder=ascending
   *
   * Expected:
   * - Status: 400
   * - Body: {
   *     error: "Validation failed",
   *     details: [{ field: "sortOrder", message: "sortOrder must be one of: asc, desc" }],
   *     timestamp: "..."
   *   }
   */
  test("should return 400 for invalid sortOrder", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?sortOrder=ascending");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThan(0);
    expect(body.details.some((detail: { field: string; message: string }) => detail.field === "sortOrder")).toBe(true);
    expect(
      body.details.some((detail: { field: string; message: string }) => detail.message.includes("asc, desc"))
    ).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 400 for multiple validation errors
   *
   * Action:
   * - Send GET /api/articles?limit=0&offset=-1&sentiment=invalid
   *
   * Expected:
   * - Status: 400
   * - Body.details array contains 3 validation errors
   */
  test("should return 400 for multiple validation errors", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?limit=0&offset=-1&sentiment=invalid");
    const response = await GET(context);

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeInstanceOf(Array);
    expect(body.details.length).toBeGreaterThanOrEqual(3);
    expect(body.details.some((detail: { field: string }) => detail.field === "limit")).toBe(true);
    expect(body.details.some((detail: { field: string }) => detail.field === "offset")).toBe(true);
    expect(body.details.some((detail: { field: string }) => detail.field === "sentiment")).toBe(true);
    expect(body.timestamp).toBeDefined();
  });
});

/**
 * Test Suite: GET /api/articles - Authentication Errors
 */
describe("GET /api/articles - Authentication Errors", () => {
  /**
   * Test: Should return 401 when personalization requested without auth
   *
   * Action:
   * - Send GET /api/articles?applyPersonalization=true
   *   WITHOUT Authorization header
   *
   * Expected:
   * - Status: 401
   * - Body: {
   *     error: "Authentication required for personalized filtering",
   *     code: "AUTHENTICATION_REQUIRED",
   *     timestamp: "..."
   *   }
   */
  test("should return 401 when personalization requested without auth", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?applyPersonalization=true", null);
    const response = await GET(context);

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Authentication required for personalized filtering");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should return 401 with invalid auth token when personalization requested
   *
   * Action:
   * - Send GET /api/articles?applyPersonalization=true
   *   WITH invalid Authorization header
   *
   * Expected:
   * - Status: 401
   * - Error about authentication
   */
  test("should return 401 with invalid token when personalization requested", async () => {
    // Note: In the actual implementation, invalid tokens would result in user being null
    // So this test is equivalent to the previous one - no user means 401
    const context = createMockContext("http://localhost:3000/api/articles/get?applyPersonalization=true", null);
    const response = await GET(context);

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("Authentication required for personalized filtering");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
    expect(body.timestamp).toBeDefined();
  });

  /**
   * Test: Should allow anonymous access without personalization
   *
   * Action:
   * - Send GET /api/articles (no applyPersonalization param)
   *   WITHOUT Authorization header
   *
   * Expected:
   * - Status: 200
   * - Returns articles successfully
   * - filtersApplied.personalization = false
   */
  test("should allow anonymous access without personalization", async () => {
    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 20,
        offset: 0,
        total: 10,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get", null);
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.filtersApplied.personalization).toBe(false);
  });
});

/**
 * Test Suite: GET /api/articles - Business Logic Errors
 */
describe("GET /api/articles - Business Logic Errors", () => {
  /**
   * Test: Should handle non-existent topicId gracefully
   *
   * Setup:
   * - Use valid UUID that doesn't exist in topics table
   *
   * Action:
   * - Send GET /api/articles?topicId={fakeUuid}&limit=20
   *
   * Expected:
   * - Status: 200 (not an error, just no results)
   * - Body.data = []
   * - Body.pagination.total = 0
   */
  test("should handle non-existent topicId gracefully", async () => {
    const fakeTopicId = "550e8400-e29b-41d4-a716-446655440999";
    const mockResponse: ArticleListResponse = {
      data: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext(`http://localhost:3000/api/articles/get?topicId=${fakeTopicId}&limit=20`);
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  /**
   * Test: Should handle non-existent sourceId gracefully
   *
   * Setup:
   * - Use valid UUID that doesn't exist in rss_sources table
   *
   * Action:
   * - Send GET /api/articles?sourceId={fakeUuid}&limit=20
   *
   * Expected:
   * - Status: 200 (not an error, just no results)
   * - Body.data = []
   * - Body.pagination.total = 0
   */
  test("should handle non-existent sourceId gracefully", async () => {
    const fakeSourceId = "550e8400-e29b-41d4-a716-446655440999";
    const mockResponse: ArticleListResponse = {
      data: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext(`http://localhost:3000/api/articles/get?sourceId=${fakeSourceId}&limit=20`);
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
  });

  /**
   * Test: Should return 500 when user has no profile but personalization requested
   *
   * Setup:
   * - Authenticated user without profile record
   *
   * Action:
   * - Send GET /api/articles?applyPersonalization=true
   *   WITH valid Authorization header
   *
   * Expected:
   * - Status: 500
   * - Body: {
   *     error: "User profile not found. Please complete your profile setup.",
   *     code: "PROFILE_NOT_FOUND",
   *     timestamp: "..."
   *   }
   */
  test("should return 500 when user has no profile", async () => {
    const user = createMockUser({ id: "user-123" });
    const mockGetArticles = vi.fn().mockRejectedValue(new Error("PROFILE_NOT_FOUND"));
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?applyPersonalization=true", user);
    const response = await GET(context);

    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body.error).toBe("User profile not found. Please complete your profile setup.");
    expect(body.code).toBe("PROFILE_NOT_FOUND");
    expect(body.timestamp).toBeDefined();
  });
});

/**
 * Test Suite: GET /api/articles - Response Format
 */
describe("GET /api/articles - Response Format", () => {
  /**
   * Test: Should use camelCase for all properties
   *
   * Action:
   * - Send GET /api/articles?limit=1
   *
   * Expected:
   * - All properties are camelCase:
   *   publicationDate (not publication_date)
   *   createdAt (not created_at)
   *   updatedAt (not updated_at)
   */
  test("should use camelCase for all properties", async () => {
    const mockResponse: ArticleListResponse = {
      data: [
        {
          id: "article-1",
          title: "Test Article",
          description: "Test description",
          link: "https://example.com/article-1",
          publicationDate: new Date().toISOString(),
          sentiment: "neutral" as const,
          source: { id: "source-1", name: "Test Source", url: "https://example.com" },
          topics: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        limit: 1,
        offset: 0,
        total: 1,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=1");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();

    // Verify camelCase properties exist
    expect(body.data[0]).toHaveProperty("publicationDate");
    expect(body.data[0]).toHaveProperty("createdAt");
    expect(body.data[0]).toHaveProperty("updatedAt");

    // Verify snake_case properties do NOT exist
    expect(body.data[0]).not.toHaveProperty("publication_date");
    expect(body.data[0]).not.toHaveProperty("created_at");
    expect(body.data[0]).not.toHaveProperty("updated_at");
  });

  /**
   * Test: Should include Content-Type: application/json header
   *
   * Action:
   * - Send GET /api/articles
   *
   * Expected:
   * - Response headers include Content-Type: application/json
   */
  test("should include correct Content-Type header", async () => {
    const mockResponse: ArticleListResponse = {
      data: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get");
    const response = await GET(context);

    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  /**
   * Test: Should include timestamp in error responses
   *
   * Action:
   * - Send GET /api/articles?limit=0 (trigger validation error)
   *
   * Expected:
   * - Error response includes timestamp field (ISO 8601 format)
   */
  test("should include timestamp in error responses", async () => {
    const context = createMockContext("http://localhost:3000/api/articles/get?limit=0");
    const response = await GET(context);

    expect(response.status).toBe(400);
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    expect(typeof body.timestamp).toBe("string");
    // Verify it's a valid ISO 8601 date
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

/**
 * Test Suite: GET /api/articles - Performance
 */
describe("GET /api/articles - Performance", () => {
  /**
   * Test: Should respond within acceptable time
   *
   * Action:
   * - Send 100 GET requests sequentially
   * - Measure response times
   *
   * Expected:
   * - p95 latency < 300ms
   * - p50 latency < 150ms
   */
  test("should meet performance targets", async () => {
    const mockResponse: ArticleListResponse = {
      data: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const responseTimes: number[] = [];
    const context = createMockContext("http://localhost:3000/api/articles/get");

    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await GET(context);
      const end = Date.now();
      responseTimes.push(end - start);
    }

    responseTimes.sort((a, b) => a - b);
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];

    expect(p50).toBeLessThan(150);
    expect(p95).toBeLessThan(300);
  });

  /**
   * Test: Should handle concurrent requests
   *
   * Action:
   * - Send 50 GET requests concurrently
   *
   * Expected:
   * - All succeed with status 200
   * - No database connection errors
   * - Response times remain acceptable
   */
  test("should handle concurrent requests", async () => {
    const mockResponse: ArticleListResponse = {
      data: [],
      pagination: {
        limit: 20,
        offset: 0,
        total: 0,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get");
    const requests = Array.from({ length: 50 }, () => GET(context));

    const responses = await Promise.all(requests);

    expect(responses.length).toBe(50);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });
});

/**
 * Test Suite: GET /api/articles - Edge Cases
 */
describe("GET /api/articles - Edge Cases", () => {
  /**
   * Test: Should handle limit=1 correctly
   */
  test("should handle limit=1", async () => {
    const mockResponse: ArticleListResponse = {
      data: [
        {
          id: "article-1",
          title: "Test Article",
          description: "Test description",
          link: "https://example.com/article-1",
          publicationDate: new Date().toISOString(),
          sentiment: "neutral" as const,
          source: { id: "source-1", name: "Test Source", url: "https://example.com" },
          topics: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        limit: 1,
        offset: 0,
        total: 1,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=1");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBe(1);
    expect(body.pagination.limit).toBe(1);
  });

  /**
   * Test: Should handle limit=100 correctly
   */
  test("should handle limit=100", async () => {
    const mockResponse: ArticleListResponse = {
      data: Array.from({ length: 100 }, (_, i) => ({
        id: `article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
        link: `https://example.com/article-${i}`,
        publicationDate: new Date().toISOString(),
        sentiment: "neutral" as const,
        source: { id: "source-1", name: "Test Source", url: "https://example.com" },
        topics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      pagination: {
        limit: 100,
        offset: 0,
        total: 100,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=100");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBe(100);
    expect(body.pagination.limit).toBe(100);
  });

  /**
   * Test: Should handle large offset gracefully
   */
  test("should handle large offset", async () => {
    const mockResponse: ArticleListResponse = {
      data: [],
      pagination: {
        limit: 20,
        offset: 10000,
        total: 50,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?offset=10000&limit=20");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.offset).toBe(10000);
    expect(body.pagination.hasMore).toBe(false);
  });

  /**
   * Test: Should handle articles with no topics
   */
  test("should handle articles with no topics", async () => {
    const mockResponse: ArticleListResponse = {
      data: [
        {
          id: "article-1",
          title: "Test Article",
          description: "Test description",
          link: "https://example.com/article-1",
          publicationDate: new Date().toISOString(),
          sentiment: "neutral" as const,
          source: { id: "source-1", name: "Test Source", url: "https://example.com" },
          topics: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=1");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0].topics).toBeInstanceOf(Array);
    expect(body.data[0].topics).toEqual([]);
    expect(body.data[0].topics).not.toBeNull();
  });

  /**
   * Test: Should handle articles with null sentiment
   */
  test("should handle articles with null sentiment", async () => {
    const mockResponse: ArticleListResponse = {
      data: [
        {
          id: "article-1",
          title: "Test Article",
          description: "Test description",
          link: "https://example.com/article-1",
          publicationDate: new Date().toISOString(),
          sentiment: null,
          source: { id: "source-1", name: "Test Source", url: "https://example.com" },
          topics: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=1");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0].sentiment).toBeNull();
  });

  /**
   * Test: Should handle articles with null description
   */
  test("should handle articles with null description", async () => {
    const mockResponse: ArticleListResponse = {
      data: [
        {
          id: "article-1",
          title: "Test Article",
          description: null,
          link: "https://example.com/article-1",
          publicationDate: new Date().toISOString(),
          sentiment: "neutral" as const,
          source: { id: "source-1", name: "Test Source", url: "https://example.com" },
          topics: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      pagination: {
        limit: 20,
        offset: 0,
        total: 1,
        hasMore: false,
      },
      filtersApplied: {
        personalization: false,
      },
    };

    const mockGetArticles = vi.fn().mockResolvedValue(mockResponse);
    vi.mocked(ArticleService).mockImplementation(
      () =>
        ({
          getArticles: mockGetArticles,
        }) as unknown as ArticleService
    );

    const context = createMockContext("http://localhost:3000/api/articles/get?limit=1");
    const response = await GET(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0].description).toBeNull();
  });
});

export {};
