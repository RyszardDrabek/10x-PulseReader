import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AiAnalysisService } from "../ai-analysis.service.ts";
import { OpenRouterClient } from "../openrouter.client.ts";

describe("AiAnalysisService", () => {
  let mockClient: Partial<OpenRouterClient>;
  let service: AiAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      chatCompletion: vi.fn(),
    };
    service = new AiAnalysisService(mockClient as OpenRouterClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("analyzeArticle", () => {
    const validInput = {
      title: "Test Article",
      description: "This is a test article description.",
      combinedText: "Test Article\n\nThis is a test article description.",
    };

    const mockAiResponse = {
      choices: [
        {
          message: {
            content: '{"sentiment": "positive", "topics": ["technology", "testing"]}',
          },
        },
      ],
    };

    it("should successfully analyze article and return valid result", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce(mockAiResponse);

      const result = await service.analyzeArticle(validInput);

      expect(result.sentiment).toBe("positive");
      expect(result.topics).toEqual(["technology", "testing"]);

      expect(mockClient.chatCompletion).toHaveBeenCalledTimes(1);
    });

    it("should handle AI response validation errors", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{"sentiment": "invalid", "topics": []}',
            },
          },
        ],
      });

      await expect(service.analyzeArticle(validInput)).rejects.toThrow("AI_RESPONSE_VALIDATION_FAILED");
    });

    it("should handle invalid JSON response", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "invalid json {{{",
            },
          },
        ],
      });

      await expect(service.analyzeArticle(validInput)).rejects.toThrow("AI_RESPONSE_INVALID_JSON");
    });

    it("should handle API errors", async () => {
      mockClient.chatCompletion.mockRejectedValueOnce(new Error("API Error"));

      await expect(service.analyzeArticle(validInput)).rejects.toThrow("API Error");
    });

    it("should validate input data", async () => {
      const invalidInput = {
        title: "", // Invalid: empty title
        description: null,
        combinedText: "",
      };

      await expect(service.analyzeArticle(invalidInput)).rejects.toThrow();
    });
  });

  describe("prepareArticleForAnalysis", () => {
    it("should combine title and description", () => {
      const result = AiAnalysisService.prepareArticleForAnalysis("Test Title", "Test description content.");

      expect(result.title).toBe("Test Title");
      expect(result.description).toBe("Test description content.");
      expect(result.combinedText).toBe("Test Title Test description content.");
    });

    it("should handle missing description", () => {
      const result = AiAnalysisService.prepareArticleForAnalysis("Test Title");

      expect(result.title).toBe("Test Title");
      expect(result.description).toBeNull();
      expect(result.combinedText).toBe("Test Title");
    });

    it("should handle null description", () => {
      const result = AiAnalysisService.prepareArticleForAnalysis("Test Title", null);

      expect(result.title).toBe("Test Title");
      expect(result.description).toBeNull();
      expect(result.combinedText).toBe("Test Title");
    });

    it("should truncate long content", () => {
      const longDescription = "a".repeat(2000);
      const result = AiAnalysisService.prepareArticleForAnalysis("Title", longDescription);

      expect(result.combinedText.length).toBeLessThanOrEqual(1503);
      expect(result.combinedText).toMatch(/\.\.\.$/);
    });

    it("should clean whitespace", () => {
      const result = AiAnalysisService.prepareArticleForAnalysis("  Test Title  ", "  Test description  ");

      expect(result.title).toBe("Test Title");
      expect(result.description).toBe("Test description");
      expect(result.combinedText).toBe("Test Title Test description");
    });
  });

  describe("testService", () => {
    it("should return success when analysis works", async () => {
      mockClient.chatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: '{"sentiment": "neutral", "topics": ["test"]}',
            },
          },
        ],
      });

      const result = await service.testService();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return failure when analysis fails", async () => {
      mockClient.chatCompletion.mockRejectedValueOnce(new Error("API Error"));

      const result = await service.testService();

      expect(result.success).toBe(false);
      expect(result.error).toContain("API Error");
    });
  });
});
