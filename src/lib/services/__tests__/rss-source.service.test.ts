/**
 * Unit tests for RssSourceService
 *
 * Tests are implemented using Vitest following the project's testing guidelines.
 * Uses vi.mock() and vi.fn() for mocking Supabase client.
 */

import { describe, test, expect, vi, type MockedFunction } from "vitest";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types.ts";
import { RssSourceService } from "../rss-source.service.ts";
import type { CreateRssSourceCommand, UpdateRssSourceCommand, GetRssSourcesQueryParams } from "../../../types.ts";

interface MockQueryBuilder {
  select: (columns?: string | { count: string }) => MockQueryBuilder;
  insert: (data: unknown) => MockQueryBuilder;
  update: (data: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  order: (column: string, options?: { ascending: boolean }) => MockQueryBuilder;
  range: (
    from: number,
    to: number
  ) => Promise<{ data: unknown[] | null; count: number | null; error: PostgrestError | null }>;
  single: () => Promise<{ data: unknown; error: PostgrestError | null }>;
}

/**
 * Creates a mock Supabase client with configurable responses
 */
function createMockSupabaseClient(): {
  client: SupabaseClient<Database>;
  mocks: {
    schema: MockedFunction<(schema: string) => MockQueryBuilder>;
    from: MockedFunction<(table: string) => MockQueryBuilder>;
    select: MockedFunction<(columns?: string | { count: string }) => MockQueryBuilder>;
    insert: MockedFunction<(data: unknown) => MockQueryBuilder>;
    update: MockedFunction<(data: unknown) => MockQueryBuilder>;
    delete: MockedFunction<() => MockQueryBuilder>;
    eq: MockedFunction<(column: string, value: unknown) => MockQueryBuilder>;
    single: MockedFunction<() => Promise<{ data: unknown; error: PostgrestError | null }>>;
    order: MockedFunction<(column: string, options?: { ascending: boolean }) => MockQueryBuilder>;
    range: MockedFunction<
      (
        from: number,
        to: number
      ) => Promise<{ data: unknown[] | null; count: number | null; error: PostgrestError | null }>
    >;
  };
} {
  // Create mock query builder chain
  const mockSingle = vi.fn();
  const mockRange = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockFrom = vi.fn();
  const mockSchema = vi.fn();

  // Create chain builder function that returns objects with all possible next methods
  const createChainObject = () => ({
    eq: mockEq,
    order: mockOrder,
    range: mockRange,
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    single: mockSingle,
    from: mockFrom,
  });

  // Setup chain: each method returns an object with next methods
  mockEq.mockImplementation(() => createChainObject());
  mockOrder.mockImplementation(() => createChainObject());
  mockSelect.mockImplementation(() => createChainObject());
  mockInsert.mockImplementation(() => createChainObject());
  mockUpdate.mockImplementation(() => createChainObject());
  mockDelete.mockImplementation(() => createChainObject());
  mockFrom.mockImplementation(() => createChainObject());
  mockSchema.mockImplementation(() => createChainObject());

  // Default return values
  mockRange.mockResolvedValue({ data: [], count: 0, error: null });
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
      order: mockOrder,
      range: mockRange,
    },
  };
}

