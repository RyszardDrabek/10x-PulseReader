import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ArticleService } from "../../../lib/services/article.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { CreateArticleCommandSchema } from "../../../lib/validation/article.schema.ts";
import { GetArticlesQueryParamsSchema } from "../../../lib/validation/article-query.schema.ts";

export const prerender = false;

/**
 * GET /api/articles
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

    // Validate query parameters
    let validatedParams;
    try {
      validatedParams = GetArticlesQueryParamsSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Query parameter validation failed", {
          endpoint: "GET /api/articles",
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
        endpoint: "GET /api/articles",
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
      endpoint: "GET /api/articles",
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
          endpoint: "GET /api/articles",
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
      endpoint: "GET /api/articles",
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

/**
 * POST /api/articles
 * Creates a new article in the system.
 *
 * Authentication: Service role required
 * Used by: RSS fetching cron job
 *
 * @returns 201 Created with ArticleEntity on success
 * @returns 400 Bad Request for validation errors or invalid references
 * @returns 401 Unauthorized for authentication/authorization failures
 * @returns 409 Conflict for duplicate article links
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Check authentication
  if (!user) {
    return new Response(
      JSON.stringify({
        error: "Authentication required",
        code: "AUTHENTICATION_REQUIRED",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check authorization (service role only)
  if (user.role !== "service_role") {
    return new Response(
      JSON.stringify({
        error: "Service role required for this endpoint",
        code: "FORBIDDEN",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse request body
    const body = await context.request.json();

    // Validate request body with Zod schema
    const command = CreateArticleCommandSchema.parse(body);

    // Create article using service
    const articleService = new ArticleService(supabase);
    const article = await articleService.createArticle(command);

    // Log successful creation
    logger.info("Article created successfully", {
      articleId: article.id,
      sourceId: command.sourceId,
      link: command.link,
    });

    // Return created article
    return new Response(JSON.stringify(article), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Error creating article", error, {
      endpoint: "POST /api/articles",
    });

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      logger.warn("Invalid JSON in request body", { endpoint: "POST /api/articles" });
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle validation errors from Zod
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
          timestamp: new Date().toISOString(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle business logic errors from ArticleService
    if (error instanceof Error) {
      // RSS source not found
      if (error.message === "RSS_SOURCE_NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "RSS source not found",
            code: "INVALID_SOURCE_ID",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Invalid topic IDs
      if (error.message.startsWith("INVALID_TOPIC_IDS:")) {
        const invalidIds = JSON.parse(error.message.split(":")[1]);
        return new Response(
          JSON.stringify({
            error: "One or more topics not found",
            code: "INVALID_TOPIC_IDS",
            details: { invalidIds },
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Duplicate article link (409 Conflict)
      if (error.message === "ARTICLE_ALREADY_EXISTS") {
        logger.info("Duplicate article detected", {
          endpoint: "POST /api/articles",
          errorCode: "CONFLICT",
        });
        return new Response(
          JSON.stringify({
            error: "Article with this link already exists",
            code: "CONFLICT",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Topic association failed (rollback occurred)
      if (error.message === "TOPIC_ASSOCIATION_FAILED") {
        logger.error("Topic association failed after article creation", error, {
          endpoint: "POST /api/articles",
        });
        return new Response(
          JSON.stringify({
            error: "An unexpected error occurred",
            code: "INTERNAL_ERROR",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic server error for unexpected errors
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
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
