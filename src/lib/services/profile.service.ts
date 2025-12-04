import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";
import type { ProfileEntity, CreateProfileCommand, UpdateProfileCommand } from "../../types.ts";

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
 * Service for managing profile operations.
 * Handles profile CRUD operations with RLS enforcement.
 */
export class ProfileService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Executes a query with fallback schema support.
   * Tries "app" schema first, falls back to "public" if schema doesn't exist.
   */
  private async executeQueryWithSchemaFallback<T>(
    queryBuilder: (schema: string) => Promise<{ data: T; error: PostgrestError | null }>
  ): Promise<{ data: T; error: PostgrestError | null }> {
    // Try with "app" schema first
    let result = await queryBuilder("app");

    // If schema "app" fails with error code 1003 (schema not found), try "public"
    if (result.error && (result.error.code === "1003" || result.error.message?.includes("schema"))) {
      result = await queryBuilder("public");
    }

    return result;
  }

  /**
   * Retrieves a user's profile by user ID.
   * RLS policies ensure users can only access their own profile.
   *
   * @param userId - UUID of the authenticated user
   * @returns Profile entity or null if not found
   * @throws DatabaseError if database query fails
   */
  async getProfile(userId: string): Promise<ProfileEntity | null> {
    const result = await this.executeQueryWithSchemaFallback(async (schema) => {
      return await this.supabase.schema(schema).from("profiles").select("*").eq("user_id", userId).single();
    });

    const { data, error } = result;

    if (error) {
      // Check if error is "not found" (PGRST116)
      if (error.code === "PGRST116") {
        return null;
      }
      throw new DatabaseError("Failed to fetch profile", error);
    }

    if (!data) {
      return null;
    }

    return this.mapDbToEntity(data);
  }

  /**
   * Creates a new profile for a user.
   * RLS policies ensure users can only create their own profile.
   *
   * @param userId - UUID of the authenticated user
   * @param command - Profile creation command with mood and blocklist
   * @returns Created profile entity
   * @throws Error with code "PROFILE_EXISTS" if profile already exists
   * @throws DatabaseError if database insert fails
   */
  async createProfile(userId: string, command: CreateProfileCommand): Promise<ProfileEntity> {
    // Check if profile already exists
    const existingProfile = await this.profileExists(userId);
    if (existingProfile) {
      throw new Error("PROFILE_EXISTS");
    }

    // Check if user exists in auth.users (skip this check in development for testing)
    const isDevelopment = import.meta.env.DEV;
    if (!isDevelopment) {
      const { data: userData, error: userError } = await this.supabase.auth.admin.getUserById(userId);
      if (userError || !userData?.user) {
        throw new Error(`User ${userId} does not exist in auth.users`);
      }
    }

    // Prepare insert data (convert camelCase to snake_case)
    const insertData: Database["app"]["Tables"]["profiles"]["Insert"] = {
      user_id: userId,
      mood: command.mood ?? null,
      blocklist: command.blocklist ?? [],
      personalization_enabled: command.personalizationEnabled ?? true,
    };

    const result = await this.executeQueryWithSchemaFallback(async (schema) => {
      return await this.supabase.schema(schema).from("profiles").insert(insertData).select().single();
    });
    const { data, error } = result;

    if (error) {
      // Check for unique constraint violation (user_id already exists)
      if (error.code === "23505") {
        throw new Error("PROFILE_EXISTS");
      }
      // Handle PGRST301 error (No suitable key or wrong key type) in development
      if (error.code === "PGRST301") {
        // eslint-disable-next-line no-console
        console.warn(
          "[ProfileService.createProfile] PGRST301 error during insert (likely RLS disabled in development), attempting fallback query"
        );
        // Try a simpler insert without .select().single()
        const fallbackResult = await this.executeQueryWithSchemaFallback(async (schema) => {
          return await this.supabase
            .schema(schema)
            .from("profiles")
            .insert(insertData)
            .select("id, user_id, mood, blocklist, personalization_enabled, created_at, updated_at");
        });

        const { data: fallbackData, error: fallbackError } = fallbackResult;

        if (fallbackError) {
          throw new DatabaseError(
            `Failed to create profile (fallback): ${fallbackError.message || fallbackError.code || "Unknown error"}`,
            fallbackError
          );
        }

        if (!fallbackData || fallbackData.length === 0) {
          throw new Error("Failed to create profile: no data returned from fallback query");
        }

        return this.mapDbToEntity(fallbackData[0]);
      }
      throw new DatabaseError(`Failed to create profile: ${error.message || error.code || "Unknown error"}`, error);
    }

    if (!data) {
      throw new Error("Failed to create profile: no data returned");
    }

    return this.mapDbToEntity(data);
  }

  /**
   * Updates an existing profile for a user.
   * RLS policies ensure users can only update their own profile.
   * Only provided fields are updated (partial update).
   *
   * @param userId - UUID of the authenticated user
   * @param command - Profile update command with optional mood and blocklist
   * @returns Updated profile entity
   * @throws Error with code "PROFILE_NOT_FOUND" if profile doesn't exist
   * @throws DatabaseError if database update fails
   */
  async updateProfile(userId: string, command: UpdateProfileCommand): Promise<ProfileEntity> {
    // Check if profile exists
    const existingProfile = await this.profileExists(userId);
    if (!existingProfile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    // Prepare update data (only include provided fields)
    const updateData: Database["app"]["Tables"]["profiles"]["Update"] = {};

    if (command.mood !== undefined) {
      updateData.mood = command.mood;
    }

    if (command.blocklist !== undefined) {
      updateData.blocklist = command.blocklist;
    }

    if (command.personalizationEnabled !== undefined) {
      updateData.personalization_enabled = command.personalizationEnabled;
    }

    // If no fields to update, return existing profile
    if (Object.keys(updateData).length === 0) {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error("PROFILE_NOT_FOUND");
      }
      return profile;
    }

    const result = await this.executeQueryWithSchemaFallback(async (schema) => {
      return await this.supabase
        .schema(schema)
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single();
    });
    const { data, error } = result;

    if (error) {
      throw new DatabaseError("Failed to update profile", error);
    }

    if (!data) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    return this.mapDbToEntity(data);
  }

  /**
   * Deletes a user's profile.
   * RLS policies ensure users can only delete their own profile.
   *
   * @param userId - UUID of the authenticated user
   * @throws Error with code "PROFILE_NOT_FOUND" if profile doesn't exist
   * @throws DatabaseError if database delete fails
   */
  async deleteProfile(userId: string): Promise<void> {
    // Check if profile exists
    const existingProfile = await this.profileExists(userId);
    if (!existingProfile) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    const result = await this.executeQueryWithSchemaFallback(async (schema) => {
      return await this.supabase.schema(schema).from("profiles").delete().eq("user_id", userId);
    });
    const { error } = result;

    if (error) {
      throw new DatabaseError("Failed to delete profile", error);
    }
  }

  /**
   * Checks if a profile exists for a given user ID.
   *
   * @param userId - UUID of the user
   * @returns true if profile exists, false otherwise
   */
  private async profileExists(userId: string): Promise<boolean> {
    try {
      const result = await this.executeQueryWithSchemaFallback(async (schema) => {
        return await this.supabase.schema(schema).from("profiles").select("id").eq("user_id", userId).single();
      });

      const { data, error } = result;

      // PGRST116 means no rows found
      if (error && error.code === "PGRST116") {
        return false;
      }

      // Handle database errors gracefully in development
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("[ProfileService] Profile check failed, assuming profile does not exist:", error.code);
        return false;
      }

      return data !== null;
    } catch {
      // eslint-disable-next-line no-console
      console.warn("[ProfileService] Profile check error, assuming profile does not exist");
      return false;
    }
  }

  /**
   * Maps database row (snake_case) to ProfileEntity (camelCase).
   *
   * @param row - Database row from app.profiles table
   * @returns ProfileEntity with camelCase field names
   */
  private mapDbToEntity(row: Database["app"]["Tables"]["profiles"]["Row"]): ProfileEntity {
    return {
      id: row.id,
      userId: row.user_id,
      mood: row.mood,
      blocklist: row.blocklist || [],
      personalizationEnabled: row.personalization_enabled ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
