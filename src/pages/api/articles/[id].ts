import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ArticleService } from "../../../lib/services/article.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { UpdateArticleCommandSchema, UuidParamSchema } from "../../../lib/validation/article.schema.ts";

export const prerender = false;

/**
 * GET /api/articles/:id
 * Retrieves a single article by ID (public access).
 *
 * Authentication: Optional (public access)
 *
 * @returns 200 OK with ArticleDto on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 404 Not Found if article doesn't exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "GET /api/articles/:id",
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
    // Extract and validate path parameter
    const id = context.params.id;
    if (!id) {
      logger.warn("Missing article ID in path", {
        endpoint: "GET /api/articles/:id",
      });

      return new Response(
        JSON.stringify({
          error: "Article ID is required",
          code: "MISSING_PARAMETER",
          timestamp: new Date().toISOString(),
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
        logger.warn("Path parameter validation failed", {
          endpoint: "GET /api/articles/:id",
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

    // Fetch article using service
    const articleService = new ArticleService(supabase);
    const article = await articleService.getArticleById(validatedParams.id);

    // Log success
    logger.info("Article fetched successfully", {
      endpoint: "GET /api/articles/:id",
      articleId: article.id,
    });

    // Return success response
    return new Response(JSON.stringify(article), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Article not found
      if (error.message === "ARTICLE_NOT_FOUND") {
        logger.info("Article not found", {
          endpoint: "GET /api/articles/:id",
          articleId: context.params.id,
        });

        return new Response(
          JSON.stringify({
            error: "Article not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to fetch article", error, {
      endpoint: "GET /api/articles/:id",
      articleId: context.params.id,
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
 * PATCH /api/articles/:id
 * Updates an article (service role only).
 * Used by the AI analysis job to update sentiment and topic associations.
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 200 OK with updated ArticleEntity on success
 * @returns 400 Bad Request for validation errors or invalid topics
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 404 Not Found if article doesn't exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const PATCH: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "PATCH /api/articles/:id",
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
    logger.warn("PATCH /api/articles/:id called without authentication", {
      endpoint: "PATCH /api/articles/:id",
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
    logger.warn("PATCH /api/articles/:id called without service role", {
      endpoint: "PATCH /api/articles/:id",
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

  try {
    // Extract and validate path parameter
    const id = context.params.id;
    if (!id) {
      logger.warn("Missing article ID in path", {
        endpoint: "PATCH /api/articles/:id",
      });

      return new Response(
        JSON.stringify({
          error: "Article ID is required",
          code: "MISSING_PARAMETER",
          timestamp: new Date().toISOString(),
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
        logger.warn("Path parameter validation failed", {
          endpoint: "PATCH /api/articles/:id",
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

    // Parse request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn("Invalid JSON in request body", {
          endpoint: "PATCH /api/articles/:id",
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
      throw error;
    }

    // Validate request body
    let command;
    try {
      command = UpdateArticleCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request body validation failed", {
          endpoint: "PATCH /api/articles/:id",
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

    // Update article using service
    const articleService = new ArticleService(supabase);
    const article = await articleService.updateArticle(validatedParams.id, command);

    // Log success
    logger.info("Article updated successfully", {
      endpoint: "PATCH /api/articles/:id",
      articleId: article.id,
    });

    // Return updated article
    return new Response(JSON.stringify(article), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Article not found
      if (error.message === "ARTICLE_NOT_FOUND") {
        logger.info("Article not found for update", {
          endpoint: "PATCH /api/articles/:id",
          articleId: context.params.id,
        });

        return new Response(
          JSON.stringify({
            error: "Article not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Invalid topic IDs
      if (error.message.startsWith("INVALID_TOPIC_IDS:")) {
        const invalidIds = JSON.parse(error.message.split(":")[1]);
        logger.error("Invalid topic IDs provided", error, {
          endpoint: "PATCH /api/articles/:id",
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

      // Topic association failed
      if (error.message === "TOPIC_ASSOCIATION_FAILED") {
        logger.error("Failed to update topic associations", error, {
          endpoint: "PATCH /api/articles/:id",
        });

        return new Response(
          JSON.stringify({
            error: "Failed to update topic associations",
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
    logger.error("Failed to update article", error, {
      endpoint: "PATCH /api/articles/:id",
      articleId: context.params.id,
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
 * DELETE /api/articles/:id
 * Deletes an article (service role only).
 * Used by the retention policy cron job to remove old articles.
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 204 No Content on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 404 Not Found if article doesn't exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "DELETE /api/articles/:id",
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
    logger.warn("DELETE /api/articles/:id called without authentication", {
      endpoint: "DELETE /api/articles/:id",
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
    logger.warn("DELETE /api/articles/:id called without service role", {
      endpoint: "DELETE /api/articles/:id",
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

  try {
    // Extract and validate path parameter
    const id = context.params.id;
    if (!id) {
      logger.warn("Missing article ID in path", {
        endpoint: "DELETE /api/articles/:id",
      });

      return new Response(
        JSON.stringify({
          error: "Article ID is required",
          code: "MISSING_PARAMETER",
          timestamp: new Date().toISOString(),
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
        logger.warn("Path parameter validation failed", {
          endpoint: "DELETE /api/articles/:id",
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

    // Delete article using service
    const articleService = new ArticleService(supabase);
    await articleService.deleteArticle(validatedParams.id);

    // Log success
    logger.info("Article deleted successfully", {
      endpoint: "DELETE /api/articles/:id",
      articleId: validatedParams.id,
    });

    // Return 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Article not found
      if (error.message === "ARTICLE_NOT_FOUND") {
        logger.info("Article not found for deletion", {
          endpoint: "DELETE /api/articles/:id",
          articleId: context.params.id,
        });

        return new Response(
          JSON.stringify({
            error: "Article not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to delete article", error, {
      endpoint: "DELETE /api/articles/:id",
      articleId: context.params.id,
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
