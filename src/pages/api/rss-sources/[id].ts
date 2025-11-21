import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { RssSourceService } from "../../../lib/services/rss-source.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { UpdateRssSourceCommandSchema, UuidParamSchema } from "../../../lib/validation/rss-source.schema.ts";

export const prerender = false;

/**
 * GET /api/rss-sources/:id
 * Retrieves a single RSS source by ID.
 *
 * Authentication: Optional (public access)
 *
 * @returns 200 OK with RssSourceDto on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 404 Not Found if RSS source does not exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const id = context.params.id;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "GET /api/rss-sources/:id",
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

  if (!id) {
    return new Response(
      JSON.stringify({
        error: "RSS source ID is required",
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
    let validatedId: string;
    try {
      validatedId = UuidParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Invalid UUID format in path parameter", {
          endpoint: "GET /api/rss-sources/:id",
          id,
        });

        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: "id",
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

    // Fetch RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    const source = await rssSourceService.getRssSourceById(validatedId);

    if (!source) {
      return new Response(
        JSON.stringify({
          error: "RSS source not found",
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
    logger.info("RSS source fetched successfully", {
      endpoint: "GET /api/rss-sources/:id",
      sourceId: source.id,
    });

    // Return success response
    return new Response(JSON.stringify(source), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to fetch RSS source", error, {
      endpoint: "GET /api/rss-sources/:id",
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
 * PATCH /api/rss-sources/:id
 * Updates an existing RSS source (service role only).
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 200 OK with updated RssSourceDto on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 404 Not Found if RSS source does not exist
 * @returns 409 Conflict if RSS source with URL already exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const PATCH: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;
  const id = context.params.id;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "PATCH /api/rss-sources/:id",
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

  if (!id) {
    return new Response(
      JSON.stringify({
        error: "RSS source ID is required",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check authentication
  if (!user) {
    logger.warn("PATCH /api/rss-sources/:id called without authentication", {
      endpoint: "PATCH /api/rss-sources/:id",
      id,
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
    logger.warn("PATCH /api/rss-sources/:id called without service role", {
      endpoint: "PATCH /api/rss-sources/:id",
      id,
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
    // Validate UUID format
    let validatedId: string;
    try {
      validatedId = UuidParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: "id",
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
      command = UpdateRssSourceCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
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

    // Update RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    const source = await rssSourceService.updateRssSource(validatedId, command);

    // Log success
    logger.info("RSS source updated successfully", {
      endpoint: "PATCH /api/rss-sources/:id",
      sourceId: source.id,
      userId: user.id,
    });

    // Return success response
    return new Response(JSON.stringify(source), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Not found error
      if (error.message === "NOT_FOUND") {
        return new Response(
          JSON.stringify({
            error: "RSS source not found",
            code: "NOT_FOUND",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Duplicate URL error
      if (error.message === "DUPLICATE_URL") {
        return new Response(
          JSON.stringify({
            error: "RSS source with this URL already exists",
            code: "DUPLICATE_URL",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Generic error handling
    logger.error("Failed to update RSS source", error, {
      endpoint: "PATCH /api/rss-sources/:id",
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

/**
 * DELETE /api/rss-sources/:id
 * Deletes an RSS source and all associated articles (service role only).
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 204 No Content on success
 * @returns 400 Bad Request for invalid UUID format
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 404 Not Found if RSS source does not exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;
  const id = context.params.id;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "DELETE /api/rss-sources/:id",
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

  if (!id) {
    return new Response(
      JSON.stringify({
        error: "RSS source ID is required",
        code: "VALIDATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check authentication
  if (!user) {
    logger.warn("DELETE /api/rss-sources/:id called without authentication", {
      endpoint: "DELETE /api/rss-sources/:id",
      id,
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
    logger.warn("DELETE /api/rss-sources/:id called without service role", {
      endpoint: "DELETE /api/rss-sources/:id",
      id,
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
    // Validate UUID format
    let validatedId: string;
    try {
      validatedId = UuidParamSchema.parse(id);
    } catch (error) {
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.errors.map((e) => ({
              field: "id",
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

    // Delete RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    await rssSourceService.deleteRssSource(validatedId);

    // Log success
    logger.info("RSS source deleted successfully", {
      endpoint: "DELETE /api/rss-sources/:id",
      sourceId: validatedId,
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
        return new Response(
          JSON.stringify({
            error: "RSS source not found",
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
    logger.error("Failed to delete RSS source", error, {
      endpoint: "DELETE /api/rss-sources/:id",
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