describe("RssSourceService.getRssSources", () => {
  test("should fetch paginated list of RSS sources", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const mockSources = [
      {
        id: "source-1",
        name: "BBC News",
        url: "https://bbc.com/rss",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "source-2",
        name: "The Guardian",
        url: "https://guardian.com/rss",
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];

    mocks.range.mockResolvedValue({
      data: mockSources,
      count: 100,
      error: null,
    });

    const params: GetRssSourcesQueryParams = {
      limit: 50,
      offset: 0,
    };

    const result = await service.getRssSources(params);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(100);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.offset).toBe(0);
    expect(result.pagination.hasMore).toBe(true);
    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("rss_sources");
    expect(mocks.select).toHaveBeenCalledWith("*", { count: "exact" });
    expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mocks.range).toHaveBeenCalledWith(0, 49);
  });

  test("should handle empty results", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    mocks.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    const result = await service.getRssSources({ limit: 20, offset: 0 });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  test("should calculate hasMore correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    // First page: 25 total, limit 20
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `source-${i}`,
        name: `Source ${i}`,
        url: `https://example.com/${i}`,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      })),
      count: 25,
      error: null,
    });

    const result1 = await service.getRssSources({ limit: 20, offset: 0 });
    expect(result1.pagination.hasMore).toBe(true);

    // Last page: 25 total, offset 20
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `source-${i + 20}`,
        name: `Source ${i + 20}`,
        url: `https://example.com/${i + 20}`,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      })),
      count: 25,
      error: null,
    });

    const result2 = await service.getRssSources({ limit: 20, offset: 20 });
    expect(result2.pagination.hasMore).toBe(false);
  });

  test("should map database rows to camelCase DTOs", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const mockSource = {
      id: "source-1",
      name: "Test Source",
      url: "https://example.com/rss",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.range.mockResolvedValue({
      data: [mockSource],
      count: 1,
      error: null,
    });

    const result = await service.getRssSources({ limit: 50, offset: 0 });

    expect(result.data[0]).toHaveProperty("id");
    expect(result.data[0]).toHaveProperty("name");
    expect(result.data[0]).toHaveProperty("url");
    expect(result.data[0]).toHaveProperty("createdAt");
    expect(result.data[0]).toHaveProperty("updatedAt");
    expect(result.data[0]).not.toHaveProperty("created_at");
    expect(result.data[0]).not.toHaveProperty("updated_at");
  });

  test("should throw DatabaseError on database error", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    mocks.range.mockResolvedValue({
      data: null,
      count: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.getRssSources({ limit: 50, offset: 0 })).rejects.toThrow();
  });
});

describe("RssSourceService.getRssSourceById", () => {
  test("should fetch single RSS source by ID", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const mockSource = {
      id: "source-1",
      name: "BBC News",
      url: "https://bbc.com/rss",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockSource,
      error: null,
    });

    const result = await service.getRssSourceById("source-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("source-1");
    expect(result?.name).toBe("BBC News");
    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("rss_sources");
    expect(mocks.select).toHaveBeenCalledWith("*");
    expect(mocks.eq).toHaveBeenCalledWith("id", "source-1");
    expect(mocks.single).toHaveBeenCalled();
  });

  test("should return null for non-existent source", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });

    const result = await service.getRssSourceById("non-existent");

    expect(result).toBeNull();
  });

  test("should throw DatabaseError on database error", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.getRssSourceById("source-1")).rejects.toThrow();
  });
});

describe("RssSourceService.createRssSource", () => {
  const createValidCommand = (overrides?: Partial<CreateRssSourceCommand>): CreateRssSourceCommand => ({
    name: "Test Source",
    url: "https://example.com/rss",
    ...overrides,
  });

  test("should create RSS source successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const command = createValidCommand();
    const mockSource = {
      id: "source-1",
      name: command.name,
      url: command.url,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // First call: findByUrl (returns null - URL doesn't exist)
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });
    // Second call: insert (returns created source)
    mocks.single.mockResolvedValueOnce({
      data: mockSource,
      error: null,
    });

    const result = await service.createRssSource(command);

    expect(result.id).toBe("source-1");
    expect(result.name).toBe(command.name);
    expect(result.url).toBe(command.url);
    expect(mocks.insert).toHaveBeenCalledWith({
      name: command.name,
      url: command.url,
    });
  });

  test("should throw DUPLICATE_URL if URL already exists", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const command = createValidCommand();
    const existingSource = {
      id: "existing-source",
      name: "Existing Source",
      url: command.url,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // findByUrl returns existing source
    mocks.single.mockResolvedValue({
      data: existingSource,
      error: null,
    });

    await expect(service.createRssSource(command)).rejects.toThrow("DUPLICATE_URL");
  });

  test("should throw DUPLICATE_URL on unique constraint violation", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const command = createValidCommand();

    // findByUrl returns null (race condition scenario)
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

    await expect(service.createRssSource(command)).rejects.toThrow("DUPLICATE_URL");
  });

  test("should map database response to camelCase", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const command = createValidCommand();
    const mockSource = {
      id: "source-1",
      name: command.name,
      url: command.url,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.single
      .mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
      })
      .mockResolvedValueOnce({
        data: mockSource,
        error: null,
      });

    const result = await service.createRssSource(command);

    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");
    expect(result).not.toHaveProperty("created_at");
    expect(result).not.toHaveProperty("updated_at");
  });
});

