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
 * Uses native DOMParser for Cloudflare Workers compatibility.
 */
export class RssFetchService {
  /**
   * Fetches and parses an RSS feed from a given URL.
   *
   * @param url - RSS feed URL to fetch
   * @returns RssFetchResult with parsed items or error
   */
  async fetchRssFeed(url: string): Promise<RssFetchResult> {
    try {
      logger.info("Fetching RSS feed", { url });

      // Fetch the RSS feed
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RSS Reader/1.0)",
        },
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get response as text - ensure UTF-8 encoding
      // First, try to detect encoding from XML declaration or Content-Type header
      const contentType = response.headers.get("content-type") || "";
      let xmlText: string;
      
      // Get as array buffer to manually decode if needed
      const arrayBuffer = await response.arrayBuffer();
      
      // Try to detect encoding from XML declaration (first 100 bytes should be enough)
      const preview = new TextDecoder("utf-8", { fatal: false }).decode(
        arrayBuffer.slice(0, Math.min(100, arrayBuffer.byteLength))
      );
      
      // Check XML declaration for encoding
      const xmlEncodingMatch = preview.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
      const xmlEncoding = xmlEncodingMatch?.[1]?.toLowerCase();
      
      // Determine encoding: XML declaration > Content-Type header > UTF-8 default
      let encoding = "utf-8";
      if (xmlEncoding) {
        encoding = xmlEncoding;
      } else if (contentType.includes("charset")) {
        const charsetMatch = contentType.match(/charset=([^;]+)/i);
        if (charsetMatch?.[1]) {
          encoding = charsetMatch[1].trim().toLowerCase();
        }
      }
      
      // Decode with detected encoding, fallback to UTF-8
      try {
        const decoder = new TextDecoder(encoding, { fatal: false });
        xmlText = decoder.decode(arrayBuffer);
      } catch {
        // Fallback to UTF-8 if encoding detection fails
        const decoder = new TextDecoder("utf-8", { fatal: false });
        xmlText = decoder.decode(arrayBuffer);
      }
      
      const items = this.parseRssXml(xmlText);

      logger.info("RSS feed fetched successfully", {
        url,
        itemsFound: items.length,
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
   * Parses RSS XML using DOMParser (Cloudflare Workers compatible).
   *
   * @param xmlText - RSS XML as string
   * @returns Array of parsed RSS items
   */
  private parseRssXml(xmlText: string): ParsedRssItem[] {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");

      // Check for parser errors
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        throw new Error("Invalid XML format");
      }

      // Find all item elements (works for RSS and Atom feeds)
      const items: ParsedRssItem[] = [];
      const itemElements = doc.querySelectorAll("item, entry");

      for (const itemElement of itemElements) {
        const item = this.parseRssItemElement(itemElement);
        if (item) {
          items.push(item);
        }
      }

      return items;
    } catch (error) {
      logger.warn("Failed to parse RSS XML with DOMParser, falling back to regex", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback to simple regex parsing if DOMParser fails
      return this.parseRssWithRegex(xmlText);
    }
  }

  /**
   * Parses a single RSS item element using DOM API.
   *
   * @param itemElement - XML element representing an RSS item
   * @returns ParsedRssItem or null if item is invalid
   */
  private parseRssItemElement(itemElement: Element): ParsedRssItem | null {
    // Get title (required)
    const titleElement = itemElement.querySelector("title");
    const title = titleElement?.textContent?.trim();
    if (!title) return null;

    // Get link (required) - try multiple possible tag names
    const linkSelectors = ["link", "guid"];
    let link: string | null = null;

    for (const selector of linkSelectors) {
      const linkElement = itemElement.querySelector(selector);
      if (linkElement) {
        // For Atom feeds, link might be an attribute
        link = linkElement.getAttribute("href") || linkElement.textContent?.trim() || null;
        if (link) break;
      }
    }

    if (!link) return null;

    // Get description/content
    const descriptionSelectors = ["description", "summary", "content"];
    let description: string | null = null;

    for (const selector of descriptionSelectors) {
      const descElement = itemElement.querySelector(selector);
      if (descElement?.textContent) {
        description = descElement.textContent.trim();
        break;
      }
    }

    // Get publication date
    const dateSelectors = ["pubDate", "published", "updated", "dc\\:date"];
    let publicationDate: Date = new Date();

    for (const selector of dateSelectors) {
      const dateElement = itemElement.querySelector(selector);
      if (dateElement?.textContent) {
        try {
          publicationDate = new Date(dateElement.textContent.trim());
          if (!Number.isNaN(publicationDate.getTime())) {
            break;
          }
        } catch {
          // Continue to next selector
        }
      }
    }

    // Clean and limit description
    if (description) {
      description = this.stripHtml(description);
      if (description.length > 5000) {
        description = description.substring(0, 5000);
      }
    }

    return {
      title,
      description: description || null,
      link,
      publicationDate: publicationDate.toISOString(),
    };
  }

  /**
   * Fallback RSS parsing using regex (simpler but less reliable).
   *
   * @param xmlText - RSS XML as string
   * @returns Array of parsed RSS items
   */
  private parseRssWithRegex(xmlText: string): ParsedRssItem[] {
    const items: ParsedRssItem[] = [];

    // Simple regex to extract items
    const itemRegex = /<item[^>]*>(.*?)<\/item>/gis;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
      const itemXml = itemMatch[1];
      const item = this.parseRssItemWithRegex(itemXml);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parses a single RSS item using regex.
   *
   * @param itemXml - XML content of a single item
   * @returns ParsedRssItem or null if invalid
   */
  private parseRssItemWithRegex(itemXml: string): ParsedRssItem | null {
    // Extract title
    const titleMatch = itemXml.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim();
    if (!title) return null;

    // Extract link
    const linkMatch =
      itemXml.match(/<link[^>]*>(.*?)<\/link>/i) ||
      itemXml.match(/<guid[^>]*>(.*?)<\/guid>/i) ||
      itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
    let link = linkMatch?.[1]?.trim();
    if (!link) return null;
    
    // Strip CDATA tags from link (same as title)
    link = link.replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim();

    // Extract description
    const descMatch =
      itemXml.match(/<description[^>]*>(.*?)<\/description>/i) ||
      itemXml.match(/<summary[^>]*>(.*?)<\/summary>/i) ||
      itemXml.match(/<content[^>]*>(.*?)<\/content>/i);
    let description = descMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() || null;

    // Extract publication date
    const dateMatch =
      itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i) ||
      itemXml.match(/<published[^>]*>(.*?)<\/published>/i) ||
      itemXml.match(/<updated[^>]*>(.*?)<\/updated>/i);
    let publicationDate = new Date();

    if (dateMatch?.[1]) {
      try {
        publicationDate = new Date(dateMatch[1].trim());
      } catch {
        // Keep default date
      }
    }

    // Clean description
    if (description) {
      description = this.stripHtml(description);
      if (description.length > 5000) {
        description = description.substring(0, 5000);
      }
    }

    return {
      title,
      description,
      link,
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
