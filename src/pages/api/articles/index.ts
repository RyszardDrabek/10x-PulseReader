import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ArticleService } from "../../../lib/services/article.service.ts";
import { logger, createCloudflareLogger } from "../../../lib/utils/logger.ts";
import { GetArticlesQueryParamsSchema } from "../../../lib/validation/article-query.schema.ts";
import { CreateArticleCommandSchema } from "../../../lib/validation/article.schema.ts";

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
  // Use environment variables for Supabase client
  const { createClient } = await import("@supabase/supabase-js");

  // For production, use environment variables
  // For local development, use the known working local Supabase instance
  const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === "production";
  let supabaseUrl: string;
  let supabaseKey: string;

  if (isProduction) {
    // In production, use environment variables
    supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
    supabaseKey = import.meta.env.SUPABASE_KEY || import.meta.env.PUBLIC_SUPABASE_KEY;
  } else {
    // In local development, use known working local instance
    supabaseUrl = "http://127.0.0.1:18785";
    supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
  }

  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({
        error: "Server configuration error: Supabase credentials not available",
        code: "CONFIGURATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const user = context.locals.user;
  const cfLogger = createCloudflareLogger(context.request);

  cfLogger.trace("API_ARTICLES_GET_START");

  // Enhanced logging for debugging personalization
  console.log("[API_ARTICLES] Request details:", {
    method: context.request.method,
    url: context.request.url,
    userAgent: context.request.headers.get("User-Agent"),
    authorization: context.request.headers.get("Authorization") ? "[PRESENT]" : "[MISSING]",
    user: user ? { id: user.id, email: user.email, userType: typeof user } : null,
    userKeys: user ? Object.keys(user) : null,
    cookies: context.request.headers.get("Cookie") ? "[PRESENT]" : "[MISSING]",
    timestamp: new Date().toISOString(),
  });

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "GET /api/articles",
    });

    return new Response(
      JSON.stringify({
        error: "Server configuration error: Supabase client not available",
        code: "CONFIGURATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

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

    console.log("[API_ARTICLES] Parsed query parameters:", {
      queryParams,
      applyPersonalization: queryParams.applyPersonalization,
      applyPersonalizationType: typeof queryParams.applyPersonalization,
      userId: user?.id || null,
      isAuthenticated: !!user,
    });

    // Validate query parameters with Zod
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
      console.log("[API_ARTICLES] Personalization requested but no user authenticated:", {
        applyPersonalization: validatedParams.applyPersonalization,
        user: null,
      });
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

    console.log("[API_ARTICLES] About to call ArticleService.getArticles:", {
      validatedParams,
      applyPersonalization: validatedParams.applyPersonalization,
      userId: user?.id || null,
      userEmail: user?.email || null,
    });

    // Fetch articles using ArticleService
    const articleService = new ArticleService(supabase);
    const result = await articleService.getArticles(validatedParams, user?.id);

    // Log success
    cfLogger.trace("API_ARTICLES_GET_SUCCESS", {
      resultCount: result.data.length,
      totalCount: result.pagination.total,
      userId: user?.id || "anonymous",
    });

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
      headers: { "Content-Type": "application/json; charset=utf-8" },
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

    // Include error details in development mode for debugging
    const isDevelopment = import.meta.env.DEV;
    const errorDetails =
      isDevelopment && error instanceof Error ? { message: error.message, stack: error.stack } : undefined;

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        ...(errorDetails && { details: errorDetails }),
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
 * Creates a new article (service role only).
 * Used by the RSS fetching cron job to ingest articles from configured RSS sources.
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 201 Created with ArticleEntity on success
 * @returns 400 Bad Request for validation errors or invalid source/topics
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 409 Conflict if article link already exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "POST /api/articles",
    });

    return new Response(
      JSON.stringify({
        error: "Server configuration error: Supabase client not available",
        code: "CONFIGURATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check authentication
  if (!user) {
    logger.warn("POST /api/articles called without authentication", {
      endpoint: "POST /api/articles",
    });

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
    logger.warn("POST /api/articles called without service role", {
      endpoint: "POST /api/articles",
      userId: (user as { id?: string }).id,
    });

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

  let body: unknown;
  try {
    // Parse request body
    let rawBody: string;
    try {
      // Read request body
      rawBody = await context.request.text();

      // Check if body is empty
      if (!rawBody || rawBody.trim().length === 0) {
        logger.warn("Empty request body", {
          endpoint: "POST /api/articles",
        });
        return new Response(
          JSON.stringify({
            error: "Request body is required",
            code: "MISSING_BODY",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Try to parse as JSON
      body = JSON.parse(rawBody);
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn("Invalid JSON in request body", {
          endpoint: "POST /api/articles",
          error: error.message,
        });

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
      // Re-throw non-SyntaxError to be handled by outer catch
      throw error;
    }

    // Validate request body
    let command;
    try {
      command = CreateArticleCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request body validation failed", {
          endpoint: "POST /api/articles",
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

    // Create article using service
    const articleService = new ArticleService(supabase);
    const article = await articleService.createArticle(command);

    // Log success
    logger.info("Article created successfully", {
      endpoint: "POST /api/articles",
      articleId: article.id,
      sourceId: article.sourceId,
      link: article.link,
    });

    // Return created article
    return new Response(JSON.stringify(article), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // RSS source not found
      if (error.message === "RSS_SOURCE_NOT_FOUND") {
        logger.error("RSS source not found", error, {
          endpoint: "POST /api/articles",
        });

        return new Response(
          JSON.stringify({
            error: "RSS source not found",
            code: "RSS_SOURCE_NOT_FOUND",
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
        logger.error("Invalid topic IDs provided", error, {
          endpoint: "POST /api/articles",
          invalidIds,
        });

        return new Response(
          JSON.stringify({
            error: "One or more topic IDs are invalid",
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

      // Article already exists (duplicate link)
      if (error.message === "ARTICLE_ALREADY_EXISTS") {
        logger.warn("Attempted to create duplicate article", {
          endpoint: "POST /api/articles",
          link: (body as { link?: string })?.link,
        });

        return new Response(
          JSON.stringify({
            error: "Article with this link already exists",
            code: "ARTICLE_ALREADY_EXISTS",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Topic association failed
      if (error.message === "TOPIC_ASSOCIATION_FAILED") {
        logger.error("Failed to create topic associations", error, {
          endpoint: "POST /api/articles",
        });

        return new Response(
          JSON.stringify({
            error: "Failed to create topic associations",
            code: "TOPIC_ASSOCIATION_FAILED",
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
    logger.error("Failed to create article", error, {
      endpoint: "POST /api/articles",
    });

    // Include error details in development mode for debugging
    const isDevelopment = import.meta.env.DEV;
    const errorDetails =
      isDevelopment && error instanceof Error ? { message: error.message, stack: error.stack } : undefined;

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        ...(errorDetails && { details: errorDetails }),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
