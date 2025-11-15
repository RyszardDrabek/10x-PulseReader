import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ArticleService } from "../../../lib/services/article.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { GetArticlesQueryParamsSchema } from "../../../lib/validation/article-query.schema.ts";

export const prerender = false;

/**
 * GET /api/articles/get
 * Retrieves a paginated list of articles with optional filtering and personalization.
 *
 * Authentication: Optional (personalization requires authentication)
 *
 * @returns 200 OK with ArticleListResponse on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if personalization requested without authentication
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  try {
    // Extract query parameters from URL
    const url = new URL(context.request.url);
    const queryParams = {
      limit: url.searchParams.get("limit") || undefined,
      offset: url.searchParams.get("offset") || undefined,
      sentiment: url.searchParams.get("sentiment") || undefined,
      topicId: url.searchParams.get("topicId") || undefined,
      sourceId: url.searchParams.get("sourceId") || undefined,
      applyPersonalization: url.searchParams.get("applyPersonalization") || undefined,
      sortBy: url.searchParams.get("sortBy") || undefined,
      sortOrder: url.searchParams.get("sortOrder") || undefined,
    };

    // Validate query parameters with Zod
    let validatedParams;
    try {
      validatedParams = GetArticlesQueryParamsSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Query parameter validation failed", {
          endpoint: "GET /api/articles/get",
          errors: error.errors,
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    // Check authentication if personalization is requested
    if (validatedParams.applyPersonalization && !user) {
      logger.warn("Personalization requested without authentication", {
        endpoint: "GET /api/articles/get",
      });

      return new Response(
        JSON.stringify({
          error: "Authentication required for personalized filtering",
          code: "AUTHENTICATION_REQUIRED",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch articles using ArticleService
    const articleService = new ArticleService(supabase);
    const result = await articleService.getArticles(validatedParams, user?.id);

    // Log success
    logger.info("Articles fetched successfully", {
      endpoint: "GET /api/articles/get",
      resultCount: result.data.length,
      totalCount: result.pagination.total,
      filtersApplied: result.filtersApplied,
      userId: user?.id || "anonymous",
    });

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Profile not found error
      if (error.message === "PROFILE_NOT_FOUND") {
        logger.error("User profile not found", error, {
          endpoint: "GET /api/articles/get",
          userId: user?.id,
        });

        return new Response(
          JSON.stringify({
            error: "User profile not found. Please complete your profile setup.",
            code: "PROFILE_NOT_FOUND",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to fetch articles", error, {
      endpoint: "GET /api/articles/get",
      userId: user?.id || "anonymous",
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
