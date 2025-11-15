import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ArticleService } from "../../../lib/services/article.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { CreateArticleCommandSchema } from "../../../lib/validation/article.schema.ts";

export const prerender = false;

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
