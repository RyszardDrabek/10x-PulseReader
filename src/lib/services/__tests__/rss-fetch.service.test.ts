/**
 * Unit tests for RssFetchService
 *
 * Tests are implemented using Vitest following the project's testing guidelines.
 * Uses vi.mock() for mocking rss-parser and global.fetch.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/vitest.setup.ts";
import Parser from "rss-parser";
import { RssFetchService } from "../rss-fetch.service.ts";

// Mock rss-parser
vi.mock("rss-parser", () => {
  return {
    default: vi.fn(),
  };
});

describe("RssFetchService", () => {
  let service: RssFetchService;
  let mockParser: {
    parseString: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockParser = {
      parseString: vi.fn(),
    };
    (Parser as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockParser);
    service = new RssFetchService();
    // Reset MSW handlers
    server.resetHandlers();
  });

  describe("fetchRssFeed", () => {
    test("should successfully fetch and parse RSS feed", async () => {
      const mockFeed = {
        items: [
          {
            title: "Test Article 1",
            link: "https://example.com/article1",
            pubDate: "2024-01-01T10:00:00Z",
            contentSnippet: "Article 1 description",
          },
          {
            title: "Test Article 2",
            link: "https://example.com/article2",
            isoDate: "2024-01-02T10:00:00Z",
            content: "<p>Article 2 description</p>",
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        title: "Test Article 1",
        link: "https://example.com/article1",
        description: "Article 1 description",
        publicationDate: expect.any(String),
      });
      expect(result.items[1]).toEqual({
        title: "Test Article 2",
        link: "https://example.com/article2",
        description: "Article 2 description",
        publicationDate: expect.any(String),
      });
      expect(mockParser.parseString).toHaveBeenCalledWith("<rss>...</rss>");
    });

    test("should handle feed with no items", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss></rss>");
        })
      );
      mockParser.parseString.mockResolvedValue({
        items: [],
      });

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toEqual([]);
    });

    test("should handle feed with null items", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss></rss>");
        })
      );
      mockParser.parseString.mockResolvedValue({
        items: null,
      });

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toEqual([]);
    });

    test("should filter out invalid items (missing title or link)", async () => {
      const mockFeed = {
        items: [
          {
            title: "Valid Article",
            link: "https://example.com/valid",
            pubDate: "2024-01-01T10:00:00Z",
          },
          {
            title: "Missing Link",
            // No link
            pubDate: "2024-01-01T10:00:00Z",
          },
          {
            // No title
            link: "https://example.com/no-title",
            pubDate: "2024-01-01T10:00:00Z",
          },
          {
            title: "Another Valid Article",
            link: "https://example.com/valid2",
            pubDate: "2024-01-01T11:00:00Z",
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe("Valid Article");
      expect(result.items[1].title).toBe("Another Valid Article");
    });

    test("should handle different date formats", async () => {
      const mockFeed = {
        items: [
          {
            title: "Article with pubDate",
            link: "https://example.com/1",
            pubDate: "Mon, 01 Jan 2024 10:00:00 GMT",
          },
          {
            title: "Article with isoDate",
            link: "https://example.com/2",
            isoDate: "2024-01-02T10:00:00Z",
          },
          {
            title: "Article with dcDate",
            link: "https://example.com/3",
            dcDate: "2024-01-03T10:00:00Z",
          },
          {
            title: "Article with no date",
            link: "https://example.com/4",
            // No date field
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(4);
      // All should have valid ISO date strings
      result.items.forEach((item) => {
        expect(item.publicationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    test("should handle invalid date formats gracefully", async () => {
      const mockFeed = {
        items: [
          {
            title: "Article with invalid date",
            link: "https://example.com/1",
            pubDate: "invalid-date",
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      // Should fallback to current date (valid ISO string)
      expect(result.items[0].publicationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test("should handle description from different fields", async () => {
      const mockFeed = {
        items: [
          {
            title: "Article with contentSnippet",
            link: "https://example.com/1",
            contentSnippet: "Snippet description",
          },
          {
            title: "Article with content",
            link: "https://example.com/2",
            content: "<p>HTML content</p>",
          },
          {
            title: "Article with summary",
            link: "https://example.com/3",
            summary: "Summary description",
          },
          {
            title: "Article with no description",
            link: "https://example.com/4",
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(4);
      expect(result.items[0].description).toBe("Snippet description");
      expect(result.items[1].description).toBe("HTML content"); // HTML stripped
      expect(result.items[2].description).toBe("Summary description");
      expect(result.items[3].description).toBeNull();
    });

    test("should strip HTML from content", async () => {
      const mockFeed = {
        items: [
          {
            title: "Article with HTML",
            link: "https://example.com/1",
            content: "<p>Paragraph with <strong>bold</strong> text</p>",
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items[0].description).toBe("Paragraph with bold text");
    });

    test("should truncate long descriptions to 5000 characters", async () => {
      const longDescription = "a".repeat(6000);
      const mockFeed = {
        items: [
          {
            title: "Article with long description",
            link: "https://example.com/1",
            contentSnippet: longDescription,
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items[0].description).toHaveLength(5000);
      expect(result.items[0].description).toBe(longDescription.substring(0, 5000));
    });

    test("should handle network errors", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          throw new Error("Network timeout");
        })
      );

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(false);
      expect(result.items).toEqual([]);
      expect(result.error).toBe("HTTP 500: Unhandled Exception");
    });

    test("should handle HTTP errors", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("Not Found", { status: 404, statusText: "Not Found" });
        })
      );

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(false);
      expect(result.error).toBe("HTTP 404: Not Found");
    });

    test("should handle timeout errors", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          throw new Error("Request timeout");
        })
      );

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(false);
      expect(result.error).toBe("HTTP 500: Unhandled Exception");
    });

    test("should handle invalid XML errors", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("invalid xml");
        })
      );
      const error = new Error("Invalid XML");
      mockParser.parseString.mockRejectedValue(error);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid XML");
    });

    test("should trim whitespace from title and link", async () => {
      const mockFeed = {
        items: [
          {
            title: "  Article with spaces  ",
            link: "  https://example.com/article  ",
            pubDate: "2024-01-01T10:00:00Z",
          },
        ],
      };

      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.text("<rss>...</rss>");
        })
      );
      mockParser.parseString.mockResolvedValue(mockFeed);

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items[0].title).toBe("Article with spaces");
      expect(result.items[0].link).toBe("https://example.com/article");
    });
  });
});
