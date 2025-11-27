import { logger } from "../utils/logger.ts";
import type { OpenRouterResponse } from "../validation/ai-analysis.schema.ts";

/**
 * OpenRouter API client for AI model interactions.
 * Handles authentication, request formatting, and response parsing.
 */
export class OpenRouterClient {
  private readonly baseUrl = "https://openrouter.ai/api/v1";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey?: string, model = "x-ai/grok-4.1-fast:free") {
    // Try multiple sources for the API key (Cloudflare Pages environment variables)
    this.apiKey = apiKey ||
      (typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY) ||
      (typeof globalThis !== "undefined" && (globalThis as any).OPENROUTER_API_KEY) ||
      import.meta.env?.OPENROUTER_API_KEY as string;

    logger.info("OpenRouterClient initialization", {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      apiKeySource: apiKey ? "provided" :
        ((typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY) ? "process.env" :
        ((typeof globalThis !== "undefined" && (globalThis as any).OPENROUTER_API_KEY) ? "globalThis" : "import.meta.env")),
      model,
      hasProcess: typeof process !== "undefined",
      hasProcessEnv: typeof process !== "undefined" && !!process.env,
      hasGlobalThis: typeof globalThis !== "undefined",
      globalThisApiKey: typeof globalThis !== "undefined" ? ((globalThis as any).OPENROUTER_API_KEY ? "present" : "undefined") : "no-globalThis",
      providedApiKey: apiKey ? "yes" : "no",
      processEnvApiKey: typeof process !== "undefined" ? (process.env?.OPENROUTER_API_KEY ? "present" : "undefined") : "no-process",
      importMetaEnvApiKey: import.meta.env?.OPENROUTER_API_KEY ? "present" : "undefined",
    });

    if (!this.apiKey) {
      logger.error("OpenRouterClient initialization failed: API key not found", {
        checkedProcessEnv: typeof process !== "undefined" && !!process.env?.OPENROUTER_API_KEY,
        checkedImportMetaEnv: !!import.meta.env?.OPENROUTER_API_KEY,
      });
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    this.model = model;
  }

  /**
   * Makes a chat completion request to OpenRouter API.
   * @param messages - Array of chat messages
   * @param options - Additional request options
   * @returns Parsed OpenRouter response
   */
  async chatCompletion(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    options: {
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<OpenRouterResponse> {
    const {
      temperature = 0.1, // Low temperature for consistent, deterministic responses
      maxTokens = 500,
      timeoutMs = 10000, // 10 second timeout
    } = options;

    const requestBody = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }, // Force JSON response
    };

    logger.info("Making OpenRouter API request", {
      model: this.model,
      messageCount: messages.length,
      temperature,
      maxTokens,
      apiKeyPrefix: this.apiKey.substring(0, 8) + "...", // Log partial key for debugging
      requestUrl: `${this.baseUrl}/chat/completions`,
      userMessagePreview: messages.find(m => m.role === 'user')?.content.substring(0, 200) + "...",
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://10x-pulsereader.pages.dev", // Required by OpenRouter
          "X-Title": "PulseReader AI Analysis", // Required by OpenRouter
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const requestDuration = Date.now() - startTime;
      clearTimeout(timeoutId);

      logger.info("OpenRouter API response received", {
        status: response.status,
        statusText: response.statusText,
        durationMs: requestDuration,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("OpenRouter API error", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        // Handle rate limiting
        if (response.status === 429) {
          throw new Error("AI_RATE_LIMIT_EXCEEDED");
        }

        // Handle insufficient credits
        if (response.status === 402) {
          throw new Error("AI_INSUFFICIENT_CREDITS");
        }

        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      logger.debug("OpenRouter API raw response data", {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasUsage: !!data.usage,
        model: data.model,
        responseContentPreview: data.choices?.[0]?.message?.content?.substring(0, 200) + "...",
      });

      // Validate response structure
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        logger.error("Invalid OpenRouter response structure", {
          choices: data.choices,
          dataKeys: Object.keys(data),
        });
        throw new Error("Invalid OpenRouter response structure");
      }

      logger.info("OpenRouter API request successful", {
        usage: data.usage,
        model: data.model,
        responseTokens: data.usage?.total_tokens,
        contentLength: data.choices[0]?.message?.content?.length,
      });

      return data as OpenRouterResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error("OpenRouter API request timeout", { timeoutMs });
        throw new Error("AI_REQUEST_TIMEOUT");
      }

      // Re-throw known errors
      if (
        error instanceof Error &&
        (error.message === "AI_RATE_LIMIT_EXCEEDED" ||
          error.message === "AI_INSUFFICIENT_CREDITS" ||
          error.message === "AI_REQUEST_TIMEOUT")
      ) {
        throw error;
      }

      logger.error("OpenRouter API request failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error("AI_REQUEST_FAILED");
    }
  }

  /**
   * Tests the connection to OpenRouter API.
   * Makes a simple request to verify API key and connectivity.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.chatCompletion([{ role: "user", content: 'Respond with \'OK\' in JSON format: {"status": "OK"}' }], {
        maxTokens: 50,
        timeoutMs: 5000,
      });

      logger.info("OpenRouter API connection test successful");
      return true;
    } catch (error) {
      logger.error("OpenRouter API connection test failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
