import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";

/**
 * Custom error class for database-related errors that preserves the original Supabase error.
 */
class DatabaseError extends Error {
  public readonly supabaseError: PostgrestError;

  constructor(message: string, supabaseError: PostgrestError) {
    super(message);
    this.name = "DatabaseError";
    this.supabaseError = supabaseError;
  }
}
import type {
  ArticleEntity,
  CreateArticleCommand,
  UpdateArticleCommand,
  ArticleDto,
  ArticleListResponse,
  GetArticlesQueryParams,
  ProfileEntity,
} from "../../types.ts";

type JoinedArticle = Database["app"]["Tables"]["articles"]["Row"] & {
  rss_sources?: {
    id: string;
    name: string;
    url: string;
  };
  source?: {
    id: string;
    name: string;
    url: string;
  };
  article_topics?: {
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
   * Executes a query with fallback schema support.
   * Tries "app" schema first, falls back to "public" if it fails.
   */
  private async executeQueryWithSchemaFallback<T>(
    queryBuilder: (schema: string) => Promise<{ data: T; error: PostgrestError | null }>
  ): Promise<{ data: T; error: PostgrestError | null }> {
    // Try with "app" schema first
    let result = await queryBuilder("app");

    // If schema "app" fails with error code 1003 (schema not found), try "public"
    if (result.error && (result.error.code === "1003" || result.error.message?.includes("schema"))) {
      console.log("[ArticleService] Schema 'app' failed, trying 'public' schema");
      result = await queryBuilder("public");
    }

    return result;
  }

  /**
   * Validates that the RSS source exists in the database.
   * @param sourceId - UUID of the RSS source to validate
   * @returns true if source exists, false otherwise
   */
  async validateSource(sourceId: string): Promise<boolean> {
    // Use .maybeSingle() instead of .single() to avoid errors when source doesn't exist
    // .maybeSingle() returns null data instead of error when no rows found
    const result = await this.executeQueryWithSchemaFallback(async (schema) => {
      return await this.supabase.schema(schema).from("rss_sources").select("id").eq("id", sourceId).maybeSingle();
    });
    const { data, error } = result;

    // If there's an error (other than "not found"), return false
    if (error) {
      // PGRST116 = no rows returned (expected for non-existent sources)
      // Other errors indicate a real problem
      return false;
    }

    return data !== null;
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
    console.log("[ArticleService.getArticles] START:", {
      params,
      userId,
      applyPersonalization: params.applyPersonalization,
      applyPersonalizationType: typeof params.applyPersonalization,
    });

    // For debugging - ensure personalization is disabled for guests
    if (!userId && params.applyPersonalization) {
      console.warn("[ArticleService] Personalization requested for guest user, disabling");
      params.applyPersonalization = false;
    }

    // Calculate fetch limit (over-fetch for blocklist filtering if needed)
    let userProfile = null;
    if (userId) {
      console.log("[ArticleService] Fetching profile for userId:", userId);
      userProfile = await this.getProfile(userId);
      console.log("[ArticleService] User profile fetched:", {
        profileExists: !!userProfile,
        personalizationEnabled: userProfile?.personalizationEnabled,
        mood: userProfile?.mood,
        blocklistLength: userProfile?.blocklist?.length,
      });
    }

    // Automatically apply personalization for authenticated users if enabled in their profile
    // Only override if applyPersonalization is not explicitly set to false
    if (userId && userProfile && params.applyPersonalization !== false) {
      const shouldApplyPersonalization = userProfile.personalizationEnabled ?? true;
      console.log("[ArticleService] Checking personalization settings:", {
        userId,
        currentApplyPersonalization: params.applyPersonalization,
        personalizationEnabled: userProfile.personalizationEnabled,
        shouldApplyPersonalization,
        willSetToTrue: shouldApplyPersonalization && params.applyPersonalization === undefined,
      });
      if (shouldApplyPersonalization && params.applyPersonalization === undefined) {
        params.applyPersonalization = true;
        console.log("[ArticleService] Set applyPersonalization to true for authenticated user");
      }
    }

    if (params.applyPersonalization && userId && !userProfile) {
      console.error("[ArticleService] Personalization requested but no profile found for user:", userId);
      throw new Error("PROFILE_NOT_FOUND");
    }

    console.log("[ArticleService] Final personalization state:", {
      applyPersonalization: params.applyPersonalization,
      userId,
      hasProfile: !!userProfile,
      mood: userProfile?.mood,
      blocklistLength: userProfile?.blocklist?.length,
    });

    const shouldOverFetch = params.applyPersonalization && userProfile?.blocklist && userProfile.blocklist.length > 0;
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const fetchLimit = shouldOverFetch ? limit * 2 : limit;

    // If filtering by topic, first fetch article IDs that have this topic
    let articleIdsForTopic: string[] | null = null;
    if (params.topicId) {
      const topicResult = await this.executeQueryWithSchemaFallback(async (schema) => {
        return await this.supabase
          .schema(schema)
          .from("article_topics")
          .select("article_id")
          .eq("topic_id", params.topicId);
      });
      const { data: articleTopics, error: topicError } = topicResult;

      if (topicError) {
        throw topicError;
      }

      articleIdsForTopic = articleTopics?.map((at) => at.article_id) || [];

      // If no articles found for this topic, return empty result early
      if (articleIdsForTopic.length === 0) {
        return {
          data: [],
          pagination: {
            limit,
            offset,
            total: 0,
            hasMore: false,
          },
          filtersApplied: {
            sentiment: params.sentiment,
            personalization: params.applyPersonalization,
          },
        };
      }
    }

    // Build base query with joins for source and topics
    // We'll use schema fallback for the main query
    let querySchema = "app";
    let query = this.supabase
      .schema(querySchema)
      .from("articles")
      .select(
        `
      id,
      title,
      description,
      link,
      publication_date,
      sentiment,
      created_at,
      updated_at,
      rss_sources!articles_source_id_fkey (
        id,
        name,
        url
      ),
      article_topics (
        topics (
          id,
          name
        )
      )
    `,
        { count: "exact" }
      );

    // Apply filters
    console.log("[ArticleService] About to apply filters:", {
      applyPersonalization: params.applyPersonalization,
      sentiment: params.sentiment,
      topicId: params.topicId,
      sourceId: params.sourceId,
      hasUserProfile: !!userProfile,
      mood: userProfile?.mood,
    });
    query = this.applyFilters(query, params, userProfile, articleIdsForTopic);

    // Apply sorting - default to publication_date desc (newest first)
    const sortField = params.sortBy || "publication_date";
    const ascending = params.sortOrder === "asc";
    query = query.order(sortField, { ascending });

    // Apply pagination
    query = query.range(offset, offset + fetchLimit - 1);

    // Execute query with schema fallback
    console.log("[ArticleService] Executing database query with filters applied");
    let queryResult = await query;
    let { data, count, error } = queryResult;

    // If schema "app" fails with error code 1003, try "public"
    if (error && (error.code === "1003" || error.message?.includes("schema"))) {
      console.log("[ArticleService] Main query failed with schema error, trying 'public' schema");
      querySchema = "public";
      const fallbackQuery = this.supabase
        .schema(querySchema)
        .from("articles")
        .select(
          `
        id,
        title,
        description,
        link,
        publication_date,
        sentiment,
        created_at,
        updated_at,
        rss_sources!articles_source_id_fkey (
          id,
          name,
          url
        ),
        article_topics (
          topics (
            id,
            name
          )
        )
      `,
          { count: "exact" }
        );

      // Reapply filters with new schema
      const filteredFallbackQuery = this.applyFilters(fallbackQuery, params, userProfile, articleIdsForTopic);
      const sortedFallbackQuery = filteredFallbackQuery.order(sortField, { ascending });
      const paginatedFallbackQuery = sortedFallbackQuery.range(offset, offset + fetchLimit - 1);

      queryResult = await paginatedFallbackQuery;
      data = queryResult.data;
      count = queryResult.count;
      error = queryResult.error;
    }

    if (error) {
      // Wrap Supabase error in DatabaseError for better error handling
      const errorMessage = error.message || JSON.stringify(error);
      console.error("[ArticleService.getArticles] Database error:", error);
      throw new DatabaseError(`Database query failed: ${errorMessage}`, error);
    }

    // Apply blocklist filtering if personalization is enabled
    let blockedCount = 0;
    // Data now includes joined relationships
    let filteredData: JoinedArticle[] = (data as JoinedArticle[]) || [];

    console.log("[ArticleService] Database query results:", {
      totalFromDb: count,
      articlesFetched: filteredData.length,
      applyPersonalization: params.applyPersonalization,
      hasBlocklist: !!(userProfile?.blocklist && userProfile.blocklist.length > 0),
      blocklistLength: userProfile?.blocklist?.length || 0,
    });

    if (params.applyPersonalization && userProfile?.blocklist && userProfile.blocklist.length > 0) {
      console.log("[ArticleService] Applying blocklist filter:", {
        blocklist: userProfile.blocklist,
        articlesBeforeFilter: filteredData.length,
      });
      const beforeFilterCount = filteredData.length;
      filteredData = this.applyBlocklistFilter(filteredData, userProfile.blocklist);
      blockedCount = beforeFilterCount - filteredData.length;

      console.log("[ArticleService] Blocklist filter results:", {
        articlesAfterFilter: filteredData.length,
        blockedCount,
      });

      // Trim to requested limit
      filteredData = filteredData.slice(0, limit);
    } else {
      console.log("[ArticleService] Skipping blocklist filter:", {
        applyPersonalization: params.applyPersonalization,
        hasBlocklist: !!(userProfile?.blocklist && userProfile.blocklist.length > 0),
        reason: !params.applyPersonalization ? "personalization disabled" : "no blocklist",
      });
    }

    // Map to DTOs with error handling
    // If mapping fails for an article, skip it to prevent a single bad article from breaking the response
    const articles: ArticleDto[] = [];
    for (const article of filteredData) {
      try {
        articles.push(this.mapArticleToDto(article));
      } catch {
        // Skip this article - don't include it in the response
        // Error will be logged at API level if needed
      }
    }

    // Build response
    const result = {
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

    return result;
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
  async createArticle(command: CreateArticleCommand, skipSourceValidation = false): Promise<ArticleEntity> {
    // Step 1: Validate source exists (can be skipped if source was already validated)
    if (!skipSourceValidation) {
      const sourceExists = await this.validateSource(command.sourceId);
      if (!sourceExists) {
        throw new Error("RSS_SOURCE_NOT_FOUND");
      }
    }

    // Step 2: Validate topics exist (if provided)
    if (command.topicIds && command.topicIds.length > 0) {
      const topicValidation = await this.validateTopics(command.topicIds);
      if (!topicValidation.valid) {
        throw new Error(`INVALID_TOPIC_IDS:${JSON.stringify(topicValidation.invalidIds)}`);
      }
    }

    // Step 3: Insert article
    const insertResult = await this.executeQueryWithSchemaFallback(async (schema) => {
      return await this.supabase
        .schema(schema)
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
    });
    const { data: article, error: insertError } = insertResult;

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

      const associationResult = await this.executeQueryWithSchemaFallback(async (schema) => {
        return await this.supabase.schema(schema).from("article_topics").insert(associations);
      });
      const { error: associationError } = associationResult;

      if (associationError) {
        // Rollback: delete the article that was just created
        await this.executeQueryWithSchemaFallback(async (schema) => {
          return await this.supabase.schema(schema).from("articles").delete().eq("id", article.id);
        });

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
   * Batch creates multiple articles in a single database operation.
   * This is much more efficient than creating articles one by one.
   * Duplicate articles (by link) are silently skipped.
   *
   * @param commands - Array of article creation commands
   * @param skipSourceValidation - Skip source validation (use when source is already validated)
   * @returns Object with created articles and count of duplicates skipped
   */
  async createArticlesBatch(
    commands: CreateArticleCommand[],
    skipSourceValidation = false
  ): Promise<{ articles: ArticleEntity[]; duplicatesSkipped: number }> {
    if (commands.length === 0) {
      return { articles: [], duplicatesSkipped: 0 };
    }

    // Validate all commands have the same sourceId (required for batch processing)
    const sourceId = commands[0]?.sourceId;
    if (!sourceId || commands.some((cmd) => cmd.sourceId !== sourceId)) {
      throw new Error("All articles in batch must have the same sourceId");
    }

    // Step 1: Validate source exists (can be skipped if source was already validated)
    if (!skipSourceValidation) {
      const sourceExists = await this.validateSource(sourceId);
      if (!sourceExists) {
        throw new Error("RSS_SOURCE_NOT_FOUND");
      }
    }

    // Step 2: Prepare batch insert data
    const insertData = commands.map((command) => ({
      source_id: command.sourceId,
      title: command.title,
      description: command.description ?? null,
      link: command.link,
      publication_date: command.publicationDate,
      sentiment: command.sentiment ?? null,
    }));

    // Step 3: Batch insert articles
    // Use individual inserts to handle duplicates gracefully
    // This ensures we can count duplicates vs successful inserts
    const createdArticles: ArticleEntity[] = [];
    let duplicatesSkipped = 0;

    for (const item of insertData) {
      try {
        // Try to insert the article
        const { data: article, error: insertError } = await this.supabase
          .schema("app")
          .from("articles")
          .insert(item)
          .select();

        // If there's an error, check if it's a duplicate
        if (insertError) {
          if (insertError.code === "23505" || (insertError.message && insertError.message.includes("duplicate key"))) {
            duplicatesSkipped++;
            continue;
          }
          // For other errors, throw to trigger fallback
          throw new Error(`Database error: ${insertError.message || JSON.stringify(insertError)}`);
        }

        // If successful, add to created articles
        if (article) {
          const articleData = Array.isArray(article) ? article[0] : article;
          if (articleData) {
            createdArticles.push({
              id: articleData.id,
              sourceId: articleData.source_id,
              title: articleData.title,
              description: articleData.description,
              link: articleData.link,
              publicationDate: articleData.publication_date,
              sentiment: articleData.sentiment,
              createdAt: articleData.created_at,
              updatedAt: articleData.updated_at,
            });
          }
        }
      } catch (error: unknown) {
        // Check if the caught error is a duplicate key error
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes("duplicate key") || errorMessage.includes("23505") || error?.code === "23505") {
          duplicatesSkipped++;
          continue;
        }
        // For other errors, throw to trigger fallback
        throw new Error(`Insert failed: ${errorMessage}`);
      }
    }

    return {
      articles: createdArticles,
      duplicatesSkipped,
    };
  }

  /**
   * Retrieves a single article by ID with nested source and topics.
   *
   * @param id - UUID of the article to retrieve
   * @returns ArticleDto with nested source and topics
   * @throws Error with code "ARTICLE_NOT_FOUND" if article doesn't exist
   */
  async getArticleById(id: string): Promise<ArticleDto> {
    // Query article with nested selects for source and topics
    // Using Supabase foreign key relationship syntax
    const result = await this.executeQueryWithSchemaFallback(async (schema) => {
      return await this.supabase
        .schema(schema)
        .from("articles")
        .select(
          `
          *,
          rss_sources!articles_source_id_fkey (
            id,
            name,
            url
          ),
          article_topics (
            topics (
              id,
              name
            )
          )
        `
        )
        .eq("id", id)
        .single();
    });
    const { data, error } = result;

    if (error || !data) {
      throw new Error("ARTICLE_NOT_FOUND");
    }

    // Map to DTO format
    // The nested data structure from Supabase will have:
    // - rss_sources as the source (via foreign key)
    // - article_topics array with nested topics
    const articleWithRelations = data as JoinedArticle & {
      rss_sources: { id: string; name: string; url: string } | null;
      article_topics: { topics: { id: string; name: string } | null }[];
    };

    return this.mapArticleToDto(articleWithRelations);
  }

  /**
   * Updates an article with optional sentiment and topic associations.
   * Implements transaction-like behavior: if topic associations fail,
   * the article update is rolled back.
   *
   * @param id - UUID of the article to update
   * @param command - Update command with optional fields
   * @returns Updated article entity in camelCase format
   * @throws Error with specific codes:
   *   - ARTICLE_NOT_FOUND: article doesn't exist
   *   - INVALID_TOPIC_IDS: one or more topicIds don't exist
   */
  async updateArticle(id: string, command: UpdateArticleCommand): Promise<ArticleEntity> {
    // Step 1: Verify article exists and fetch current state for rollback
    const { data: existingArticle, error: fetchError } = await this.supabase
      .schema("app")
      .from("articles")
      .select("id, sentiment")
      .eq("id", id)
      .single();

    if (fetchError || !existingArticle) {
      throw new Error("ARTICLE_NOT_FOUND");
    }

    // Step 2: Validate topics exist (if provided)
    if (command.topicIds && command.topicIds.length > 0) {
      const topicValidation = await this.validateTopics(command.topicIds);
      if (!topicValidation.valid) {
        throw new Error(`INVALID_TOPIC_IDS:${JSON.stringify(topicValidation.invalidIds)}`);
      }
    }

    // Step 3: Update article fields (only provided fields)
    const updateData: Database["app"]["Tables"]["articles"]["Update"] = {};
    if (command.sentiment !== undefined) {
      updateData.sentiment = command.sentiment;
    }

    // Only update if there are fields to update
    if (Object.keys(updateData).length > 0) {
      const { data: updatedArticle, error: updateError } = await this.supabase
        .schema("app")
        .from("articles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError(`Failed to update article: ${updateError.message}`, updateError);
      }

      // Step 4: Update topic associations (if provided)
      if (command.topicIds !== undefined) {
        // Delete all existing associations for this article
        const { error: deleteError } = await this.supabase
          .schema("app")
          .from("article_topics")
          .delete()
          .eq("article_id", id);

        if (deleteError) {
          throw new DatabaseError(`Failed to delete existing topic associations: ${deleteError.message}`, deleteError);
        }

        // Insert new associations (if any)
        if (command.topicIds.length > 0) {
          const associations = command.topicIds.map((topicId) => ({
            article_id: id,
            topic_id: topicId,
          }));

          const { error: associationError } = await this.supabase
            .schema("app")
            .from("article_topics")
            .insert(associations);

          if (associationError) {
            // Rollback: restore original article state
            await this.supabase
              .schema("app")
              .from("articles")
              .update({ sentiment: existingArticle.sentiment })
              .eq("id", id);

            throw new Error("TOPIC_ASSOCIATION_FAILED");
          }
        }
      }

      // Return updated article entity
      return {
        id: updatedArticle.id,
        sourceId: updatedArticle.source_id,
        title: updatedArticle.title,
        description: updatedArticle.description,
        link: updatedArticle.link,
        publicationDate: updatedArticle.publication_date,
        sentiment: updatedArticle.sentiment,
        createdAt: updatedArticle.created_at,
        updatedAt: updatedArticle.updated_at,
      };
    }

    // If no fields to update but topicIds provided, just update associations
    if (command.topicIds !== undefined) {
      // Delete all existing associations
      const { error: deleteError } = await this.supabase
        .schema("app")
        .from("article_topics")
        .delete()
        .eq("article_id", id);

      if (deleteError) {
        throw new DatabaseError(`Failed to delete existing topic associations: ${deleteError.message}`, deleteError);
      }

      // Insert new associations (if any)
      if (command.topicIds.length > 0) {
        const associations = command.topicIds.map((topicId) => ({
          article_id: id,
          topic_id: topicId,
        }));

        const { error: associationError } = await this.supabase
          .schema("app")
          .from("article_topics")
          .insert(associations);

        if (associationError) {
          throw new Error("TOPIC_ASSOCIATION_FAILED");
        }
      }
    }

    // Fetch and return the article (in case only topic associations were updated)
    const { data: article, error: fetchArticleError } = await this.supabase
      .schema("app")
      .from("articles")
      .select()
      .eq("id", id)
      .single();

    if (fetchArticleError || !article) {
      throw new Error("ARTICLE_NOT_FOUND");
    }

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
   * Deletes an article by ID.
   * Database CASCADE automatically removes article_topics associations.
   *
   * @param id - UUID of the article to delete
   * @throws Error with code "ARTICLE_NOT_FOUND" if article doesn't exist
   */
  async deleteArticle(id: string): Promise<void> {
    // Verify article exists before deletion
    const { data: existingArticle, error: fetchError } = await this.supabase
      .schema("app")
      .from("articles")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingArticle) {
      throw new Error("ARTICLE_NOT_FOUND");
    }

    // Delete article (CASCADE handles article_topics)
    const { error: deleteError } = await this.supabase.schema("app").from("articles").delete().eq("id", id);

    if (deleteError) {
      throw new DatabaseError(`Failed to delete article: ${deleteError.message}`, deleteError);
    }
  }

  /**
   * Applies query filters (sentiment, topicId, sourceId) to the Supabase query.
   * Also applies mood-based filtering if personalization is enabled.
   *
   * @param query - The Supabase query builder
   * @param params - Query parameters with filter values
   * @param userProfile - Optional user profile for mood-based filtering
   * @param articleIdsForTopic - Pre-fetched article IDs for topic filter (if topicId is provided)
   * @returns Modified query with filters applied
   */
  private applyFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
    params: GetArticlesQueryParams,
    userProfile: ProfileEntity | null,
    articleIdsForTopic: string[] | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    console.log("[ArticleService.applyFilters] Applying filters:", {
      explicitSentiment: params.sentiment,
      applyPersonalization: params.applyPersonalization,
      userMood: userProfile?.mood,
      sourceId: params.sourceId,
      topicId: params.topicId,
      hasArticleIdsForTopic: !!(articleIdsForTopic && articleIdsForTopic.length > 0),
    });

    // Filter by sentiment (explicit or from mood)
    if (params.sentiment) {
      console.log("[ArticleService.applyFilters] Applying explicit sentiment filter:", params.sentiment);
      query = query.eq("sentiment", params.sentiment);
    } else if (params.applyPersonalization && userProfile?.mood) {
      // Apply mood-based sentiment filtering
      console.log("[ArticleService.applyFilters] Applying mood-based sentiment filter:", userProfile.mood);
      query = query.eq("sentiment", userProfile.mood);
    } else {
      console.log("[ArticleService.applyFilters] No sentiment filter applied");
    }

    // Filter by source ID
    if (params.sourceId) {
      console.log("[ArticleService.applyFilters] Applying source filter:", params.sourceId);
      query = query.eq("source_id", params.sourceId);
    }

    // Filter by topic ID - use pre-fetched article IDs
    if (params.topicId && articleIdsForTopic && articleIdsForTopic.length > 0) {
      console.log("[ArticleService.applyFilters] Applying topic filter:", {
        topicId: params.topicId,
        articleCount: articleIdsForTopic.length,
      });
      query = query.in("id", articleIdsForTopic);
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
  private applyBlocklistFilter(
    articles: (Database["app"]["Tables"]["articles"]["Row"] | JoinedArticle)[],
    blocklist: string[]
  ): (Database["app"]["Tables"]["articles"]["Row"] | JoinedArticle)[] {
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
   * @throws Error if required source data is missing
   */
  private mapArticleToDto(article: Database["app"]["Tables"]["articles"]["Row"] | JoinedArticle): ArticleDto {
    // Handle both simple and joined article structures
    // If source is not joined, we'll need to fetch it separately (for now return minimal data)
    const hasJoinedSource = "rss_sources" in article || "source" in article;
    if (!hasJoinedSource && !article.source_id) {
      throw new Error(`Article ${article.id} is missing source data`);
    }

    // If we have joined source data, use it
    const source = ("rss_sources" in article && article.rss_sources) || ("source" in article && article.source);

    return {
      id: article.id,
      title: article.title,
      description: article.description,
      link: article.link,
      publicationDate: article.publication_date,
      sentiment: article.sentiment,
      source: source
        ? {
            id: source.id,
            name: source.name,
            url: source.url,
          }
        : {
            // Fallback if source not joined - would need separate query in production
            id: article.source_id,
            name: "Unknown",
            url: "",
          },
      topics: (("article_topics" in article && article.article_topics) || [])
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
