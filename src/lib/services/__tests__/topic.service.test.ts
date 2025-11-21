/**
 * Unit tests for TopicService
 *
 * Tests are implemented using Vitest following the project's testing guidelines.
 * Uses vi.mock() and vi.fn() for mocking Supabase client.
 */

import { describe, test, expect, vi, type MockedFunction } from "vitest";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types.ts";
import { TopicService } from "../topic.service.ts";
import type { CreateTopicCommand, GetTopicsQueryParams } from "../../../types.ts";

interface MockQueryBuilder {
  select: (columns?: string | { count: string }) => MockQueryBuilder;
  insert: (data: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  ilike: (column: string, value: string) => MockQueryBuilder;
  order: (column: string, options?: { ascending: boolean }) => MockQueryBuilder;
  range: (
    from: number,
    to: number
  ) => Promise<{ data: unknown[] | null; count: number | null; error: PostgrestError | null }>;
  single: () => Promise<{ data: unknown; error: PostgrestError | null }>;
  maybeSingle: () => Promise<{ data: unknown | null; error: PostgrestError | null }>;
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
    delete: MockedFunction<() => MockQueryBuilder>;
    eq: MockedFunction<(column: string, value: unknown) => MockQueryBuilder>;
    ilike: MockedFunction<(column: string, value: string) => MockQueryBuilder>;
    single: MockedFunction<() => Promise<{ data: unknown; error: PostgrestError | null }>>;
    maybeSingle: MockedFunction<() => Promise<{ data: unknown | null; error: PostgrestError | null }>>;
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
  const mockMaybeSingle = vi.fn();
  const mockRange = vi.fn();
  const mockEq = vi.fn();
  const mockIlike = vi.fn();
  const mockOrder = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();
  const mockFrom = vi.fn();
  const mockSchema = vi.fn();

  // Create chain builder function that returns objects with all possible next methods
  const createChainObject = () => ({
    eq: mockEq,
    ilike: mockIlike,
    order: mockOrder,
    range: mockRange,
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    from: mockFrom,
  });

  // Setup chain: each method returns an object with next methods
  mockEq.mockImplementation(() => createChainObject());
  mockIlike.mockImplementation(() => createChainObject());
  mockOrder.mockImplementation(() => createChainObject());
  mockSelect.mockImplementation(() => createChainObject());
  mockInsert.mockImplementation(() => createChainObject());
  mockDelete.mockImplementation(() => createChainObject());
  mockFrom.mockImplementation(() => createChainObject());
  mockSchema.mockImplementation(() => createChainObject());

  // Default return values
  mockRange.mockResolvedValue({ data: [], count: 0, error: null });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });

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
      delete: mockDelete,
      eq: mockEq,
      ilike: mockIlike,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      order: mockOrder,
      range: mockRange,
    },
  };
}

