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
   * Retrieves a user's profile by user ID.
   * RLS policies ensure users can only access their own profile.
   *
   * @param userId - UUID of the authenticated user
   * @returns Profile entity or null if not found
   * @throws DatabaseError if database query fails
   */
  async getProfile(userId: string): Promise<ProfileEntity | null> {
    const { data, error } = await this.supabase
      .schema("app")
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

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

    // Prepare insert data (convert camelCase to snake_case)
    const insertData: Database["app"]["Tables"]["profiles"]["Insert"] = {
      user_id: userId,
      mood: command.mood ?? null,
      blocklist: command.blocklist ?? [],
    };

    const { data, error } = await this.supabase.schema("app").from("profiles").insert(insertData).select().single();

    if (error) {
      // Check for unique constraint violation (user_id already exists)
      if (error.code === "23505") {
        throw new Error("PROFILE_EXISTS");
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

    // If no fields to update, return existing profile
    if (Object.keys(updateData).length === 0) {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error("PROFILE_NOT_FOUND");
      }
      return profile;
    }

    const { data, error } = await this.supabase
      .schema("app")
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single();

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

    const { error } = await this.supabase.schema("app").from("profiles").delete().eq("user_id", userId);

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
    const { data, error } = await this.supabase
      .schema("app")
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    // PGRST116 means no rows found
    if (error && error.code === "PGRST116") {
      return false;
    }

    if (error) {
      throw new DatabaseError("Failed to check profile existence", error);
    }

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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
