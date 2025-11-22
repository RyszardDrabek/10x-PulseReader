/**
 * Unit tests for RssFetchService
 *
 * Tests are implemented using Vitest following the project's testing guidelines.
 * Uses MSW for mocking fetch requests.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/vitest.setup.ts";
import { RssFetchService } from "../rss-fetch.service.ts";

describe("RssFetchService", () => {
  let service: RssFetchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RssFetchService();
    // Reset MSW handlers
    server.resetHandlers();
  });

  describe("fetchRssFeed", () => {
    test("should successfully fetch and parse RSS feed", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.xml(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <description>Test RSS Feed</description>
    <item>
      <title>Test Article 1</title>
      <link>https://example.com/article1</link>
      <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
      <description>Article 1 description</description>
    </item>
    <item>
      <title>Test Article 2</title>
      <link>https://example.com/article2</link>
      <pubDate>Tue, 02 Jan 2024 10:00:00 GMT</pubDate>
      <description>Article 2 description</description>
    </item>
  </channel>
</rss>`);
        })
      );

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe("Test Article 1");
      expect(result.items[0].link).toBe("https://example.com/article1");
      expect(result.items[0].description).toBe("Article 1 description");
      expect(result.items[1].title).toBe("Test Article 2");
      expect(result.items[1].link).toBe("https://example.com/article2");
      expect(result.items[1].description).toBe("Article 2 description");
    });

    test("should handle network errors", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          return HttpResponse.error();
        })
      );

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toBeDefined();
    });

    test("should handle HTTP errors", async () => {
      server.use(
        http.get("https://example.com/rss", () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      const result = await service.fetchRssFeed("https://example.com/rss");

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.error).toContain("HTTP 404");
    });
  });

  describe("stripHtml", () => {
    test("should strip HTML tags from text", () => {
      const input = "<p>Hello <strong>world</strong>!</p><br>";
      const result = (service as typeof service & { stripHtml: (html: string) => string }).stripHtml(input);
      expect(result).toBe("Hello world!");
    });

    test("should handle empty input", () => {
      const result = (service as typeof service & { stripHtml: (html: string) => string }).stripHtml("");
      expect(result).toBe("");
    });
  });
});
