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

  constructor(apiKey?: string, model?: string) {
    // Allow override via env; fall back to a currently-free model
    this.model =
      model ||
      (typeof process !== "undefined" && process.env?.OPENROUTER_MODEL) ||
      (import.meta.env?.OPENROUTER_MODEL as string) ||
      "tngtech/deepseek-r1t2-chimera:free";

    // Try to resolve API key immediately, but don't fail if not found (Cloudflare runtime)
    this.apiKey = apiKey || this.resolveApiKey();

    logger.info("OpenRouterClient initialized", {
      model,
      hasProvidedApiKey: !!apiKey,
      apiKeyResolved: !!this.apiKey,
    });
  }

  /**
   * Resolve API key from multiple sources (called at runtime)
   */
  private resolveApiKey(): string | undefined {
    // Try multiple sources for the API key (Cloudflare Pages environment variables)
    const resolvedKey =
      (typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY) ||
      (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).OPENROUTER_API_KEY) ||
      (typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).OPENROUTER_API_KEY_new) ||
      (typeof globalThis !== "undefined" &&
        (globalThis as { __env__?: Record<string, string> }).__env__?.OPENROUTER_API_KEY) || // Try __env__
      (typeof globalThis !== "undefined" &&
        (globalThis as { platform?: { env?: Record<string, string> } }).platform?.env?.OPENROUTER_API_KEY) || // Try platform.env
      (import.meta.env?.OPENROUTER_API_KEY as string);

    logger.info("OpenRouter API key resolution attempt", {
      resolved: !!resolvedKey,
      source:
        typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY
          ? "process.env"
          : typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).OPENROUTER_API_KEY
            ? "globalThis"
            : typeof globalThis !== "undefined" && (globalThis as Record<string, unknown>).OPENROUTER_API_KEY_new
              ? "globalThis_alt"
              : typeof globalThis !== "undefined" &&
                  (globalThis as { __env__?: Record<string, string> }).__env__?.OPENROUTER_API_KEY
                ? "__env__"
                : typeof globalThis !== "undefined" &&
                    (globalThis as { platform?: { env?: Record<string, string> } }).platform?.env?.OPENROUTER_API_KEY
                  ? "platform.env"
                  : "import.meta.env",
      hasProcess: typeof process !== "undefined",
      hasProcessEnv: typeof process !== "undefined" && !!process.env,
      hasGlobalThis: typeof globalThis !== "undefined",
      processEnvKeys:
        typeof process !== "undefined" && process.env
          ? Object.keys(process.env).filter((k) => k.includes("OPENROUTER"))
          : [],
      globalThisKeys:
        typeof globalThis !== "undefined"
          ? Object.keys(globalThis)
              .filter((k) => k.includes("OPENROUTER"))
              .slice(0, 10)
          : [], // Limit output
      globalThisAlt:
        typeof globalThis !== "undefined"
          ? (globalThis as Record<string, unknown>).OPENROUTER_API_KEY_new
            ? "present"
            : "undefined"
          : "no-globalThis",
      importMetaEnvKeys: Object.keys(import.meta.env).filter((k) => k.includes("OPENROUTER")),
      // Check all possible environment access patterns
      processEnvAllKeys: typeof process !== "undefined" && process.env ? Object.keys(process.env) : [],
      globalThisAllKeys: typeof globalThis !== "undefined" ? Object.keys(globalThis).slice(0, 20) : [],
      envGlobal:
        typeof globalThis !== "undefined" && (globalThis as { __env__?: Record<string, string> }).__env__
          ? Object.keys((globalThis as { __env__?: Record<string, string> }).__env__)
          : "no-__env__",
      platformEnv:
        typeof globalThis !== "undefined" &&
        (globalThis as { platform?: { env?: Record<string, string> } }).platform?.env
          ? Object.keys((globalThis as { platform?: { env?: Record<string, string> } }).platform?.env || {})
          : "no-platform",
      resolvedKeyPrefix: resolvedKey ? resolvedKey.substring(0, 12) + "..." : "none",
    });

    return resolvedKey;
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
    // Ensure API key is resolved (for Cloudflare Pages runtime)
    if (!this.apiKey) {
      this.apiKey = this.resolveApiKey();
    }

    if (!this.apiKey) {
      logger.error("OpenRouter API key not available at request time");
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

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
      userMessagePreview: messages.find((m) => m.role === "user")?.content.substring(0, 200) + "...",
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const startTime = Date.now();
      logger.info("About to make fetch request", {
        url: `${this.baseUrl}/chat/completions`,
        hasApiKey: !!this.apiKey,
        requestBodySize: JSON.stringify(requestBody).length,
        timeoutMs,
      });

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
          errorTextLength: errorText.length,
          errorTextPreview: errorText.substring(0, 500),
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
