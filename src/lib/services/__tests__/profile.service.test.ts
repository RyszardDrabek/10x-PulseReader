/**
 * Unit tests for ProfileService
 *
 * Tests are implemented using Vitest following the project's testing guidelines.
 * Uses vi.mock() and vi.fn() for mocking Supabase client.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types.ts";
import { ProfileService } from "../profile.service.ts";
import type { CreateProfileCommand, UpdateProfileCommand } from "../../../types.ts";

/**
 * Creates a mock Supabase client with configurable responses
 */
function createMockSupabaseClient() {
  // Create mock query builder chain
  const mockSingle = vi.fn();
  const mockEq = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockFrom = vi.fn();
  const mockSchema = vi.fn();

  // Create chain builder function that returns objects with all possible next methods
  const createChainObject = () => ({
    eq: mockEq,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    single: mockSingle,
    from: mockFrom,
  });

  // Setup chain: each method returns an object with next methods
  // For eq(), it can be chained OR return a promise when awaited (for deleteProfile)
  mockEq.mockImplementation(() => {
    const chainObj = createChainObject();
    // Make it awaitable by adding then() method
    const thenable = Promise.resolve({ data: null, error: null });
    return Object.assign(chainObj, {
      then: thenable.then.bind(thenable),
      catch: thenable.catch.bind(thenable),
    });
  });
  mockSelect.mockImplementation(() => createChainObject());
  mockInsert.mockImplementation(() => createChainObject());
  mockUpdate.mockImplementation(() => createChainObject());
  mockDelete.mockImplementation(() => createChainObject());
  mockFrom.mockImplementation(() => createChainObject());
  mockSchema.mockImplementation(() => createChainObject());

  // Default return values
  mockSingle.mockResolvedValue({ data: null, error: null });

  const client = {
    schema: mockSchema,
    from: mockFrom,
  } as unknown as SupabaseClient<Database>;

  return {
    client,
    mocks: {
      schema: mockSchema,
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
    },
  };
}

describe("ProfileService.getProfile", () => {
  test("should return profile when exists", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const mockProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: "positive" as const,
      blocklist: ["covid", "election"],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockProfileRow,
      error: null,
    });

    const result = await service.getProfile("user-id");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("profile-id");
    expect(result?.userId).toBe("user-id");
    expect(result?.mood).toBe("positive");
    expect(result?.blocklist).toEqual(["covid", "election"]);
    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.select).toHaveBeenCalledWith("*");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-id");
    expect(mocks.single).toHaveBeenCalled();
  });

  test("should return null when profile not found", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });

    const result = await service.getProfile("user-id");

    expect(result).toBeNull();
  });

  test("should handle database errors", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.getProfile("user-id")).rejects.toThrow();
  });

  test("should map database response to camelCase", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const mockProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: "neutral" as const,
      blocklist: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockProfileRow,
      error: null,
    });

    const result = await service.getProfile("user-id");

    expect(result).toHaveProperty("userId");
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");
    expect(result).not.toHaveProperty("user_id");
    expect(result).not.toHaveProperty("created_at");
    expect(result).not.toHaveProperty("updated_at");
  });

  test("should handle null mood", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const mockProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: null,
      blocklist: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockProfileRow,
      error: null,
    });

    const result = await service.getProfile("user-id");

    expect(result?.mood).toBeNull();
  });

  test("should handle empty blocklist", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const mockProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: null,
      blocklist: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockProfileRow,
      error: null,
    });

    const result = await service.getProfile("user-id");

    expect(result?.blocklist).toEqual([]);
  });
});

describe("ProfileService.createProfile", () => {
  const createValidCommand = (overrides?: Partial<CreateProfileCommand>): CreateProfileCommand => ({
    mood: "neutral",
    blocklist: [],
    ...overrides,
  });

  test("should create profile successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand({ mood: "positive", blocklist: ["covid"] });
    const mockProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: command.mood,
      blocklist: command.blocklist,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    // First call: profileExists check (returns false)
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });
    // Second call: insert profile
    mocks.single.mockResolvedValueOnce({
      data: mockProfileRow,
      error: null,
    });

    const result = await service.createProfile("user-id", command);

    expect(result.id).toBe("profile-id");
    expect(result.userId).toBe("user-id");
    expect(result.mood).toBe("positive");
    expect(result.blocklist).toEqual(["covid"]);
  });

  test("should throw PROFILE_EXISTS if profile already exists", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand();

    // profileExists check returns true
    mocks.single.mockResolvedValueOnce({
      data: { id: "existing-profile-id" },
      error: null,
    });

    await expect(service.createProfile("user-id", command)).rejects.toThrow("PROFILE_EXISTS");
  });

  test("should handle unique constraint violation", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand();

    // profileExists check returns false
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });
    // insert fails with unique constraint violation
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        details: "",
        hint: "",
        name: "PostgrestError",
      },
    });

    await expect(service.createProfile("user-id", command)).rejects.toThrow("PROFILE_EXISTS");
  });

  test("should handle null mood", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand({ mood: null });
    const mockProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: null,
      blocklist: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });
    mocks.single.mockResolvedValueOnce({
      data: mockProfileRow,
      error: null,
    });

    const result = await service.createProfile("user-id", command);

    expect(result.mood).toBeNull();
  });

  test("should handle undefined blocklist (defaults to empty array)", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand({ blocklist: undefined });
    const mockProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: "neutral",
      blocklist: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });
    mocks.single.mockResolvedValueOnce({
      data: mockProfileRow,
      error: null,
    });

    const result = await service.createProfile("user-id", command);

    expect(result.blocklist).toEqual([]);
  });
});

