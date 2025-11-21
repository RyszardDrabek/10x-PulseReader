import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { RssSourceService } from "../../../lib/services/rss-source.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import {
  CreateRssSourceCommandSchema,
  GetRssSourcesQueryParamsSchema,
} from "../../../lib/validation/rss-source.schema.ts";

export const prerender = false;

/**
 * GET /api/rss-sources
 * Retrieves a paginated list of RSS sources.
 *
 * Authentication: Optional (public access)
 *
 * @returns 200 OK with RssSourceListResponse on success
 * @returns 400 Bad Request for validation errors
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "GET /api/rss-sources",
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
    };

    // Validate query parameters
    let validatedParams;
    try {
      validatedParams = GetRssSourcesQueryParamsSchema.parse(queryParams);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Query parameter validation failed", {
          endpoint: "GET /api/rss-sources",
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

    // Fetch RSS sources using service
    const rssSourceService = new RssSourceService(supabase);
    const result = await rssSourceService.getRssSources(validatedParams);

    // Log success
    logger.info("RSS sources fetched successfully", {
      endpoint: "GET /api/rss-sources",
      resultCount: result.data.length,
      totalCount: result.pagination.total,
    });

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to fetch RSS sources", error, {
      endpoint: "GET /api/rss-sources",
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
 * POST /api/rss-sources
 * Creates a new RSS source (service role only).
 *
 * Authentication: Required (service_role JWT token)
 *
 * @returns 201 Created with RssSourceDto on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if not authenticated or not service role
 * @returns 409 Conflict if RSS source with URL already exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "POST /api/rss-sources",
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
    logger.warn("POST /api/rss-sources called without authentication", {
      endpoint: "POST /api/rss-sources",
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
    logger.warn("POST /api/rss-sources called without service role", {
      endpoint: "POST /api/rss-sources",
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
          endpoint: "POST /api/rss-sources",
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
      command = CreateRssSourceCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request body validation failed", {
          endpoint: "POST /api/rss-sources",
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

    // Create RSS source using service
    const rssSourceService = new RssSourceService(supabase);
    const source = await rssSourceService.createRssSource(command);

    // Log success
    logger.info("RSS source created successfully", {
      endpoint: "POST /api/rss-sources",
      sourceId: source.id,
      userId: user.id,
    });

    // Return success response
    return new Response(JSON.stringify(source), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Duplicate URL error
      if (error.message === "DUPLICATE_URL") {
        logger.warn("RSS source creation failed: duplicate URL", {
          endpoint: "POST /api/rss-sources",
          userId: user.id,
        });

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
    logger.error("Failed to create RSS source", error, {
      endpoint: "POST /api/rss-sources",
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
