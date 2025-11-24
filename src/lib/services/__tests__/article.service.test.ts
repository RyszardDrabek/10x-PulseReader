/**
 * Unit tests for ArticleService
 *
 * Tests are implemented using Vitest following the project's testing guidelines.
 * Uses vi.mock() and vi.fn() for mocking Supabase client.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi, type MockedFunction } from "vitest";
import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types.ts";
import { ArticleService } from "../article.service.ts";
import type { CreateArticleCommand, GetArticlesQueryParams, ProfileEntity } from "../../../types.ts";

interface MockQueryBuilder {
  select: (columns?: string | { count: string }) => MockQueryBuilder;
  insert: (data: unknown) => MockQueryBuilder;
  upsert: (data: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) => MockQueryBuilder;
  update: (data: unknown) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  in: (column: string, values: unknown[]) => MockQueryBuilder;
  order: (column: string, options?: { ascending: boolean }) => MockQueryBuilder;
  range: (from: number, to: number) => MockQueryBuilder;
  single: () => Promise<{ data: unknown; error: PostgrestError | null }>;
  maybeSingle: () => Promise<{ data: unknown | null; error: PostgrestError | null }>;
  then?: (resolve: (value: unknown) => void) => Promise<unknown>;
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
    upsert: MockedFunction<
      (data: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) => MockQueryBuilder
    >;
    delete: MockedFunction<() => MockQueryBuilder>;
    eq: MockedFunction<(column: string, value: unknown) => MockQueryBuilder>;
    in: MockedFunction<(column: string, values: unknown[]) => MockQueryBuilder>;
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
  const mockIn = vi.fn();
  const mockOrder = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpsert = vi.fn();
  const mockDelete = vi.fn();
  const mockFrom = vi.fn();
  const mockSchema = vi.fn();

  // Create chain builder function that returns objects with all possible next methods
  const createChainObject = () => ({
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
    range: mockRange,
    select: mockSelect,
    insert: mockInsert,
    upsert: mockUpsert,
    delete: mockDelete,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    from: mockFrom,
  });

  // Setup chain: each method returns an object with next methods
  // .eq() can be chained OR return a promise when awaited (for topic filter)
  // When mockResolvedValueOnce is called, it will override this for that specific call
  mockEq.mockImplementation(() => {
    const chainObj = createChainObject();
    // Make it awaitable by adding then() method
    // This allows .eq() to be used both as a chain method and as a final call
    const thenable = Promise.resolve({ data: [], error: null });
    return Object.assign(chainObj, {
      then: thenable.then.bind(thenable),
      catch: thenable.catch.bind(thenable),
    });
  });
  // .in() can be chained OR return a promise when awaited (for validateTopics)
  // Default: return chain object (for use in applyFilters)
  // Tests can override with mockResolvedValueOnce for final calls
  mockIn.mockImplementation(() => {
    const chainObj = createChainObject();
    const thenable = Promise.resolve({ data: [], error: null });
    return Object.assign(chainObj, {
      then: thenable.then.bind(thenable),
      catch: thenable.catch.bind(thenable),
    });
  });
  mockOrder.mockImplementation(() => createChainObject());
  mockSelect.mockImplementation(() => createChainObject());
  mockInsert.mockImplementation(() => createChainObject());
  mockUpsert.mockImplementation(() => createChainObject());
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
      upsert: mockUpsert,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      order: mockOrder,
      range: mockRange,
    },
  };
}

describe("ArticleService.validateSource", () => {
  test("should return true for valid source ID", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    mocks.maybeSingle.mockResolvedValue({
      data: { id: "valid-source-id" },
      error: null,
    });

    const result = await service.validateSource("valid-source-id");

    expect(result).toBe(true);
    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("rss_sources");
    expect(mocks.select).toHaveBeenCalledWith("id");
    expect(mocks.eq).toHaveBeenCalledWith("id", "valid-source-id");
    expect(mocks.maybeSingle).toHaveBeenCalled();
  });

  test("should return false for invalid source ID", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: null, // maybeSingle returns null data, not error for not found
    });

    const result = await service.validateSource("invalid-source-id");

    expect(result).toBe(false);
    expect(mocks.maybeSingle).toHaveBeenCalled();
  });

  test("should return false when database query fails", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    const result = await service.validateSource("any-id");

    expect(result).toBe(false);
  });
});

describe("ArticleService.validateTopics", () => {
  test("should return valid:true for all valid topic IDs", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const validTopicIds = ["topic-1", "topic-2", "topic-3"];

    mocks.in.mockResolvedValue({
      data: [{ id: "topic-1" }, { id: "topic-2" }, { id: "topic-3" }],
      error: null,
    } as any);

    const result = await service.validateTopics(validTopicIds);

    expect(result).toEqual({ valid: true, invalidIds: [] });
    expect(mocks.schema).toHaveBeenCalledWith("app");
    expect(mocks.from).toHaveBeenCalledWith("topics");
    expect(mocks.select).toHaveBeenCalledWith("id");
    expect(mocks.in).toHaveBeenCalledWith("id", validTopicIds);
  });

  test("should return invalid IDs for non-existent topics", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const topicIds = ["valid-1", "fake-1", "valid-2", "fake-2"];

    mocks.in.mockResolvedValue({
      data: [{ id: "valid-1" }, { id: "valid-2" }],
      error: null,
    } as any);

    const result = await service.validateTopics(topicIds);

    expect(result).toEqual({
      valid: false,
      invalidIds: ["fake-1", "fake-2"],
    });
  });

  test("should handle empty array", async () => {
    const { client } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const result = await service.validateTopics([]);

    expect(result).toEqual({ valid: true, invalidIds: [] });
  });

  test("should handle null input", async () => {
    const { client } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const result = await service.validateTopics(null as any);

    expect(result).toEqual({ valid: true, invalidIds: [] });
  });

  test("should handle undefined input", async () => {
    const { client } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const result = await service.validateTopics(undefined as any);

    expect(result).toEqual({ valid: true, invalidIds: [] });
  });

  test("should return all IDs as invalid when database query fails", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const topicIds = ["topic-1", "topic-2"];

    mocks.in.mockResolvedValue({
      data: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    } as any);

    const result = await service.validateTopics(topicIds);

    expect(result).toEqual({
      valid: false,
      invalidIds: topicIds,
    });
  });
});

describe("ArticleService.createArticle", () => {
  const createValidCommand = (overrides?: Partial<CreateArticleCommand>): CreateArticleCommand => ({
    sourceId: "valid-source-id",
    title: "Test Article",
    description: "Test description",
    link: "https://example.com/article",
    publicationDate: new Date().toISOString(),
    sentiment: "neutral",
    ...overrides,
  });

  test("should create article successfully without topics", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const command = createValidCommand({ topicIds: undefined });
    const mockArticle = {
      id: "article-id",
      source_id: command.sourceId,
      title: command.title,
      description: command.description,
      link: command.link,
      publication_date: command.publicationDate,
      sentiment: command.sentiment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: command.sourceId },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({
      data: mockArticle,
      error: null,
    });

    const result = await service.createArticle(command);

    expect(result).toMatchObject({
      id: mockArticle.id,
      sourceId: mockArticle.source_id,
      title: mockArticle.title,
      description: mockArticle.description,
      link: mockArticle.link,
      publicationDate: mockArticle.publication_date,
      sentiment: mockArticle.sentiment,
    });
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  test("should create article with topic associations", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const topicIds = ["topic-1", "topic-2", "topic-3"];
    const command = createValidCommand({ topicIds });
    const mockArticle = {
      id: "article-id",
      source_id: command.sourceId,
      title: command.title,
      description: command.description,
      link: command.link,
      publication_date: command.publicationDate,
      sentiment: command.sentiment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock validateSource
    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      select: mocks.select,
      insert: mocks.insert,
    } as any);
    mocks.select.mockReturnValue({
      eq: mocks.eq,
      in: mocks.in,
      single: mocks.single,
    } as any);
    mocks.eq.mockReturnValue({
      single: mocks.single,
      maybeSingle: mocks.maybeSingle,
    } as any);
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: command.sourceId },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({
      data: mockArticle,
      error: null,
    });

    // Mock validateTopics
    mocks.in.mockResolvedValue({
      data: topicIds.map((id) => ({ id })),
      error: null,
    } as any);

    // Mock insert article
    mocks.insert.mockReturnValue({
      select: mocks.select,
    } as any);

    // Mock insert topic associations
    mocks.insert.mockReturnValueOnce({
      select: mocks.select,
    } as any);
    mocks.insert.mockResolvedValueOnce({
      data: null,
      error: null,
    } as any);

    const result = await service.createArticle(command);

    expect(result).toMatchObject({
      id: mockArticle.id,
      sourceId: mockArticle.source_id,
      title: mockArticle.title,
    });
    expect(mocks.insert).toHaveBeenCalledTimes(2); // Article + topic associations
  });

  test("should throw RSS_SOURCE_NOT_FOUND for invalid source", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const command = createValidCommand();

    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockReturnValue({
      eq: mocks.eq,
    } as any);
    mocks.eq.mockReturnValue({
      maybeSingle: mocks.maybeSingle,
    } as any);
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: null, // maybeSingle returns null data, not error for not found
    });

    await expect(service.createArticle(command)).rejects.toThrow("RSS_SOURCE_NOT_FOUND");
  });

  test("should throw INVALID_TOPIC_IDS for invalid topics", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const command = createValidCommand({ topicIds: ["valid-1", "invalid-1", "valid-2"] });

    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockReturnValue({
      eq: mocks.eq,
      in: mocks.in,
    } as any);
    mocks.eq.mockReturnValue({
      maybeSingle: mocks.maybeSingle,
    } as any);
    mocks.maybeSingle.mockResolvedValue({
      data: { id: command.sourceId },
      error: null,
    });
    mocks.in.mockResolvedValue({
      data: [{ id: "valid-1" }, { id: "valid-2" }],
      error: null,
    } as any);

    await expect(service.createArticle(command)).rejects.toThrow("INVALID_TOPIC_IDS");
  });

  test("should throw ARTICLE_ALREADY_EXISTS for duplicate link", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const command = createValidCommand();

    // First call: validateSource (returns valid source)
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: command.sourceId },
      error: null,
    });
    // Second call: insert article (returns duplicate error)
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

    await expect(service.createArticle(command)).rejects.toThrow("ARTICLE_ALREADY_EXISTS");
  });

  test("should rollback article if topic association fails", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const topicIds = ["topic-1"];
    const command = createValidCommand({ topicIds });
    const mockArticle = {
      id: "article-id",
      source_id: command.sourceId,
      title: command.title,
      description: command.description,
      link: command.link,
      publication_date: command.publicationDate,
      sentiment: command.sentiment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // validateSource call
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: command.sourceId },
      error: null,
    });
    // validateTopics call
    mocks.in.mockResolvedValueOnce({
      data: [{ id: "topic-1" }],
      error: null,
    } as any);
    // insert article call - .insert().select().single()
    mocks.single.mockResolvedValueOnce({
      data: mockArticle,
      error: null,
    });
    // insert topic associations call (fails) - .insert() is awaited directly (line 275)
    // Need to make .insert() return a promise for this call
    let insertCallCount = 0;
    mocks.insert.mockImplementation(() => {
      insertCallCount++;
      // First call is for article insert - return chain object
      if (insertCallCount === 1) {
        return {
          eq: mocks.eq,
          in: mocks.in,
          order: mocks.order,
          range: mocks.range,
          select: mocks.select,
          insert: mocks.insert,
          delete: mocks.delete,
          single: mocks.single,
          from: mocks.from,
        } as any;
      }
      // Second call is for topic associations - return promise (awaited directly)
      return Promise.resolve({
        data: null,
        error: { code: "PGRST301", message: "Association failed", details: "", hint: "" },
      }) as any;
    });

    await expect(service.createArticle(command)).rejects.toThrow("TOPIC_ASSOCIATION_FAILED");
    expect(mocks.delete).toHaveBeenCalled();
  });

  test("should map database response to camelCase", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const command = createValidCommand();
    const mockArticle = {
      id: "article-id",
      source_id: "source-id",
      title: "Test Title",
      description: "Test Description",
      link: "https://example.com",
      publication_date: "2024-01-01T00:00:00Z",
      sentiment: "positive" as const,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: command.sourceId },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({
      data: mockArticle,
      error: null,
    });

    const result = await service.createArticle(command);

    expect(result).toHaveProperty("sourceId");
    expect(result).toHaveProperty("publicationDate");
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");
    expect(result).not.toHaveProperty("source_id");
    expect(result).not.toHaveProperty("publication_date");
    expect(result).not.toHaveProperty("created_at");
    expect(result).not.toHaveProperty("updated_at");
  });

  test("should handle null/optional fields correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const command: CreateArticleCommand = {
      sourceId: "valid-source-id",
      title: "Test Article",
      description: null,
      link: "https://example.com/article",
      publicationDate: new Date().toISOString(),
      sentiment: null,
      topicIds: undefined,
    };
    const mockArticle = {
      id: "article-id",
      source_id: command.sourceId,
      title: command.title,
      description: null,
      link: command.link,
      publication_date: command.publicationDate,
      sentiment: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: command.sourceId },
      error: null,
    });
    mocks.single.mockResolvedValueOnce({
      data: mockArticle,
      error: null,
    });

    const result = await service.createArticle(command);

    expect(result.description).toBeNull();
    expect(result.sentiment).toBeNull();
  });
});

describe("ArticleService.createArticlesBatch", () => {
  const createValidCommand = (overrides?: Partial<CreateArticleCommand>): CreateArticleCommand => ({
    sourceId: "valid-source-id",
    title: "Test Article",
    description: "Test description",
    link: "https://example.com/article",
    publicationDate: new Date().toISOString(),
    sentiment: "neutral",
    ...overrides,
  });

  test("should return empty arrays for empty batch", async () => {
    const { client } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const result = await service.createArticlesBatch([], true);

    expect(result.articles).toEqual([]);
    expect(result.duplicatesSkipped).toBe(0);
  });

  test("should batch create multiple articles successfully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [
      createValidCommand({ link: "https://example.com/article1", title: "Article 1" }),
      createValidCommand({ link: "https://example.com/article2", title: "Article 2" }),
      createValidCommand({ link: "https://example.com/article3", title: "Article 3" }),
    ];

    const mockArticles = commands.map((cmd, index) => ({
      id: `article-id-${index + 1}`,
      source_id: cmd.sourceId,
      title: cmd.title,
      description: cmd.description,
      link: cmd.link,
      publication_date: cmd.publicationDate,
      sentiment: cmd.sentiment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Mock upsert chain: schema -> from -> upsert -> select
    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      upsert: mocks.upsert,
    } as any);
    mocks.upsert.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockResolvedValue({
      data: mockArticles,
      error: null,
    });

    const result = await service.createArticlesBatch(commands, true);

    expect(result.articles).toHaveLength(3);
    expect(result.duplicatesSkipped).toBe(0);
    expect(result.articles[0].title).toBe("Article 1");
    expect(result.articles[1].title).toBe("Article 2");
    expect(result.articles[2].title).toBe("Article 3");
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          source_id: "valid-source-id",
          title: "Article 1",
          link: "https://example.com/article1",
        }),
      ]),
      { onConflict: "link", ignoreDuplicates: true }
    );
  });

  test("should skip source validation when skipSourceValidation is true", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [createValidCommand()];
    const mockArticle = {
      id: "article-id",
      source_id: commands[0].sourceId,
      title: commands[0].title,
      description: commands[0].description,
      link: commands[0].link,
      publication_date: commands[0].publicationDate,
      sentiment: commands[0].sentiment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      upsert: mocks.upsert,
    } as any);
    mocks.upsert.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockResolvedValue({
      data: [mockArticle],
      error: null,
    });

    await service.createArticlesBatch(commands, true);

    // Should not call validateSource (maybeSingle should not be called)
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  test("should validate source when skipSourceValidation is false", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [createValidCommand()];
    const mockArticle = {
      id: "article-id",
      source_id: commands[0].sourceId,
      title: commands[0].title,
      description: commands[0].description,
      link: commands[0].link,
      publication_date: commands[0].publicationDate,
      sentiment: commands[0].sentiment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock source validation (first call)
    mocks.schema.mockReturnValueOnce({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValueOnce({
      select: mocks.select,
    } as any);
    mocks.select.mockReturnValueOnce({
      eq: mocks.eq,
    } as any);
    mocks.eq.mockReturnValueOnce({
      maybeSingle: mocks.maybeSingle,
    } as any);
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: commands[0].sourceId },
      error: null,
    });

    // Mock upsert (second call)
    mocks.schema.mockReturnValueOnce({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValueOnce({
      upsert: mocks.upsert,
    } as any);
    mocks.upsert.mockReturnValueOnce({
      select: mocks.select,
    } as any);
    mocks.select.mockResolvedValueOnce({
      data: [mockArticle],
      error: null,
    });

    await service.createArticlesBatch(commands, false);

    expect(mocks.maybeSingle).toHaveBeenCalled();
  });

  test("should throw error if articles have different sourceIds", async () => {
    const { client } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [
      createValidCommand({ sourceId: "source-1", link: "https://example.com/article1" }),
      createValidCommand({ sourceId: "source-2", link: "https://example.com/article2" }),
    ];

    await expect(service.createArticlesBatch(commands, true)).rejects.toThrow(
      "All articles in batch must have the same sourceId"
    );
  });

  test("should throw RSS_SOURCE_NOT_FOUND for invalid source when validation is enabled", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [createValidCommand()];

    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockReturnValue({
      eq: mocks.eq,
    } as any);
    mocks.eq.mockReturnValue({
      maybeSingle: mocks.maybeSingle,
    } as any);
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(service.createArticlesBatch(commands, false)).rejects.toThrow("RSS_SOURCE_NOT_FOUND");
  });

  test("should handle duplicates correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [
      createValidCommand({ link: "https://example.com/article1", title: "Article 1" }),
      createValidCommand({ link: "https://example.com/article2", title: "Article 2" }),
      createValidCommand({ link: "https://example.com/article3", title: "Article 3" }),
    ];

    // Simulate that only 2 articles were inserted (1 duplicate skipped)
    const mockArticles = [
      {
        id: "article-id-1",
        source_id: commands[0].sourceId,
        title: commands[0].title,
        description: commands[0].description,
        link: commands[0].link,
        publication_date: commands[0].publicationDate,
        sentiment: commands[0].sentiment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "article-id-2",
        source_id: commands[1].sourceId,
        title: commands[1].title,
        description: commands[1].description,
        link: commands[1].link,
        publication_date: commands[1].publicationDate,
        sentiment: commands[1].sentiment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      upsert: mocks.upsert,
    } as any);
    mocks.upsert.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockResolvedValue({
      data: mockArticles,
      error: null,
    });

    const result = await service.createArticlesBatch(commands, true);

    expect(result.articles).toHaveLength(2);
    expect(result.duplicatesSkipped).toBe(1); // 3 commands - 2 articles = 1 duplicate
  });

  test("should handle batch insert errors", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [createValidCommand()];

    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      upsert: mocks.upsert,
    } as any);
    mocks.upsert.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST301",
        message: "Database error",
        details: "",
        hint: "",
        name: "PostgrestError",
      },
    });

    await expect(service.createArticlesBatch(commands, true)).rejects.toThrow();
  });

  test("should map database responses to ArticleEntity correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const commands = [createValidCommand()];
    const mockArticle = {
      id: "article-id",
      source_id: "valid-source-id",
      title: "Test Article",
      description: "Test description",
      link: "https://example.com/article",
      publication_date: "2024-01-01T00:00:00Z",
      sentiment: "neutral",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mocks.schema.mockReturnValue({
      from: mocks.from,
    } as any);
    mocks.from.mockReturnValue({
      upsert: mocks.upsert,
    } as any);
    mocks.upsert.mockReturnValue({
      select: mocks.select,
    } as any);
    mocks.select.mockResolvedValue({
      data: [mockArticle],
      error: null,
    });

    const result = await service.createArticlesBatch(commands, true);

    expect(result.articles[0]).toMatchObject({
      id: "article-id",
      sourceId: "valid-source-id",
      title: "Test Article",
      description: "Test description",
      link: "https://example.com/article",
      publicationDate: "2024-01-01T00:00:00Z",
      sentiment: "neutral",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
  });
});

describe("ArticleService.getArticles", () => {
  const createMockArticle = (overrides = {}) => ({
    id: "article-id",
    source_id: "source-id",
    title: "Test Article",
    description: "Test description",
    link: "https://example.com/article",
    publication_date: new Date().toISOString(),
    sentiment: "neutral" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rss_sources: {
      id: "source-id",
      name: "Test Source",
      url: "https://example.com",
    },
    article_topics: [],
    ...overrides,
  });

  test("should fetch articles with default parameters", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const mockArticles = Array.from({ length: 20 }, (_, i) => createMockArticle({ id: `article-${i}` }));

    mocks.range.mockResolvedValue({
      data: mockArticles,
      count: 30,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      limit: 20,
      offset: 0,
      sortBy: "publication_date",
      sortOrder: "desc",
    };

    const result = await service.getArticles(params);

    expect(result.data).toHaveLength(20);
    expect(result.pagination.total).toBe(30);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.limit).toBe(20);
    expect(result.pagination.offset).toBe(0);
  });

  test("should apply sentiment filter", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const mockArticles = Array.from({ length: 10 }, (_, i) =>
      createMockArticle({ id: `article-${i}`, sentiment: "positive" as const })
    );

    mocks.range.mockResolvedValue({
      data: mockArticles,
      count: 10,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      sentiment: "positive",
      limit: 20,
      offset: 0,
    };

    const result = await service.getArticles(params);

    expect(result.data).toHaveLength(10);
    expect(result.pagination.total).toBe(10);
    expect(result.filtersApplied?.sentiment).toBe("positive");
    expect(mocks.eq).toHaveBeenCalledWith("sentiment", "positive");
  });

  test("should apply topic filter", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const topicId = "topic-1";
    const articleIds = ["article-1", "article-2", "article-3"];

    // Mock article_topics query - .eq() is awaited directly (line 124 in article.service.ts)
    // The article_topics query is: schema().from("article_topics").select("article_id").eq("topic_id", ...)
    // We need to make .eq() return a promise ONLY for the "topic_id" call, then reset to default behavior
    mocks.eq.mockImplementationOnce((column: string) => {
      // First call is for article_topics query with "topic_id" - return promise
      if (column === "topic_id") {
        return Promise.resolve({
          data: articleIds.map((id) => ({ article_id: id })),
          error: null,
        }) as any;
      }
      // Fallback - shouldn't happen for first call
      const chainObj = {
        eq: mocks.eq,
        in: mocks.in,
        order: mocks.order,
        range: mocks.range,
        select: mocks.select,
        insert: mocks.insert,
        delete: mocks.delete,
        single: mocks.single,
        from: mocks.from,
      };
      const thenable = Promise.resolve({ data: [], error: null });
      return Object.assign(chainObj, {
        then: thenable.then.bind(thenable),
        catch: thenable.catch.bind(thenable),
      });
    });
    // After the first call, restore default behavior (chain object with then())
    mocks.range.mockResolvedValue({
      data: articleIds.map((id) => createMockArticle({ id })),
      count: 3,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      topicId,
      limit: 20,
      offset: 0,
    };

    const result = await service.getArticles(params);

    expect(result.data).toHaveLength(3);
    expect(result.pagination.total).toBe(3);
  });

  test("should apply source filter", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const sourceId = "source-1";
    const mockArticles = Array.from({ length: 7 }, (_, i) =>
      createMockArticle({ id: `article-${i}`, source_id: sourceId })
    );

    mocks.range.mockResolvedValue({
      data: mockArticles,
      count: 7,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      sourceId,
      limit: 20,
      offset: 0,
    };

    const result = await service.getArticles(params);

    expect(result.data).toHaveLength(7);
    expect(result.pagination.total).toBe(7);
    expect(mocks.eq).toHaveBeenCalledWith("source_id", sourceId);
  });

  test("should sort by publication_date desc (default)", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const dates = ["2024-01-03T00:00:00Z", "2024-01-02T00:00:00Z", "2024-01-01T00:00:00Z"];
    const mockArticles = dates.map((date, i) => createMockArticle({ id: `article-${i}`, publication_date: date }));

    mocks.range.mockResolvedValue({
      data: mockArticles,
      count: 3,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      sortBy: "publication_date",
      sortOrder: "desc",
      limit: 10,
      offset: 0,
    };

    await service.getArticles(params);

    expect(mocks.order).toHaveBeenCalledWith("publication_date", { ascending: false });
  });

  test("should sort by created_at asc", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    mocks.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      sortBy: "created_at",
      sortOrder: "asc",
      limit: 10,
      offset: 0,
    };

    await service.getArticles(params);

    expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  test("should apply pagination correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    // First page
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => createMockArticle({ id: `article-${i}` })),
      count: 50,
      error: null,
    });

    const params1: GetArticlesQueryParams = { limit: 20, offset: 0 };
    const result1 = await service.getArticles(params1);

    expect(result1.data).toHaveLength(20);
    expect(result1.pagination.hasMore).toBe(true);
    expect(mocks.range).toHaveBeenCalledWith(0, 19);

    // Second page
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => createMockArticle({ id: `article-${i + 20}` })),
      count: 50,
      error: null,
    });

    const params2: GetArticlesQueryParams = { limit: 20, offset: 20 };
    const result2 = await service.getArticles(params2);

    expect(result2.data).toHaveLength(20);
    expect(result2.pagination.hasMore).toBe(true);
    expect(mocks.range).toHaveBeenCalledWith(20, 39);

    // Last page
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, i) => createMockArticle({ id: `article-${i + 40}` })),
      count: 50,
      error: null,
    });

    const params3: GetArticlesQueryParams = { limit: 20, offset: 40 };
    const result3 = await service.getArticles(params3);

    expect(result3.data).toHaveLength(10);
    expect(result3.pagination.hasMore).toBe(false);
  });

  test("should calculate hasMore correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    // First page: 25 total, limit 20
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 20 }, (_, i) => createMockArticle({ id: `article-${i}` })),
      count: 25,
      error: null,
    });

    const result1 = await service.getArticles({ limit: 20, offset: 0 });
    expect(result1.pagination.hasMore).toBe(true);

    // Second page: 25 total, offset 20
    mocks.range.mockResolvedValueOnce({
      data: Array.from({ length: 5 }, (_, i) => createMockArticle({ id: `article-${i + 20}` })),
      count: 25,
      error: null,
    });

    const result2 = await service.getArticles({ limit: 20, offset: 20 });
    expect(result2.pagination.hasMore).toBe(false);
  });

  test("should apply mood-based filtering when personalization enabled", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const userId = "user-1";
    const mockProfile: ProfileEntity = {
      id: "profile-1",
      userId,
      mood: "positive",
      blocklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockArticles = Array.from({ length: 10 }, (_, i) =>
      createMockArticle({ id: `article-${i}`, sentiment: "positive" as const })
    );

    // Mock getProfile - .single() returns profile (called first for getProfile)
    mocks.single.mockResolvedValueOnce({
      data: {
        id: mockProfile.id,
        user_id: mockProfile.userId,
        mood: mockProfile.mood,
        blocklist: mockProfile.blocklist,
        created_at: mockProfile.createdAt,
        updated_at: mockProfile.updatedAt,
      },
      error: null,
    });
    mocks.range.mockResolvedValue({
      data: mockArticles,
      count: 10,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      applyPersonalization: true,
      limit: 20,
      offset: 0,
    };

    const result = await service.getArticles(params, userId);

    expect(result.data).toHaveLength(10);
    expect(result.filtersApplied?.personalization).toBe(true);
    // Note: filtersApplied.sentiment is set from params.sentiment, not from mood
    // When mood-based filtering is applied, params.sentiment is undefined
    // So filtersApplied.sentiment will be undefined, but the filter is still applied via .eq()
    expect(result.filtersApplied?.sentiment).toBeUndefined();
    // Verify that .eq() was called with sentiment filter from mood
    expect(mocks.eq).toHaveBeenCalledWith("sentiment", "positive");
  });

  test("should apply blocklist filtering when personalization enabled", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const userId = "user-1";
    const mockProfile: ProfileEntity = {
      id: "profile-1",
      userId,
      mood: null,
      blocklist: ["politics", "sports"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockArticles = [
      createMockArticle({ id: "article-1", title: "Technology News" }),
      createMockArticle({ id: "article-2", title: "Politics Update" }), // Blocked
      createMockArticle({ id: "article-3", description: "Sports results" }), // Blocked
      createMockArticle({ id: "article-4", link: "https://example.com/politics" }), // Blocked
      createMockArticle({ id: "article-5", title: "Science Discovery" }),
    ];

    // Mock getProfile
    mocks.single.mockResolvedValueOnce({
      data: {
        id: mockProfile.id,
        user_id: mockProfile.userId,
        mood: mockProfile.mood,
        blocklist: mockProfile.blocklist,
        created_at: mockProfile.createdAt,
        updated_at: mockProfile.updatedAt,
      },
      error: null,
    });
    // Over-fetch: fetch 40 (2x limit) to account for blocklist filtering
    mocks.range.mockResolvedValue({
      data: mockArticles,
      count: 5,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      applyPersonalization: true,
      limit: 20,
      offset: 0,
    };

    const result = await service.getArticles(params, userId);

    // Should filter out articles with "politics" or "sports"
    expect(result.data.length).toBeLessThanOrEqual(2); // Only non-blocklisted articles
    expect(result.filtersApplied?.personalization).toBe(true);
    expect(result.filtersApplied?.blockedItemsCount).toBeGreaterThan(0);
  });

  test("should handle empty results gracefully", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    mocks.range.mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      sentiment: "positive",
      limit: 20,
      offset: 0,
    };

    const result = await service.getArticles(params);

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  test("should throw PROFILE_NOT_FOUND for personalization without profile", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const userId = "user-without-profile";

    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows found", details: "", hint: "", name: "PostgrestError" },
    });

    const params: GetArticlesQueryParams = {
      applyPersonalization: true,
      limit: 20,
      offset: 0,
    };

    await expect(service.getArticles(params, userId)).rejects.toThrow("PROFILE_NOT_FOUND");
  });

  test("should handle database errors", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    mocks.range.mockResolvedValue({
      data: null,
      count: null,
      error: { code: "PGRST301", message: "Database error", details: "", hint: "", name: "PostgrestError" },
    });

    const params: GetArticlesQueryParams = {
      limit: 20,
      offset: 0,
    };

    await expect(service.getArticles(params)).rejects.toThrow();
  });

  test("should combine multiple filters correctly", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const sourceId = "source-1";
    const sentiment = "positive" as const;
    const mockArticles = Array.from({ length: 5 }, (_, i) =>
      createMockArticle({
        id: `article-${i}`,
        source_id: sourceId,
        sentiment,
      })
    );

    mocks.range.mockResolvedValue({
      data: mockArticles,
      count: 5,
      error: null,
    });

    const params: GetArticlesQueryParams = {
      sentiment,
      sourceId,
      limit: 20,
      offset: 0,
    };

    const result = await service.getArticles(params);

    expect(result.data).toHaveLength(5);
    expect(result.pagination.total).toBe(5);
    expect(mocks.eq).toHaveBeenCalledWith("sentiment", sentiment);
    expect(mocks.eq).toHaveBeenCalledWith("source_id", sourceId);
  });

  test("should map article to DTO with nested relations", async () => {
    const { client, mocks } = createMockSupabaseClient();
    const service = new ArticleService(client);

    const mockArticle = createMockArticle({
      id: "article-1",
      rss_sources: {
        id: "source-1",
        name: "Test Source",
        url: "https://example.com",
      },
      article_topics: [
        { topics: { id: "topic-1", name: "Technology" } },
        { topics: { id: "topic-2", name: "Science" } },
      ],
    });

    mocks.range.mockResolvedValue({
      data: [mockArticle],
      count: 1,
      error: null,
    });

    const result = await service.getArticles({ limit: 1, offset: 0 });

    expect(result.data[0]).toHaveProperty("source");
    expect(result.data[0].source).toMatchObject({
      id: "source-1",
      name: "Test Source",
      url: "https://example.com",
    });
    expect(result.data[0]).toHaveProperty("topics");
    expect(result.data[0].topics).toHaveLength(2);
    expect(result.data[0].topics[0]).toMatchObject({
      id: "topic-1",
      name: "Technology",
    });
  });
});
