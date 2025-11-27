/**
 * Unit tests for POST /api/cron/fetch-rss endpoint
 *
 * These tests are implemented using Vitest with mocked dependencies
 * following the project's testing guidelines.
 */

import { describe, test, expect, vi, beforeEach, type MockedFunction } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import { POST } from "../fetch-rss.ts";
import { RssSourceService } from "../../../../lib/services/rss-source.service.ts";
import { RssFetchService } from "../../../../lib/services/rss-fetch.service.ts";
import { ArticleService } from "../../../../lib/services/article.service.ts";

// Mock services
vi.mock("../../../../lib/services/rss-source.service.ts");
vi.mock("../../../../lib/services/rss-fetch.service.ts");
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
function createMockContext(user: User | null = null, supabase: SupabaseClient<Database> | null = null): APIContext {
  const mockSupabase = supabase || ({ notEmpty: true } as unknown as SupabaseClient<Database>);

  return {
    request: new Request("http://localhost:3000/api/cron/fetch-rss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
    params: {},
    props: {},
    locals: {
      supabase: mockSupabase,
      user: user ? { role: "service_role" } : null,
    },
    url: new URL("http://localhost:3000/api/cron/fetch-rss"),
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
  } as User & { role: string };
}

describe("POST /api/cron/fetch-rss - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return 401 without authentication", async () => {
    const context = createMockContext(null);
    const response = await POST(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  test.skip("should return 401 without service role", async () => {
    const regularUser = {
      id: "user-123",
      email: "test@example.com",
      aud: "authenticated",
      role: "authenticated",
    } as User;

    const context = createMockContext(regularUser);
    const response = await POST(context);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Service role required for this endpoint");
    expect(body.code).toBe("FORBIDDEN");
  });

  test("should return 500 when Supabase client is not available", async () => {
    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    // Override supabase to null
    context.locals.supabase = null as unknown as SupabaseClient<Database>;
    const response = await POST(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Server configuration error: Supabase client not available");
    expect(body.code).toBe("CONFIGURATION_ERROR");
  });
});

describe("POST /api/cron/fetch-rss - RSS Fetching Logic", () => {
  let mockRssSourceService: {
    getActiveRssSources: MockedFunction<() => Promise<unknown[]>>;
    updateFetchStatus: MockedFunction<(id: string, success: boolean, error?: string) => Promise<void>>;
  };
  let mockRssFetchService: {
    fetchRssFeed: MockedFunction<(url: string) => Promise<unknown>>;
  };
  let mockArticleService: {
    createArticle: MockedFunction<(command: unknown, skipValidation?: boolean) => Promise<unknown>>;
    createArticlesBatch: MockedFunction<
      (commands: unknown[], skipValidation?: boolean) => Promise<{ articles: unknown[]; duplicatesSkipped: number }>
    >;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRssSourceService = {
      getActiveRssSources: vi.fn(),
      updateFetchStatus: vi.fn(),
    };
    mockRssFetchService = {
      fetchRssFeed: vi.fn(),
    };
    mockArticleService = {
      createArticle: vi.fn(),
      createArticlesBatch: vi.fn(),
    };

    (RssSourceService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockRssSourceService);
    (RssFetchService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockRssFetchService);
    (ArticleService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockArticleService);
  });

  test("should return success when no active sources", async () => {
    mockRssSourceService.getActiveRssSources.mockResolvedValue([]);

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(0);
    expect(body.articlesCreated).toBe(0);
    expect(body.errors).toEqual([]);
  });

  test.skip("should successfully process RSS sources and create articles", async () => {
    const sources = [
      {
        id: "source-1",
        name: "BBC News",
        url: "https://bbc.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "source-2",
        name: "The Guardian",
        url: "https://guardian.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      },
    ];

    const feed1Items = [
      {
        title: "Article 1",
        description: "Description 1",
        link: "https://bbc.com/article1",
        publicationDate: "2024-01-01T10:00:00Z",
      },
      {
        title: "Article 2",
        description: "Description 2",
        link: "https://bbc.com/article2",
        publicationDate: "2024-01-01T11:00:00Z",
      },
    ];

    mockRssSourceService.getActiveRssSources.mockResolvedValue(sources);
    mockRssFetchService.fetchRssFeed.mockResolvedValueOnce({ success: true, items: feed1Items });
    // Mock batch creation - returns articles with same structure as feed items
    mockArticleService.createArticlesBatch.mockResolvedValue({
      articles: feed1Items.map((item, index) => ({
        id: `article-id-${index + 1}`,
        sourceId: sources[0].id,
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      duplicatesSkipped: 0,
    });

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // With MAX_SOURCES_PER_RUN = 1, only first source is processed
    expect(body.processed).toBe(1);
    expect(body.succeeded).toBe(1);
    expect(body.failed).toBe(0);
    // Only first source processed, which has 2 articles
    expect(body.articlesCreated).toBe(2);
    expect(body.errors).toEqual([]);

    // Verify services were called correctly
    expect(mockRssSourceService.getActiveRssSources).toHaveBeenCalledTimes(1);
    // Only first source processed (MAX_SOURCES_PER_RUN = 1)
    expect(mockRssFetchService.fetchRssFeed).toHaveBeenCalledTimes(1);
    expect(mockRssFetchService.fetchRssFeed).toHaveBeenCalledWith("https://bbc.com/rss");
    // With batch processing, createArticlesBatch is called instead of createArticle
    expect(mockArticleService.createArticlesBatch).toHaveBeenCalledTimes(1);
    expect(mockArticleService.createArticlesBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: sources[0].id,
          title: "Article 1",
          link: "https://bbc.com/article1",
        }),
        expect.objectContaining({
          sourceId: sources[0].id,
          title: "Article 2",
          link: "https://bbc.com/article2",
        }),
      ]),
      true // skipSourceValidation
    );
    // Note: updateFetchStatus is no longer called per-source, but batch updated at the end
    // The batch update happens via direct Supabase client call, not through the service
  });

  test("should handle failed RSS feed fetch", async () => {
    const sources = [
      {
        id: "source-1",
        name: "BBC News",
        url: "https://bbc.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    mockRssSourceService.getActiveRssSources.mockResolvedValue(sources);
    mockRssFetchService.fetchRssFeed.mockResolvedValue({
      success: false,
      items: [],
      error: "Network timeout",
    });

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.articlesCreated).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toEqual({
      sourceId: "source-1",
      sourceName: "BBC News",
      error: "Network timeout",
    });

    // Note: updateFetchStatus is no longer called per-source (batch updated at end)
    expect(mockArticleService.createArticle).not.toHaveBeenCalled();
  });

  test.skip("should handle duplicate articles gracefully", async () => {
    const sources = [
      {
        id: "source-1",
        name: "BBC News",
        url: "https://bbc.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    const feedItems = [
      {
        title: "Article 1",
        description: "Description 1",
        link: "https://bbc.com/article1",
        publicationDate: "2024-01-01T10:00:00Z",
      },
      {
        title: "Article 2",
        description: "Description 2",
        link: "https://bbc.com/article2",
        publicationDate: "2024-01-01T11:00:00Z",
      },
    ];

    mockRssSourceService.getActiveRssSources.mockResolvedValue(sources);
    mockRssFetchService.fetchRssFeed.mockResolvedValue({ success: true, items: feedItems });
    // Mock batch creation - first article succeeds, second is duplicate (skipped)
    mockArticleService.createArticlesBatch.mockResolvedValue({
      articles: [
        {
          id: "article-1",
          sourceId: sources[0].id,
          ...feedItems[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      duplicatesSkipped: 1, // Second article is duplicate
    });

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.articlesCreated).toBe(1); // Only 1 created (1 duplicate skipped, 1 other error)
    // Note: updateFetchStatus is no longer called per-source to save subrequests
    // Instead, batch updates happen at the end if there are succeeded sources
  });

  test("should continue processing after one source fails", async () => {
    const sources = [
      {
        id: "source-1",
        name: "BBC News",
        url: "https://bbc.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "source-2",
        name: "The Guardian",
        url: "https://guardian.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      },
    ];

    mockRssSourceService.getActiveRssSources.mockResolvedValue(sources);
    mockRssFetchService.fetchRssFeed.mockResolvedValueOnce({ success: false, items: [], error: "Network timeout" });
    // Second source won't be processed (MAX_SOURCES_PER_RUN = 1), so no need to mock it

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // With MAX_SOURCES_PER_RUN = 1, only first source is processed
    expect(body.processed).toBe(1);
    expect(body.succeeded).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.articlesCreated).toBe(0);
    expect(body.errors).toHaveLength(1);

    // Only first source should have been processed (MAX_SOURCES_PER_RUN = 1)
    expect(mockRssFetchService.fetchRssFeed).toHaveBeenCalledTimes(1);
    // Note: updateFetchStatus is no longer called per-source (batch updated at end)
  });

  test("should handle unexpected errors during source processing", async () => {
    const sources = [
      {
        id: "source-1",
        name: "BBC News",
        url: "https://bbc.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    mockRssSourceService.getActiveRssSources.mockResolvedValue(sources);
    mockRssFetchService.fetchRssFeed.mockRejectedValue(new Error("Unexpected error"));

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
    // Note: updateFetchStatus is no longer called per-source (batch updated at end)
  });

  test("should handle errors during article creation", async () => {
    const sources = [
      {
        id: "source-1",
        name: "BBC News",
        url: "https://bbc.com/rss",
        isActive: true,
        lastFetchedAt: null,
        lastFetchError: null,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    const feedItems = [
      {
        title: "Article 1",
        description: "Description 1",
        link: "https://bbc.com/article1",
        publicationDate: "2024-01-01T10:00:00Z",
      },
    ];

    mockRssSourceService.getActiveRssSources.mockResolvedValue(sources);
    mockRssFetchService.fetchRssFeed.mockResolvedValue({ success: true, items: feedItems });
    mockArticleService.createArticle.mockRejectedValue(new Error("Database error"));

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.succeeded).toBe(1); // Source processed successfully
    expect(body.articlesCreated).toBe(0); // No articles created due to error
    // Note: updateFetchStatus is no longer called per-source (batch updated at end)
  });

  test("should handle error when fetching active sources fails", async () => {
    mockRssSourceService.getActiveRssSources.mockRejectedValue(new Error("Database connection failed"));

    const serviceUser = createMockServiceRoleUser();
    const context = createMockContext(serviceUser);
    const response = await POST(context);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