describe("RssSourceService.updateRssSource", () => {
  const createValidCommand = (overrides?: Partial<UpdateRssSourceCommand>): UpdateRssSourceCommand => ({
    name: "Updated Source",
    ...overrides,
  });

  test("should update RSS source successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const id = "source-1";
    const command = createValidCommand();
    const existingSource = {
      id,
      name: "Original Name",
      url: "https://example.com/rss",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const updatedSource = {
      ...existingSource,
      name: command.name,
      updated_at: "2024-01-02T00:00:00Z",
    };

    // First call: getRssSourceById (verify exists)
    mocks.single.mockResolvedValueOnce({
      data: existingSource,
      error: null,
    });
    // Second call: update (returns updated source)
    mocks.single.mockResolvedValueOnce({
      data: updatedSource,
      error: null,
    });

    const result = await service.updateRssSource(id, command);

    expect(result.id).toBe(id);
    expect(result.name).toBe(command.name);
    expect(mocks.update).toHaveBeenCalledWith({ name: command.name });
  });

  test("should throw NOT_FOUND if source does not exist", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const id = "non-existent";
    const command = createValidCommand();

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.updateRssSource(id, command)).rejects.toThrow("NOT_FOUND");
  });

  test("should check URL uniqueness when updating URL", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const id = "source-1";
    const existingSource = {
      id,
      name: "Source 1",
      url: "https://example.com/rss1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const command = createValidCommand({ url: "https://example.com/rss2" });
    const conflictingSource = {
      id: "source-2",
      name: "Source 2",
      url: command.url,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // First call: getRssSourceById (verify exists)
    mocks.single.mockResolvedValueOnce({
      data: existingSource,
      error: null,
    });
    // Second call: findByUrl (returns conflicting source)
    mocks.single.mockResolvedValueOnce({
      data: conflictingSource,
      error: null,
    });

    await expect(service.updateRssSource(id, command)).rejects.toThrow("DUPLICATE_URL");
  });

  test("should allow updating URL to same URL", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const id = "source-1";
    const existingSource = {
      id,
      name: "Source 1",
      url: "https://example.com/rss",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    const command = createValidCommand({ url: existingSource.url });
    const updatedSource = {
      ...existingSource,
      name: command.name,
      updated_at: "2024-01-02T00:00:00Z",
    };

    // First call: getRssSourceById (verify exists)
    mocks.single.mockResolvedValueOnce({
      data: existingSource,
      error: null,
    });
    // Second call: update (returns updated source)
    // Note: findByUrl is not called because URL is the same
    mocks.single.mockResolvedValueOnce({
      data: updatedSource,
      error: null,
    });

    const result = await service.updateRssSource(id, command);

    expect(result.name).toBe(command.name);
    expect(result.url).toBe(existingSource.url);
  });
});

describe("RssSourceService.deleteRssSource", () => {
  test("should delete RSS source successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const id = "source-1";
    const existingSource = {
      id,
      name: "Source 1",
      url: "https://example.com/rss",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // First call: getRssSourceById (verify exists)
    mocks.single.mockResolvedValueOnce({
      data: existingSource,
      error: null,
    });
    // Second call: delete (no error) - eq() returns chain object that resolves
    mocks.eq.mockImplementationOnce(() => {
      const chainObj = {
        eq: mocks.eq,
        order: mocks.order,
        range: mocks.range,
        select: mocks.select,
        insert: mocks.insert,
        update: mocks.update,
        delete: mocks.delete,
        single: mocks.single,
        from: mocks.from,
      };
      const thenable = Promise.resolve({ data: null, error: null });
      return Object.assign(chainObj, {
        then: thenable.then.bind(thenable),
        catch: thenable.catch.bind(thenable),
      });
    });

    await service.deleteRssSource(id);

    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("rss_sources");
    expect(mocks.delete).toHaveBeenCalled();
    expect(mocks.eq).toHaveBeenCalledWith("id", id);
  });

  test("should throw NOT_FOUND if source does not exist", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new RssSourceService(client);

    const id = "non-existent";

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.deleteRssSource(id)).rejects.toThrow("NOT_FOUND");
  });
});
