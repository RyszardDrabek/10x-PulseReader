import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { TopicService } from "../../../lib/services/topic.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { TopicIdParamSchema } from "../../../lib/validation/topic.schema.ts";

export const prerender = false;

/**
 * GET /api/topics/:id
 * Retrieves a single topic by ID.
 *
 * Authentication: Optional (public access)
 *
 * @returns 200 OK with TopicDto on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 404 Not Found if topic does not exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const id = context.params.id;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "GET /api/topics/:id",
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

  // Validate ID parameter
  if (!id) {
    logger.warn("Missing id parameter", {
      endpoint: "GET /api/topics/:id",
    });

    return new Response(
      JSON.stringify({
        error: "Topic ID is required",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Validate UUID format
    let validatedId;
    try {
      validatedId = TopicIdParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Invalid UUID format", {
          endpoint: "GET /api/topics/:id",
          id,
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

    // Fetch topic using service
    const topicService = new TopicService(supabase);
    const topic = await topicService.findById(validatedId);

    if (!topic) {
      logger.info("Topic not found", {
        endpoint: "GET /api/topics/:id",
        topicId: validatedId,
      });

      return new Response(
        JSON.stringify({
          error: "Topic does not exist",
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log success
    logger.info("Topic fetched successfully", {
      endpoint: "GET /api/topics/:id",
      topicId: validatedId,
    });

    // Return success response
    return new Response(JSON.stringify(topic), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to fetch topic", error, {
      endpoint: "GET /api/topics/:id",
      id,
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
 * DELETE /api/topics/:id
 * Deletes a topic by ID (service role only).
 * Database CASCADE automatically removes all article-topic associations.
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 204 No Content on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 404 Not Found if topic does not exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;
  const id = context.params.id;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "DELETE /api/topics/:id",
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
    logger.warn("DELETE /api/topics/:id called without authentication", {
      endpoint: "DELETE /api/topics/:id",
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
    logger.warn("DELETE /api/topics/:id called without service role", {
      endpoint: "DELETE /api/topics/:id",
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

  // Validate ID parameter
  if (!id) {
    logger.warn("Missing id parameter", {
      endpoint: "DELETE /api/topics/:id",
      userId: user.id,
    });

    return new Response(
      JSON.stringify({
        error: "Topic ID is required",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Validate UUID format
    let validatedId;
    try {
      validatedId = TopicIdParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Invalid UUID format", {
          endpoint: "DELETE /api/topics/:id",
          id,
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

    // Delete topic using service
    const topicService = new TopicService(supabase);
    await topicService.deleteTopic(validatedId);

    // Log success
    logger.info("Topic deleted successfully", {
      endpoint: "DELETE /api/topics/:id",
      topicId: validatedId,
      userId: user.id,
    });

    // Return success response (204 No Content)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Not found error
      if (error.message === "NOT_FOUND") {
        logger.warn("Topic deletion failed: topic not found", {
          endpoint: "DELETE /api/topics/:id",
          topicId: id,
          userId: user.id,
        });

        return new Response(
          JSON.stringify({
            error: "Topic does not exist",
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
    logger.error("Failed to delete topic", error, {
      endpoint: "DELETE /api/topics/:id",
      id,
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
