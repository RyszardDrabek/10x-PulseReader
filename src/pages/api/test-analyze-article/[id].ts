import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ArticleAnalysisService } from "../../../lib/services/article-analysis.service.ts";
import { ArticleService } from "../../../lib/services/article.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { UuidParamSchema } from "../../../lib/validation/article.schema.ts";

export const prerender = false;

/**
 * POST /api/test-analyze-article/:id
 * Test endpoint for AI analysis on existing articles.
 * This endpoint is for development/testing purposes only.
 *
 * @param path.id - Article UUID
 * @returns Analysis result or error
 */
export const POST: APIRoute = async (context) => {
  try {
    // For testing purposes, create a direct supabase client with service role
    // This bypasses the middleware authentication for development testing
    const { createClient } = await import("@supabase/supabase-js");
    const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === "production";
    const supabaseUrl = isProduction
      ? (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
        import.meta.env.SUPABASE_URL ||
        import.meta.env.PUBLIC_SUPABASE_URL
      : import.meta.env.SUPABASE_URL;
    const supabaseKey = isProduction
      ? (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
        import.meta.env.SUPABASE_SERVICE_ROLE_KEY
      : import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Check if OpenRouter API key is available in header
    const openRouterApiKey =
      context.request.headers.get("X-OpenRouter-API-Key") || context.request.headers.get("x-openrouter-api-key");

    if (!openRouterApiKey) {
      return new Response(
        JSON.stringify({
          error: "X-OpenRouter-API-Key header is required",
          code: "MISSING_API_KEY",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Extract and validate path parameter
    const id = context.params.id;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: "Article ID is required",
          code: "MISSING_PARAMETER",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate UUID format
    let validatedParams;
    try {
      validatedParams = UuidParamSchema.parse({ id });
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    logger.info("Testing AI analysis on existing article", { articleId: validatedParams.id });

    // Get the article first
    const articleService = new ArticleService(supabase);
    const article = await articleService.getArticleById(validatedParams.id);

    // Initialize AI analysis service
    const articleAnalysisService = new ArticleAnalysisService(supabase, undefined, openRouterApiKey);

    // Analyze the article
    const analysisResult = await articleAnalysisService.analyzeAndUpdateArticle({
      id: article.id,
      sourceId: article.source.id,
      title: article.title,
      description: article.description,
      link: article.link,
      publicationDate: new Date(article.publicationDate),
      sentiment: article.sentiment,
      createdAt: new Date(article.createdAt),
      updatedAt: new Date(article.updatedAt),
    });

    // Fetch the updated article to show the results
    const updatedArticle = await articleService.getArticleById(validatedParams.id);

    return new Response(
      JSON.stringify({
        success: true,
        analysisResult,
        article: {
          id: updatedArticle.id,
          title: updatedArticle.title,
          sentiment: updatedArticle.sentiment,
          topics: updatedArticle.topics,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("AI analysis test on existing article failed", error);

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
