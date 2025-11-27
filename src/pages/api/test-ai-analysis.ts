import type { APIRoute } from "astro";

import { AiAnalysisService } from "../../lib/services/ai-analysis.service.ts";
import { ArticleAnalysisService } from "../../lib/services/article-analysis.service.ts";
import { logger } from "../../lib/utils/logger.ts";

export const prerender = false;

/**
 * POST /api/test-ai-analysis
 * Test endpoint for AI analysis functionality.
 * This endpoint is for development/testing purposes only.
 *
 * @param request.body - { title: string, description?: string }
 * @returns Analysis result or error
 */
export const POST: APIRoute = async (context) => {
  try {
    const supabase = context.locals.supabase;

    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Database connection not available",
          code: "CONFIGURATION_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if OpenRouter API key is available
    const openRouterApiKey = (typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY) || import.meta.env?.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENROUTER_API_KEY not configured",
          code: "MISSING_API_KEY",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await context.request.json();
    const { title, description } = body;

    if (!title || typeof title !== "string") {
      return new Response(
        JSON.stringify({
          error: "Title is required and must be a string",
          code: "VALIDATION_ERROR",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    logger.info("Testing AI analysis", { title: title.substring(0, 100) });

    // Test AI analysis service
    const aiService = new AiAnalysisService();
    const articleAnalysisService = new ArticleAnalysisService(supabase, aiService);

    // Prepare article content for analysis
    const analysisInput = AiAnalysisService.prepareArticleForAnalysis(title, description);

    // Perform analysis
    const analysisResult = await aiService.analyzeArticle(analysisInput);

    // Test service health
    const serviceTest = await articleAnalysisService.testService();

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          sentiment: analysisResult.sentiment,
          topics: analysisResult.topics,
        },
        input: analysisInput,
        serviceHealth: serviceTest,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("AI analysis test failed", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        error: "AI analysis test failed",
        code: "ANALYSIS_ERROR",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
