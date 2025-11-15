import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type {
  ArticleEntity,
  CreateArticleCommand,
  ArticleDto,
  ArticleListResponse,
  GetArticlesQueryParams,
  ProfileEntity,
} from "../../types.ts";

type JoinedArticle = Database["app"]["Tables"]["articles"]["Row"] & {
  source: {
    id: string;
    name: string;
    url: string;
  };
  article_topics: {
    topics: {
      id: string;
      name: string;
    } | null;
  }[];
};

// Type alias for Supabase query builders to avoid complex PostgrestFilterBuilder generics

/**
 * Service for managing article operations.
 * Handles article creation with validation and topic associations.
 */
export class ArticleService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Validates that the RSS source exists in the database.
   * @param sourceId - UUID of the RSS source to validate
   * @returns true if source exists, false otherwise
   */
  async validateSource(sourceId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .schema("app")
      .from("rss_sources")
      .select("id")
      .eq("id", sourceId)
      .single();

    return !error && data !== null;
  }

  /**
   * Validates that all provided topic IDs exist in the database.
   * @param topicIds - Array of topic UUIDs to validate
   * @returns Object with validation result and list of invalid IDs if any
   */
  async validateTopics(topicIds: string[]): Promise<{
    valid: boolean;
    invalidIds: string[];
  }> {
    if (!topicIds || topicIds.length === 0) {
      return { valid: true, invalidIds: [] };
    }

    const { data, error } = await this.supabase.schema("app").from("topics").select("id").in("id", topicIds);

    if (error || !data) {
      return { valid: false, invalidIds: topicIds };
    }

    const foundIds = new Set(data.map((t) => t.id));
    const invalidIds = topicIds.filter((id) => !foundIds.has(id));

    return { valid: invalidIds.length === 0, invalidIds };
  }

  /**
   * Fetches a paginated list of articles with optional filters and personalization.
   *
   * @param params - Query parameters for filtering, sorting, and pagination
   * @param userId - Optional authenticated user ID for personalization
   * @returns ArticleListResponse with articles, pagination, and filters applied metadata
   * @throws Error with specific codes:
   *   - PROFILE_NOT_FOUND: User profile not found when personalization requested
   */
  async getArticles(params: GetArticlesQueryParams, userId?: string): Promise<ArticleListResponse> {
    // Calculate fetch limit (over-fetch for blocklist filtering if needed)
    const userProfile = params.applyPersonalization && userId ? await this.getProfile(userId) : null;

    if (params.applyPersonalization && userId && !userProfile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    const shouldOverFetch = params.applyPersonalization && userProfile?.blocklist && userProfile.blocklist.length > 0;
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const fetchLimit = shouldOverFetch ? limit * 2 : limit;

    // Build base query with joins for source and topics
    let query = this.supabase
      .schema("app")
      .from("articles")
      .select(
        `
        *,
        source:rss_sources!source_id(id, name, url),
        article_topics!article_topics_article_id_fkey(
          topics!article_topics_topic_id_fkey(id, name)
        )
      `,
        { count: "exact" }
      );

    // Apply filters
    query = this.applyFilters(query, params, userProfile);

    // Apply sorting
    const sortField = params.sortBy === "publication_date" ? "publication_date" : "created_at";
    const ascending = params.sortOrder === "asc";
    query = query.order(sortField, { ascending });

    // Apply pagination
    query = query.range(offset, offset + fetchLimit - 1);

    // Execute query
    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    // Apply blocklist filtering if personalization is enabled
    let blockedCount = 0;
    let filteredData: JoinedArticle[] = data || [];

    if (params.applyPersonalization && userProfile?.blocklist && userProfile.blocklist.length > 0) {
      const beforeFilterCount = filteredData.length;
      filteredData = this.applyBlocklistFilter(filteredData, userProfile.blocklist);
      blockedCount = beforeFilterCount - filteredData.length;

      // Trim to requested limit
      filteredData = filteredData.slice(0, limit);
    }

    // Map to DTOs
    const articles = filteredData.map((article) => this.mapArticleToDto(article));

    // Build response
    return {
      data: articles,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
      filtersApplied: {
        sentiment: params.sentiment,
        personalization: params.applyPersonalization,
        blockedItemsCount: blockedCount > 0 ? blockedCount : undefined,
      },
    };
  }

  /**
   * Creates a new article with optional topic associations.
   * Implements transaction-like behavior: if topic associations fail,
   * the article is rolled back.
   *
   * @param command - Article creation command with all required fields
   * @returns Created article entity in camelCase format
   * @throws Error with specific codes:
   *   - RSS_SOURCE_NOT_FOUND: sourceId doesn't exist
   *   - INVALID_TOPIC_IDS: one or more topicIds don't exist
   *   - ARTICLE_ALREADY_EXISTS: duplicate article link
   *   - TOPIC_ASSOCIATION_FAILED: failed to create topic associations
   */
  async createArticle(command: CreateArticleCommand): Promise<ArticleEntity> {
    // Step 1: Validate source exists
    const sourceExists = await this.validateSource(command.sourceId);
    if (!sourceExists) {
      throw new Error("RSS_SOURCE_NOT_FOUND");
    }

    // Step 2: Validate topics exist (if provided)
    if (command.topicIds && command.topicIds.length > 0) {
      const topicValidation = await this.validateTopics(command.topicIds);
      if (!topicValidation.valid) {
        throw new Error(`INVALID_TOPIC_IDS:${JSON.stringify(topicValidation.invalidIds)}`);
      }
    }

    // Step 3: Insert article
    const { data: article, error: insertError } = await this.supabase
      .schema("app")
      .from("articles")
      .insert({
        source_id: command.sourceId,
        title: command.title,
        description: command.description ?? null,
        link: command.link,
        publication_date: command.publicationDate,
        sentiment: command.sentiment ?? null,
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique constraint violation (duplicate link)
      if (insertError.code === "23505") {
        throw new Error("ARTICLE_ALREADY_EXISTS");
      }
      throw insertError;
    }

    // Step 4: Create topic associations (if provided)
    if (command.topicIds && command.topicIds.length > 0) {
      const associations = command.topicIds.map((topicId) => ({
        article_id: article.id,
        topic_id: topicId,
      }));

      const { error: associationError } = await this.supabase.schema("app").from("article_topics").insert(associations);

      if (associationError) {
        // Rollback: delete the article that was just created
        await this.supabase.schema("app").from("articles").delete().eq("id", article.id);

        throw new Error("TOPIC_ASSOCIATION_FAILED");
      }
    }

    // Step 5: Map database response to ArticleEntity (snake_case to camelCase)
    return {
      id: article.id,
      sourceId: article.source_id,
      title: article.title,
      description: article.description,
      link: article.link,
      publicationDate: article.publication_date,
      sentiment: article.sentiment,
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    };
  }

  /**
   * Applies query filters (sentiment, topicId, sourceId) to the Supabase query.
   * Also applies mood-based filtering if personalization is enabled.
   *
   * @param query - The Supabase query builder
   * @param params - Query parameters with filter values
   * @param userProfile - Optional user profile for mood-based filtering
   * @returns Modified query with filters applied
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyFilters(query: any, params: GetArticlesQueryParams, userProfile: ProfileEntity | null): any {
    // Filter by sentiment (explicit or from mood)
    if (params.sentiment) {
      query = query.eq("sentiment", params.sentiment);
    } else if (params.applyPersonalization && userProfile?.mood) {
      // Apply mood-based sentiment filtering
      query = query.eq("sentiment", userProfile.mood);
    }

    // Filter by source ID
    if (params.sourceId) {
      query = query.eq("source_id", params.sourceId);
    }

    // Filter by topic ID - we need to filter articles that have this topic
    if (params.topicId) {
      // Using the article_topics join table to filter
      query = query.filter("article_topics.topics.id", "eq", params.topicId);
    }

    return query;
  }

  /**
   * Applies blocklist filtering to articles.
   * Filters out articles where title, description, or link contains blocklisted terms.
   * Filtering is case-insensitive.
   *
   * @param articles - Raw articles from database
   * @param blocklist - Array of blocked terms/keywords
   * @returns Filtered array of articles
   */
  private applyBlocklistFilter(articles: JoinedArticle[], blocklist: string[]): JoinedArticle[] {
    const lowerBlocklist = blocklist.map((term) => term.toLowerCase());

    return articles.filter((article) => {
      const title = (article.title || "").toLowerCase();
      const description = (article.description || "").toLowerCase();
      const link = (article.link || "").toLowerCase();

      // Check if any blocklist term appears in title, description, or link
      for (const term of lowerBlocklist) {
        if (title.includes(term) || description.includes(term) || link.includes(term)) {
          return false; // Article is blocked
        }
      }

      return true; // Article passes blocklist filter
    });
  }

  /**
   * Fetches user profile by user ID.
   *
   * @param userId - UUID of the user
   * @returns Profile entity or null if not found
   */
  private async getProfile(userId: string): Promise<ProfileEntity | null> {
    const { data, error } = await this.supabase
      .schema("app")
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      mood: data.mood,
      blocklist: data.blocklist || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Maps database article with relations to ArticleDto.
   * Handles nested source and topics transformations.
   *
   * @param article - Raw article from database with joined relations
   * @returns ArticleDto with properly nested source and topics
   */
  private mapArticleToDto(article: JoinedArticle): ArticleDto {
    return {
      id: article.id,
      title: article.title,
      description: article.description,
      link: article.link,
      publicationDate: article.publication_date,
      sentiment: article.sentiment,
      source: {
        id: article.source.id,
        name: article.source.name,
        url: article.source.url,
      },
      topics: (article.article_topics || [])
        .map((at: { topics: { id: string; name: string } | null }) => at.topics)
        .filter((t: { id: string; name: string } | null) => t !== null)
        .map((topic: { id: string; name: string }) => ({
          id: topic.id,
          name: topic.name,
        })),
      createdAt: article.created_at,
      updatedAt: article.updated_at,
    };
  }
}
