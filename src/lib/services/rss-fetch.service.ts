import Parser from "rss-parser";

import { logger } from "../utils/logger.ts";

/**
 * Parsed RSS feed item structure.
 */
export interface ParsedRssItem {
  title: string;
  description: string | null;
  link: string;
  publicationDate: string;
}

/**
 * Result of fetching and parsing an RSS feed.
 */
export interface RssFetchResult {
  success: boolean;
  items: ParsedRssItem[];
  error?: string;
}

/**
 * Service for fetching and parsing RSS feeds.
 * Handles RSS feed fetching, XML parsing, and error handling.
 */
export class RssFetchService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 30000, // 30 seconds timeout per feed
      customFields: {
        item: [
          ["pubDate", "pubDate"],
          ["dc:date", "dcDate"],
        ],
      },
      // Use fetch API for Cloudflare Workers compatibility
      requestOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RSS Reader/1.0)",
        },
      },
    });
  }

  /**
   * Fetches and parses an RSS feed from a given URL.
   *
   * @param url - RSS feed URL to fetch
   * @returns RssFetchResult with parsed items or error
   */
  async fetchRssFeed(url: string): Promise<RssFetchResult> {
    try {
      logger.info("Fetching RSS feed", { url });

      // Use fetch API for Cloudflare Workers compatibility
      // Fetch the RSS feed first, then parse it
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RSS Reader/1.0)",
        },
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const feed = await this.parser.parseString(xmlText);

      if (!feed.items || feed.items.length === 0) {
        logger.warn("RSS feed contains no items", { url });
        return {
          success: true,
          items: [],
        };
      }

      const items: ParsedRssItem[] = feed.items
        .map((item) => this.parseRssItem(item))
        .filter((item): item is ParsedRssItem => item !== null);

      logger.info("RSS feed fetched successfully", {
        url,
        itemsFound: feed.items.length,
        itemsParsed: items.length,
      });

      return {
        success: true,
        items,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Failed to fetch RSS feed", error, { url });

      return {
        success: false,
        items: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Parses a single RSS item into a structured format.
   *
   * @param item - RSS item from rss-parser
   * @returns ParsedRssItem or null if item is invalid
   */
  private parseRssItem(item: Parser.Item): ParsedRssItem | null {
    // Validate required fields
    if (!item.title || !item.link) {
      return null;
    }

    // Parse publication date
    let publicationDate: Date;
    try {
      // Try multiple date formats
      if (item.pubDate) {
        publicationDate = new Date(item.pubDate);
      } else if (item.isoDate) {
        publicationDate = new Date(item.isoDate);
      } else if ((item as { dcDate?: string }).dcDate) {
        publicationDate = new Date((item as { dcDate: string }).dcDate);
      } else {
        // Default to current date if no date found
        publicationDate = new Date();
      }

      // Validate date
      if (Number.isNaN(publicationDate.getTime())) {
        publicationDate = new Date();
      }
    } catch {
      // Fallback to current date on parse error
      publicationDate = new Date();
    }

    // Normalize description (can be HTML, plain text, or null)
    let description: string | null = null;
    if (item.contentSnippet) {
      description = item.contentSnippet.trim();
    } else if (item.content) {
      // Strip HTML tags for content field
      description = this.stripHtml(item.content).trim();
    } else if (item.summary) {
      description = item.summary.trim();
    }

    // Limit description length to 5000 characters (database constraint)
    if (description && description.length > 5000) {
      description = description.substring(0, 5000);
    }

    return {
      title: item.title.trim(),
      description: description || null,
      link: item.link.trim(),
      publicationDate: publicationDate.toISOString(),
    };
  }

  /**
   * Strips HTML tags from a string (simple implementation).
   *
   * @param html - HTML string to strip
   * @returns Plain text without HTML tags
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
