import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArticleAnalysisService } from "../article-analysis.service.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types.ts";
import type { AiAnalysisService } from "../ai-analysis.service.ts";

describe("ArticleAnalysisService", () => {
  let mockSupabase: Partial<SupabaseClient<Database>>;
  let mockAiService: Partial<AiAnalysisService>;
  let mockTopicService: {
    createOrFindTopic: ReturnType<typeof vi.fn>;
  };
  let service: ArticleAnalysisService;

  const mockArticle = {
    id: "article-1",
    sourceId: "source-1",
    title: "Test Article",
    description: "Test description",
    link: "https://example.com",
    publicationDate: "2024-01-01T00:00:00Z",
    sentiment: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase
    mockSupabase = {
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({ error: null }),
        }),
      }),
    };

    // Mock AI service
    mockAiService = {
      analyzeArticle: vi.fn(),
      testService: vi.fn(),
    };

    // Mock Topic service
    mockTopicService = {
      createOrFindTopic: vi.fn(),
      deleteTopic: vi.fn(),
    };

    // Create service with mocked TopicService
    service = new ArticleAnalysisService(mockSupabase as SupabaseClient<Database>, mockAiService as AiAnalysisService);
    // Replace the topic service with our mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).topicService = mockTopicService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("analyzeAndUpdateArticle", () => {
    it("should successfully analyze and update article", async () => {
      // Mock AI analysis
      mockAiService.analyzeArticle.mockResolvedValueOnce({
        sentiment: "positive",
        topics: ["technology", "ai"],
      });

      // Mock topic creation
      mockTopicService.createOrFindTopic
        .mockResolvedValueOnce({ topic: { id: "topic-1", name: "technology" }, created: true })
        .mockResolvedValueOnce({ topic: { id: "topic-2", name: "ai" }, created: false });

      // Database operations are already mocked in beforeEach

      const result = await service.analyzeAndUpdateArticle(mockArticle);

      expect(result.success).toBe(true);
      expect(result.sentimentUpdated).toBe(true);
      expect(result.topicsUpdated).toBe(true);

      expect(mockAiService.analyzeArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Article",
          combinedText: expect.stringContaining("Test Article"),
        })
      );

      expect(mockTopicService.createOrFindTopic).toHaveBeenCalledTimes(2);
    });

    it("should handle AI analysis failure gracefully", async () => {
      mockAiService.analyzeArticle.mockRejectedValueOnce(new Error("AI Error"));

      const result = await service.analyzeAndUpdateArticle(mockArticle);

      expect(result.success).toBe(false);
      expect(result.sentimentUpdated).toBe(false);
      expect(result.topicsUpdated).toBe(false);
      expect(result.error).toBe("AI Error");
    });

    it("should handle empty topics list", async () => {
      mockAiService.analyzeArticle.mockResolvedValueOnce({
        sentiment: "neutral",
        topics: [],
      });

      const result = await service.analyzeAndUpdateArticle(mockArticle);

      expect(result.success).toBe(true);
      expect(result.sentimentUpdated).toBe(true);
      expect(result.topicsUpdated).toBe(false); // No topics to update

      expect(mockTopicService.createOrFindTopic).not.toHaveBeenCalled();
    });

    it("should handle topic creation failures gracefully", async () => {
      mockAiService.analyzeArticle.mockResolvedValueOnce({
        sentiment: "negative",
        topics: ["technology", "failed-topic"],
      });

      mockTopicService.createOrFindTopic
        .mockResolvedValueOnce({ topic: { id: "topic-1", name: "technology" }, created: true })
        .mockRejectedValueOnce(new Error("Topic creation failed"));

      const result = await service.analyzeAndUpdateArticle(mockArticle);

      expect(result.success).toBe(true);
      expect(result.sentimentUpdated).toBe(true);
      expect(result.topicsUpdated).toBe(true); // Still true even if one topic fails

      // Should still try to create topic associations for successful topics
      expect(mockTopicService.createOrFindTopic).toHaveBeenCalledTimes(2);
    });
  });

  describe("analyzeArticlesBatch", () => {
    it("should analyze multiple articles with delays", async () => {
      const articles = [mockArticle, { ...mockArticle, id: "article-2" }];

      mockAiService.analyzeArticle.mockResolvedValue({
        sentiment: "positive",
        topics: ["test"],
      });

      mockTopicService.createOrFindTopic.mockResolvedValue({
        topic: { id: "topic-1", name: "test" },
        created: true,
      });

      const result = await service.analyzeArticlesBatch(articles);

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);

      expect(mockAiService.analyzeArticle).toHaveBeenCalledTimes(2);
    });

    it("should handle mixed success/failure in batch", async () => {
      const articles = [mockArticle, { ...mockArticle, id: "article-2" }];

      mockAiService.analyzeArticle
        .mockResolvedValueOnce({
          sentiment: "positive",
          topics: ["success"],
        })
        .mockRejectedValueOnce(new Error("AI Failed"));

      mockTopicService.createOrFindTopic.mockResolvedValue({
        topic: { id: "topic-1", name: "success" },
        created: true,
      });

      const result = await service.analyzeArticlesBatch(articles);

      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
      expect(result[1].error).toBe("AI Failed");
    });
  });

  describe("testService", () => {
    it("should return success when all components work", async () => {
      mockAiService.testService.mockResolvedValue({ success: true });
      mockTopicService.createOrFindTopic.mockResolvedValue({
        topic: { id: "test-topic", name: "test-topic" },
        created: true,
      });

      const result = await service.testService();

      expect(result.success).toBe(true);
      expect(result.aiServiceWorking).toBe(true);
      expect(result.databaseWritable).toBe(true);
    });

    it("should return failure when AI service fails", async () => {
      mockAiService.testService.mockResolvedValue({
        success: false,
        error: "AI Error",
      });

      const result = await service.testService();

      expect(result.success).toBe(false);
      expect(result.aiServiceWorking).toBe(false);
      expect(result.error).toContain("AI service test failed");
    });

    it("should return failure when database write fails", async () => {
      mockAiService.testService.mockResolvedValue({ success: true });
      mockTopicService.createOrFindTopic.mockRejectedValue(new Error("DB Error"));

      const result = await service.testService();

      expect(result.success).toBe(false);
      expect(result.databaseWritable).toBe(false);
      expect(result.error).toContain("DB Error");
    });
  });
});
