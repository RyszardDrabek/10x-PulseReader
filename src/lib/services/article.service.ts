import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type { ArticleEntity, CreateArticleCommand } from "../../types.ts";

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
}