describe("ProfileService.updateProfile", () => {
  const createValidCommand = (overrides?: Partial<UpdateProfileCommand>): UpdateProfileCommand => ({
    mood: "neutral",
    ...overrides,
  });

  test("should update profile successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand({ mood: "positive" });
    const updatedProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: "positive",
      blocklist: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    };

    // profileExists check returns true
    mocks.single.mockResolvedValueOnce({
      data: { id: "profile-id" },
      error: null,
    });
    // update returns updated profile
    mocks.single.mockResolvedValueOnce({
      data: updatedProfileRow,
      error: null,
    });

    const result = await service.updateProfile("user-id", command);

    expect(result.mood).toBe("positive");
    expect(mocks.update).toHaveBeenCalled();
  });

  test("should handle partial update (only mood)", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand({ mood: "negative" });
    const updatedProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: "negative",
      blocklist: ["existing-item"],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    };

    mocks.single.mockResolvedValueOnce({
      data: { id: "profile-id" },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({
      data: updatedProfileRow,
      error: null,
    });

    const result = await service.updateProfile("user-id", command);

    expect(result.mood).toBe("negative");
    // blocklist should remain unchanged
    expect(result.blocklist).toEqual(["existing-item"]);
  });

  test("should handle partial update (only blocklist)", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand({ blocklist: ["new-item"] });
    const updatedProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: "neutral",
      blocklist: ["new-item"],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    };

    mocks.single.mockResolvedValueOnce({
      data: { id: "profile-id" },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({
      data: updatedProfileRow,
      error: null,
    });

    const result = await service.updateProfile("user-id", command);

    expect(result.blocklist).toEqual(["new-item"]);
  });

  test("should throw PROFILE_NOT_FOUND if profile doesn't exist", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand();

    // profileExists check returns false
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.updateProfile("user-id", command)).rejects.toThrow("PROFILE_NOT_FOUND");
  });

  test("should return existing profile if no fields to update", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const existingProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: "neutral",
      blocklist: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    // profileExists check returns true
    mocks.single.mockResolvedValueOnce({
      data: { id: "profile-id" },
      error: null,
    });
    // getProfile call returns existing profile
    mocks.single.mockResolvedValueOnce({
      data: existingProfileRow,
      error: null,
    });

    const result = await service.updateProfile("user-id", {});

    expect(result.id).toBe("profile-id");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("should handle setting mood to null", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    const command = createValidCommand({ mood: null });
    const updatedProfileRow = {
      id: "profile-id",
      user_id: "user-id",
      mood: null,
      blocklist: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-02T00:00:00Z",
    };

    mocks.single.mockResolvedValueOnce({
      data: { id: "profile-id" },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({
      data: updatedProfileRow,
      error: null,
    });

    const result = await service.updateProfile("user-id", command);

    expect(result.mood).toBeNull();
  });
});

describe("ProfileService.deleteProfile", () => {
  test("should delete profile successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    // First call: profileExists check (select().eq().single())
    mocks.single.mockResolvedValueOnce({
      data: { id: "profile-id" },
      error: null,
    });
    // Second call: delete().eq() - eq() needs to return a promise
    // Override eq() to return a promise for the delete call
    let eqCallCount = 0;
    mocks.eq.mockImplementation(() => {
      eqCallCount++;
      // First call is for profileExists (select().eq().single()) - return chain object with single()
      if (eqCallCount === 1) {
        return {
          eq: mocks.eq,
          select: mocks.select,
          insert: mocks.insert,
          update: mocks.update,
          delete: mocks.delete,
          single: mocks.single,
          from: mocks.from,
        };
      }
      // Second call is for delete().eq() - return promise
      return Promise.resolve({
        data: null,
        error: null,
      }) as any;
    });

    await service.deleteProfile("user-id");

    expect(mocks.delete).toHaveBeenCalled();
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-id");
  });

  test("should throw PROFILE_NOT_FOUND if profile doesn't exist", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    // profileExists check returns false
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.deleteProfile("user-id")).rejects.toThrow("PROFILE_NOT_FOUND");
  });

  test("should handle database errors", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ProfileService(client);

    mocks.single.mockResolvedValueOnce({
      data: { id: "profile-id" },
      error: null,
    });
    mocks.delete.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    } as any);

    await expect(service.deleteProfile("user-id")).rejects.toThrow();
  });
});