describe("TopicService.findAll", () => {
  test("should fetch paginated list of topics", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopics = [
      {
        id: "topic-1",
        name: "Technology",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "topic-2",
        name: "Politics",
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ];

    mocks.range.mockResolvedValue({
      data: mockTopics,
      count: 100,
      error: null,
    });

    const params: GetTopicsQueryParams = {
      limit: 50,
      offset: 0,
    };

    const result = await service.findAll(params);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(100);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.offset).toBe(0);
    expect(result.pagination.hasMore).toBe(true);
    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("topics");
    expect(mocks.select).toHaveBeenCalledWith("*", { count: "exact" });
    expect(mocks.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(mocks.range).toHaveBeenCalledWith(0, 49);
  });

  test("should apply search filter when provided", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopics = [
      {
        id: "topic-1",
        name: "Technology",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ];

    mocks.range.mockResolvedValue({
      data: mockTopics,
      count: 1,
      error: null,
    });

    const params: GetTopicsQueryParams = {
      limit: 100,
      offset: 0,
      search: "tech",
    };

    const result = await service.findAll(params);

    expect(result.data).toHaveLength(1);
    expect(mocks.ilike).toHaveBeenCalledWith("name", "%tech%");
  });

  test("should handle empty results", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    mocks.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    const result = await service.findAll({ limit: 20, offset: 0 });

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  test("should calculate hasMore correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    // First page: 25 total, limit 20
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: `topic-${i}`,
        name: `Topic ${i}`,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      })),
      count: 25,
      error: null,
    });

    const result1 = await service.findAll({ limit: 20, offset: 0 });
    expect(result1.pagination.hasMore).toBe(true);

    // Last page: 25 total, offset 20
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 5 }, (_, i) => ({
        id: `topic-${i + 20}`,
        name: `Topic ${i + 20}`,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      })),
      count: 25,
      error: null,
    });

    const result2 = await service.findAll({ limit: 20, offset: 20 });
    expect(result2.pagination.hasMore).toBe(false);
  });

  test("should map database rows to camelCase entities", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopic = {
      id: "topic-1",
      name: "Test Topic",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.range.mockResolvedValue({
      data: [mockTopic],
      count: 1,
      error: null,
    });

    const result = await service.findAll({ limit: 50, offset: 0 });

    expect(result.data[0]).toHaveProperty("id");
    expect(result.data[0]).toHaveProperty("name");
    expect(result.data[0]).toHaveProperty("createdAt");
    expect(result.data[0]).toHaveProperty("updatedAt");
    expect(result.data[0]).not.toHaveProperty("created_at");
    expect(result.data[0]).not.toHaveProperty("updated_at");
    expect(result.data[0].id).toBe("topic-1");
    expect(result.data[0].name).toBe("Test Topic");
    expect(result.data[0].createdAt).toBe("2024-01-01T00:00:00Z");
    expect(result.data[0].updatedAt).toBe("2024-01-01T00:00:00Z");
  });

  test("should throw DatabaseError on database error", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    mocks.range.mockResolvedValue({
      data: null,
      count: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.findAll({ limit: 50, offset: 0 })).rejects.toThrow("Failed to fetch topics");
  });

  test("should use default limit and offset when not provided", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    mocks.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    await service.findAll({});

    expect(mocks.range).toHaveBeenCalledWith(0, 99); // default limit 100, offset 0
  });
});

describe("TopicService.findById", () => {
  test("should fetch topic by ID", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopic = {
      id: "topic-1",
      name: "Technology",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockTopic,
      error: null,
    });

    const result = await service.findById("topic-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("topic-1");
    expect(result?.name).toBe("Technology");
    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("topics");
    expect(mocks.eq).toHaveBeenCalledWith("id", "topic-1");
  });

  test("should return null when topic not found", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned", details: "", hint: "", name: "PostgrestError" },
    });

    const result = await service.findById("non-existent");

    expect(result).toBeNull();
  });

  test("should map database row to camelCase entity", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopic = {
      id: "topic-1",
      name: "Test Topic",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockTopic,
      error: null,
    });

    const result = await service.findById("topic-1");

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");
    expect(result).not.toHaveProperty("created_at");
    expect(result).not.toHaveProperty("updated_at");
  });

  test("should throw DatabaseError on database error", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.findById("topic-1")).rejects.toThrow("Failed to fetch topic");
  });
});

