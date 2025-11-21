import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type { TopicEntity, TopicListResponse, CreateTopicCommand, GetTopicsQueryParams } from "../../types.ts";

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

/**
 * Service for managing topic operations.
 * Handles topic CRUD operations with validation and error handling.
 */
export class TopicService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Fetches a paginated list of topics with optional search.
   *
   * @param params - Query parameters for pagination and search
   * @returns TopicListResponse with topics and pagination metadata
   * @throws DatabaseError if database query fails
   */
  async findAll(params: GetTopicsQueryParams): Promise<TopicListResponse> {
    const limit = params.limit ?? 100;
    const offset = params.offset ?? 0;

    let query = this.supabase
      .schema("app")
      .from("topics")
      .select("*", { count: "exact" })
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply search filter if provided (case-insensitive)
    if (params.search) {
      query = query.ilike("name", `%${params.search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to fetch topics: ${error.message}`, error);
    }

    const topics = (data || []).map((topic) => this.mapToEntity(topic));

    return {
      data: topics,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    };
  }

  /**
   * Fetches a single topic by ID.
   *
   * @param id - UUID of the topic
   * @returns TopicEntity if found, null otherwise
   * @throws DatabaseError if database query fails
   */
  async findById(id: string): Promise<TopicEntity | null> {
    const { data, error } = await this.supabase.schema("app").from("topics").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw new DatabaseError(`Failed to fetch topic: ${error.message}`, error);
    }

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * Creates a new topic or returns existing topic if name already exists (case-insensitive).
   * Implements upsert behavior for idempotent topic creation.
   *
   * @param command - Create command with topic name
   * @returns Object with topic entity and created flag
   * @throws DatabaseError if database query fails
   */
  async createOrFindTopic(command: CreateTopicCommand): Promise<{ topic: TopicEntity; created: boolean }> {
    // Check if topic with same name exists (case-insensitive)
    const existing = await this.findByNameCaseInsensitive(command.name);
    if (existing) {
      return { topic: existing, created: false };
    }

    // Create new topic
    const { data, error } = await this.supabase
      .schema("app")
      .from("topics")
      .insert({
        name: command.name,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (shouldn't happen due to pre-check, but handle gracefully)
      if (error.code === "23505") {
        // Try to fetch existing topic
        const existingTopic = await this.findByNameCaseInsensitive(command.name);
        if (existingTopic) {
          return { topic: existingTopic, created: false };
        }
      }
      throw new DatabaseError(`Failed to create topic: ${error.message}`, error);
    }

    if (!data) {
      throw new Error("Failed to create topic: no data returned");
    }

    return { topic: this.mapToEntity(data), created: true };
  }

  /**
   * Deletes a topic by ID.
   * Database CASCADE automatically removes all article-topic associations.
   *
   * @param id - UUID of the topic to delete
   * @throws Error with message 'NOT_FOUND' if topic does not exist
   * @throws DatabaseError if database delete fails
   */
  async deleteTopic(id: string): Promise<void> {
    // Verify topic exists
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const { error } = await this.supabase.schema("app").from("topics").delete().eq("id", id);

    if (error) {
      throw new DatabaseError(`Failed to delete topic: ${error.message}`, error);
    }
  }

  /**
   * Finds a topic by name (case-insensitive).
   *
   * @param name - Topic name to search for
   * @returns TopicEntity if found, null otherwise
   * @throws DatabaseError if database query fails
   */
  private async findByNameCaseInsensitive(name: string): Promise<TopicEntity | null> {
    const { data, error } = await this.supabase
      .schema("app")
      .from("topics")
      .select("*")
      .ilike("name", name)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to find topic by name: ${error.message}`, error);
    }

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * Maps database row (snake_case) to entity (camelCase).
   *
   * @param row - Database row from app.topics table
   * @returns TopicEntity with camelCase field names
   */
  private mapToEntity(row: Database["app"]["Tables"]["topics"]["Row"]): TopicEntity {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
