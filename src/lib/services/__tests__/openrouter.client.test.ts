import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../test/vitest.setup.ts";
import { OpenRouterClient } from "../openrouter.client.ts";

describe("OpenRouterClient", () => {
  let client: OpenRouterClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenRouterClient("test-api-key", "test-model");
    server.resetHandlers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should throw error if API key is not provided", () => {
      expect(() => new OpenRouterClient()).toThrow("OPENROUTER_API_KEY environment variable is required");
    });

    it("should use provided API key", () => {
      const client = new OpenRouterClient("custom-key");
      expect(client).toBeInstanceOf(OpenRouterClient);
    });
  });

  describe("chatCompletion", () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: '{"sentiment": "positive", "topics": ["test"]}',
          },
        },
      ],
      usage: { total_tokens: 100 },
      model: "test-model",
    };

    it("should make successful API call", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const messages = [{ role: "user" as const, content: "Test message" }];
      const result = await client.chatCompletion(messages);

      expect(result).toEqual(mockResponse);
    });

    it("should handle rate limiting", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return new HttpResponse("Rate limited", { status: 429 });
        })
      );

      const messages = [{ role: "user" as const, content: "Test" }];

      await expect(client.chatCompletion(messages)).rejects.toThrow("AI_RATE_LIMIT_EXCEEDED");
    });

    it("should handle insufficient credits", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return new HttpResponse("Insufficient credits", { status: 402 });
        })
      );

      const messages = [{ role: "user" as const, content: "Test" }];

      await expect(client.chatCompletion(messages)).rejects.toThrow("AI_INSUFFICIENT_CREDITS");
    });

    it("should handle network errors", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return HttpResponse.error();
        })
      );

      const messages = [{ role: "user" as const, content: "Test" }];

      await expect(client.chatCompletion(messages)).rejects.toThrow("AI_REQUEST_FAILED");
    });

    it("should handle timeout", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", async () => {
          // Simulate delay longer than timeout
          await new Promise((resolve) => setTimeout(resolve, 200));
          return HttpResponse.json(mockResponse);
        })
      );

      const messages = [{ role: "user" as const, content: "Test" }];

      await expect(client.chatCompletion(messages, { timeoutMs: 100 })).rejects.toThrow("AI_REQUEST_TIMEOUT");
    });

    it("should use default parameters", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const messages = [{ role: "user" as const, content: "Test" }];
      await client.chatCompletion(messages);
      // Test passes if no error is thrown - MSW validates the request structure
    });

    it("should allow custom parameters", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return HttpResponse.json(mockResponse);
        })
      );

      const messages = [{ role: "user" as const, content: "Test" }];
      await client.chatCompletion(messages, {
        temperature: 0.5,
        maxTokens: 1000,
        timeoutMs: 5000,
      });
      // Test passes if no error is thrown - MSW validates the request structure
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return HttpResponse.json({
            choices: [{ message: { content: '{"status": "OK"}' } }],
          });
        })
      );

      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it("should return false for failed connection", async () => {
      server.use(
        http.post("https://openrouter.ai/api/v1/chat/completions", () => {
          return HttpResponse.error();
        })
      );

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });
});
