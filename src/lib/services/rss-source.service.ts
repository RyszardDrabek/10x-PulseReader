import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type {
  RssSourceDto,
  RssSourceListResponse,
  CreateRssSourceCommand,
  UpdateRssSourceCommand,
  GetRssSourcesQueryParams,
} from "../../types.ts";

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
 * Service for managing RSS source operations.
 * Handles RSS source CRUD operations with validation and error handling.
 */
export class RssSourceService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Fetches a paginated list of RSS sources.
   *
   * @param params - Query parameters for pagination
   * @returns RssSourceListResponse with sources and pagination metadata
   * @throws DatabaseError if database query fails
   */
  async getRssSources(params: GetRssSourcesQueryParams): Promise<RssSourceListResponse> {
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    const query = this.supabase
      .schema("app")
      .from("rss_sources")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new DatabaseError(`Failed to fetch RSS sources: ${error.message}`, error);
    }

    const sources = (data || []).map((source) => this.mapToDto(source));

    return {
      data: sources,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    };
  }

  /**
   * Fetches a single RSS source by ID.
   *
   * @param id - UUID of the RSS source
   * @returns RssSourceDto if found, null otherwise
   * @throws DatabaseError if database query fails
   */
  async getRssSourceById(id: string): Promise<RssSourceDto | null> {
    const { data, error } = await this.supabase.schema("app").from("rss_sources").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw new DatabaseError(`Failed to fetch RSS source: ${error.message}`, error);
    }

    return data ? this.mapToDto(data) : null;
  }

  /**
   * Creates a new RSS source.
   *
   * @param command - Create command with name and url
   * @returns Created RssSourceDto
   * @throws Error with message 'DUPLICATE_URL' if URL already exists
   * @throws DatabaseError if database insert fails
   */
  async createRssSource(command: CreateRssSourceCommand): Promise<RssSourceDto> {
    // Check if URL already exists
    const existing = await this.findByUrl(command.url);
    if (existing) {
      throw new Error("DUPLICATE_URL");
    }

    const { data, error } = await this.supabase
      .schema("app")
      .from("rss_sources")
      .insert({
        name: command.name,
        url: command.url,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        throw new Error("DUPLICATE_URL");
      }
      throw new DatabaseError(`Failed to create RSS source: ${error.message}`, error);
    }

    if (!data) {
      throw new Error("Failed to create RSS source: no data returned");
    }

    return this.mapToDto(data);
  }

  /**
   * Updates an existing RSS source.
   *
   * @param id - UUID of the RSS source to update
   * @param command - Update command with optional name and url
   * @returns Updated RssSourceDto
   * @throws Error with message 'NOT_FOUND' if source does not exist
   * @throws Error with message 'DUPLICATE_URL' if URL already exists
   * @throws DatabaseError if database update fails
   */
  async updateRssSource(id: string, command: UpdateRssSourceCommand): Promise<RssSourceDto> {
    // Verify source exists
    const existing = await this.getRssSourceById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    // Check URL uniqueness if URL is being updated
    if (command.url && command.url !== existing.url) {
      const urlExists = await this.findByUrl(command.url);
      if (urlExists) {
        throw new Error("DUPLICATE_URL");
      }
    }

    const updateData: Database["app"]["Tables"]["rss_sources"]["Update"] = {};
    if (command.name !== undefined) {
      updateData.name = command.name;
    }
    if (command.url !== undefined) {
      updateData.url = command.url;
    }

    const { data, error } = await this.supabase
      .schema("app")
      .from("rss_sources")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        throw new Error("DUPLICATE_URL");
      }
      throw new DatabaseError(`Failed to update RSS source: ${error.message}`, error);
    }

    if (!data) {
      throw new Error("NOT_FOUND");
    }

    return this.mapToDto(data);
  }

  /**
   * Deletes an RSS source and all associated articles (CASCADE).
   *
   * @param id - UUID of the RSS source to delete
   * @throws Error with message 'NOT_FOUND' if source does not exist
   * @throws DatabaseError if database delete fails
   */
  async deleteRssSource(id: string): Promise<void> {
    // Verify source exists
    const existing = await this.getRssSourceById(id);
    if (!existing) {
      throw new Error("NOT_FOUND");
    }

    const { error } = await this.supabase.schema("app").from("rss_sources").delete().eq("id", id);

    if (error) {
      throw new DatabaseError(`Failed to delete RSS source: ${error.message}`, error);
    }
  }

  /**
   * Fetches all active RSS sources for cron job processing.
   *
   * @returns Array of active RSS source DTOs
   * @throws DatabaseError if database query fails
   */
  async getActiveRssSources(): Promise<RssSourceDto[]> {
    const { data, error } = await this.supabase
      .schema("app")
      .from("rss_sources")
      .select("*")
      .eq("is_active", true)
      // Order by last_fetched_at (nulls first) to prioritize sources that haven't been fetched recently
      // This ensures round-robin processing so all sources get processed eventually
      .order("last_fetched_at", { ascending: true, nullsFirst: true });

    if (error) {
      throw new DatabaseError(`Failed to fetch active RSS sources: ${error.message}`, error);
    }

    return (data || []).map((source) => this.mapToDto(source));
  }

  /**
   * Updates the fetch status of an RSS source after a fetch attempt.
   *
   * @param id - UUID of the RSS source
   * @param success - Whether the fetch was successful
   * @param errorMessage - Error message if fetch failed (optional)
   * @throws DatabaseError if database update fails
   */
  async updateFetchStatus(id: string, success: boolean, errorMessage?: string): Promise<void> {
    const updateData: Database["app"]["Tables"]["rss_sources"]["Update"] = {};

    if (success) {
      updateData.last_fetched_at = new Date().toISOString();
      updateData.last_fetch_error = null;
    } else {
      updateData.last_fetch_error = errorMessage || "Unknown error";
    }

    const { error } = await this.supabase.schema("app").from("rss_sources").update(updateData).eq("id", id);

    if (error) {
      throw new DatabaseError(`Failed to update fetch status: ${error.message}`, error);
    }
  }

  /**
   * Finds an RSS source by URL.
   *
   * @param url - URL to search for
   * @returns RssSourceDto if found, null otherwise
   * @throws DatabaseError if database query fails
   */
  private async findByUrl(url: string): Promise<RssSourceDto | null> {
    const { data, error } = await this.supabase.schema("app").from("rss_sources").select("*").eq("url", url).single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw new DatabaseError(`Failed to find RSS source by URL: ${error.message}`, error);
    }

    return data ? this.mapToDto(data) : null;
  }

  /**
   * Maps database row (snake_case) to DTO (camelCase).
   *
   * @param row - Database row from app.rss_sources table
   * @returns RssSourceDto with camelCase field names
   */
  private mapToDto(row: Database["app"]["Tables"]["rss_sources"]["Row"]): RssSourceDto {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      isActive: row.is_active ?? true,
      lastFetchedAt: row.last_fetched_at ?? null,
      lastFetchError: row.last_fetch_error ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
