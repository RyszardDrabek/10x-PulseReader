import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { TopicService } from "../../../lib/services/topic.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { GetTopicsQueryParamsSchema, CreateTopicCommandSchema } from "../../../lib/validation/topic.schema.ts";

export const prerender = false;

/**
 * GET /api/topics
 * Retrieves a paginated list of topics with optional search.
 *
 * Authentication: Optional (public access)
 *
 * @returns 200 OK with TopicListResponse on success
 * @returns 400 Bad Request for validation errors
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "GET /api/topics",
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
      search: url.searchParams.get("search") || undefined,
    };

    // Validate query parameters
    let validatedParams;
    try {
      validatedParams = GetTopicsQueryParamsSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Query parameter validation failed", {
          endpoint: "GET /api/topics",
          errors: error.errors,
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            code: "VALIDATION_ERROR",
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

    // Fetch topics using service
    const topicService = new TopicService(supabase);
    const result = await topicService.findAll(validatedParams);

    // Log success
    logger.info("Topics fetched successfully", {
      endpoint: "GET /api/topics",
      resultCount: result.data.length,
      totalCount: result.pagination.total,
      hasSearch: !!validatedParams.search,
    });

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to fetch topics", error, {
      endpoint: "GET /api/topics",
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
 * POST /api/topics
 * Creates a new topic or returns existing topic if name already exists (case-insensitive).
 * Implements upsert behavior for idempotent topic creation (service role only).
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 200 OK with TopicDto if topic already exists
 * @returns 201 Created with TopicDto if new topic created
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "POST /api/topics",
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
    logger.warn("POST /api/topics called without authentication", {
      endpoint: "POST /api/topics",
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
    logger.warn("POST /api/topics called without service role", {
      endpoint: "POST /api/topics",
      userId: user.id,
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
    // Parse request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn("Invalid JSON in request body", {
          endpoint: "POST /api/topics",
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
      command = CreateTopicCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request body validation failed", {
          endpoint: "POST /api/topics",
          userId: user.id,
          errors: error.errors,
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            code: "VALIDATION_ERROR",
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

    // Create or find topic using service
    const topicService = new TopicService(supabase);
    const { topic, created } = await topicService.createOrFindTopic(command);

    // Log success
    logger.info("Topic created or found successfully", {
      endpoint: "POST /api/topics",
      topicId: topic.id,
      topicName: topic.name,
      created,
      userId: user.id,
    });

    // Return success response (200 if existing, 201 if created)
    return new Response(JSON.stringify(topic), {
      status: created ? 201 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to create topic", error, {
      endpoint: "POST /api/topics",
      userId: user.id,
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
