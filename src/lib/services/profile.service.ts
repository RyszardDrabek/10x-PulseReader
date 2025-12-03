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
    queryBuilder: (schema: string) => Promise<{ data: T; error: any }>
  ): Promise<{ data: T; error: any }> {
    // Try with "app" schema first
    let result = await queryBuilder("app");

    // If schema "app" fails with error code 1003 (schema not found), try "public"
    if (result.error && (result.error.code === "1003" || result.error.message?.includes("schema"))) {
      console.log("[ProfileService] Schema 'app' failed, trying 'public' schema");
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
      return await this.supabase
        .schema(schema)
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
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
        console.warn("[ProfileService.createProfile] PGRST301 error during insert (likely RLS disabled in development), attempting fallback query");
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
          throw new DatabaseError(`Failed to create profile (fallback): ${fallbackError.message || fallbackError.code || "Unknown error"}`, fallbackError);
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
    console.log("[ProfileService.updateProfile] Starting update for userId:", userId, "command:", command);

    // Check if profile exists
    const existingProfile = await this.profileExists(userId);
    console.log("[ProfileService.updateProfile] Profile exists check result:", existingProfile);

    if (!existingProfile) {
      console.log("[ProfileService.updateProfile] Profile not found, throwing error");
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
    console.log("[ProfileService.profileExists] Checking profile for userId:", userId);

    // Try a simpler query first to test basic connectivity
    try {
      console.log("[ProfileService.profileExists] Testing basic table access");
      const basicResult = await this.supabase
        .schema("app")
        .from("profiles")
        .select("count")
        .limit(1);

      console.log("[ProfileService.profileExists] Basic query result:", {
        success: !basicResult.error,
        error: basicResult.error
      });

      // Also test if personalization_enabled column exists
      if (!basicResult.error) {
        console.log("[ProfileService.profileExists] Testing personalization_enabled column");
        const columnTest = await this.supabase
          .schema("app")
          .from("profiles")
          .select("personalization_enabled")
          .limit(1);

        console.log("[ProfileService.profileExists] Column test result:", {
          success: !columnTest.error,
          error: columnTest.error,
          data: columnTest.data
        });
      }
    } catch (basicError) {
      console.error("[ProfileService.profileExists] Basic query failed:", basicError);
    }

    const result = await this.supabase
      .schema("app")
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    const { data, error } = result;

    console.log("[ProfileService.profileExists] Query result:", {
      data,
      error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null,
      fullError: error
    });

    // PGRST116 means no rows found
    if (error && error.code === "PGRST116") {
      console.log("[ProfileService.profileExists] Profile not found (PGRST116)");
      return false;
    }

    // PGRST301 means "No suitable key or wrong key type" - can happen in development with RLS disabled
    // In development, we can treat this as "profile not found"
    if (error && error.code === "PGRST301") {
      console.warn("[ProfileService.profileExists] PGRST301 error (likely RLS disabled in development), assuming profile does not exist");
      return false;
    }

    // Error code 1003 - "No suitable key or wrong key type"
    if (error && error.code === "1003") {
      console.warn("[ProfileService.profileExists] Error 1003 - trying alternative query approach");

      // Try without .single() to see if it's a constraint issue
      try {
        const altResult = await this.supabase
          .schema("app")
          .from("profiles")
          .select("id")
          .eq("user_id", userId);

        console.log("[ProfileService.profileExists] Alternative query result:", {
          data: altResult.data,
          error: altResult.error,
          count: altResult.data?.length
        });

        return altResult.data && altResult.data.length > 0;
      } catch (altError) {
        console.error("[ProfileService.profileExists] Alternative query also failed:", altError);
        return false; // Assume profile doesn't exist
      }
    }

    if (error) {
      console.error("[ProfileService.profileExists] Database error:", error);
      // For other errors, assume profile doesn't exist rather than failing
      console.warn("[ProfileService.profileExists] Treating error as 'profile not found'");
      return false;
    }

    console.log("[ProfileService.profileExists] Profile exists:", !!data);
    return data !== null;
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