describe("TopicService.createOrFindTopic", () => {
  test("should create new topic when it does not exist", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    // First call: check if exists (returns null)
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Second call: insert new topic
    const mockTopic = {
      id: "topic-1",
      name: "Climate Change",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.single.mockResolvedValue({
      data: mockTopic,
      error: null,
    });

    const command: CreateTopicCommand = {
      name: "Climate Change",
    };

    const result = await service.createOrFindTopic(command);

    expect(result.created).toBe(true);
    expect(result.topic.id).toBe("topic-1");
    expect(result.topic.name).toBe("Climate Change");
    expect(mocks.insert).toHaveBeenCalledWith({ name: "Climate Change" });
  });

  test("should return existing topic when name matches (case-insensitive)", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopic = {
      id: "topic-1",
      name: "climate change",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // Topic exists (case-insensitive match)
    mocks.maybeSingle.mockResolvedValue({
      data: mockTopic,
      error: null,
    });

    const command: CreateTopicCommand = {
      name: "Climate Change", // Different case
    };

    const result = await service.createOrFindTopic(command);

    expect(result.created).toBe(false);
    expect(result.topic.id).toBe("topic-1");
    expect(result.topic.name).toBe("climate change");
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("should handle unique constraint violation gracefully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    // First call: check if exists (returns null)
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Insert fails with unique constraint violation
    mocks.single.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "Unique constraint violation", details: "", hint: "", name: "PostgrestError" },
    });

    // Retry: find existing topic
    const mockTopic = {
      id: "topic-1",
      name: "Climate Change",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.maybeSingle.mockResolvedValueOnce({
      data: mockTopic,
      error: null,
    });

    const command: CreateTopicCommand = {
      name: "Climate Change",
    };

    const result = await service.createOrFindTopic(command);

    expect(result.created).toBe(false);
    expect(result.topic.id).toBe("topic-1");
  });

  test("should throw DatabaseError on unexpected database error", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    // First call: check if exists (returns null)
    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // Insert fails with non-unique error
    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    const command: CreateTopicCommand = {
      name: "Climate Change",
    };

    await expect(service.createOrFindTopic(command)).rejects.toThrow("Failed to create topic");
  });
});

describe("TopicService.deleteTopic", () => {
  test("should delete topic successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopic = {
      id: "topic-1",
      name: "Technology",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // First call: verify exists
    mocks.single.mockResolvedValueOnce({
      data: mockTopic,
      error: null,
    });

    // Second call: delete (no error) - eq() returns chain object that resolves
    mocks.eq.mockImplementationOnce(() => {
      const chainObj = {
        eq: mocks.eq,
        ilike: mocks.ilike,
        order: mocks.order,
        range: mocks.range,
        select: mocks.select,
        insert: mocks.insert,
        delete: mocks.delete,
        single: mocks.single,
        maybeSingle: mocks.maybeSingle,
        from: mocks.from,
      };
      const thenable = Promise.resolve({ data: null, error: null });
      return Object.assign(chainObj, {
        then: thenable.then.bind(thenable),
        catch: thenable.catch.bind(thenable),
      });
    });

    await service.deleteTopic("topic-1");

    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("topics");
    expect(mocks.delete).toHaveBeenCalled();
    expect(mocks.eq).toHaveBeenCalledWith("id", "topic-1");
  });

  test("should throw error when topic not found", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    // Topic does not exist
    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned", details: "", hint: "", name: "PostgrestError" },
    });

    await expect(service.deleteTopic("non-existent")).rejects.toThrow("NOT_FOUND");
  });

  test("should throw DatabaseError on database error", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new TopicService(client);

    const mockTopic = {
      id: "topic-1",
      name: "Technology",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // First call: verify exists
    mocks.single.mockResolvedValueOnce({
      data: mockTopic,
      error: null,
    });

    // Delete fails
    mocks.eq.mockImplementationOnce(() => {
      const chainObj = {
        eq: mocks.eq,
        ilike: mocks.ilike,
        order: mocks.order,
        range: mocks.range,
        select: mocks.select,
        insert: mocks.insert,
        delete: mocks.delete,
        single: mocks.single,
        maybeSingle: mocks.maybeSingle,
        from: mocks.from,
      };
      const thenable = Promise.resolve({
        data: null,
        error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
      });
      return Object.assign(chainObj, {
        then: thenable.then.bind(thenable),
        catch: thenable.catch.bind(thenable),
      });
    });

    await expect(service.deleteTopic("topic-1")).rejects.toThrow("Failed to delete topic");
  });
});
