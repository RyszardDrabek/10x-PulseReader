import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ProfileService } from "../../../lib/services/profile.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { CreateProfileCommandSchema, UpdateProfileCommandSchema } from "../../../lib/validation/profile.schema.ts";

export const prerender = false;

/**
 * GET /api/profile
 * Retrieves the authenticated user's profile.
 *
 * Authentication: Required
 *
 * @returns 200 OK with ProfileDto on success
 * @returns 401 Unauthorized if not authenticated
 * @returns 404 Not Found if profile doesn't exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  // Use environment variables for Supabase client
  const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === "production";
  let supabaseUrl: string;
  let supabaseKey: string;

  if (isProduction) {
    // In production (Cloudflare), use environment variables
    // Cloudflare Pages uses process.env for server-side environment variables
    supabaseUrl =
      (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
      import.meta.env.SUPABASE_URL ||
      import.meta.env.PUBLIC_SUPABASE_URL;

    supabaseKey =
      (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("[API_PROFILE] Production environment detected");
    console.log("[API_PROFILE] Environment check:", {
      hasProcess: typeof process !== "undefined",
      hasProcessEnv: typeof process !== "undefined" && !!process.env,
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      supabaseKeyLength: supabaseKey?.length || 0,
      processEnvKeys:
        typeof process !== "undefined" && process.env
          ? Object.keys(process.env).filter((k) => k.includes("SUPABASE"))
          : [],
      importMetaEnvKeys: Object.keys(import.meta.env).filter((k) => k.includes("SUPABASE")),
    });
  } else {
    // In local development, use known working local instance
    supabaseUrl = "http://127.0.0.1:18785";
    supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "GET /api/profile",
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
  if (!user || !user.id) {
    logger.warn("GET /api/profile called without authentication", {
      endpoint: "GET /api/profile",
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

  try {
    // Fetch profile using ProfileService
    const profileService = new ProfileService(supabase);
    const profile = await profileService.getProfile(user.id);

    if (!profile) {
      logger.info("Profile not found", {
        endpoint: "GET /api/profile",
        userId: user.id,
      });

      return new Response(
        JSON.stringify({
          error: "Profile not found",
          code: "PROFILE_NOT_FOUND",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log success
    logger.info("Profile fetched successfully", {
      endpoint: "GET /api/profile",
      userId: user.id,
      profileId: profile.id,
    });

    // Return success response
    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Generic error handling
    logger.error("Failed to fetch profile", error, {
      endpoint: "GET /api/profile",
      userId: user.id,
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
 * POST /api/profile
 * Creates a new profile for the authenticated user.
 *
 * Authentication: Required
 *
 * @returns 201 Created with ProfileDto on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if not authenticated
 * @returns 409 Conflict if profile already exists
 * @returns 500 Internal Server Error for unexpected errors
 */
export const POST: APIRoute = async (context) => {
  // Use environment variables for Supabase client
  const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === "production";
  let supabaseUrl: string;
  let supabaseKey: string;

  if (isProduction) {
    // In production (Cloudflare), use environment variables
    // Cloudflare Pages uses process.env for server-side environment variables
    supabaseUrl =
      (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
      import.meta.env.SUPABASE_URL ||
      import.meta.env.PUBLIC_SUPABASE_URL;

    supabaseKey =
      (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("[API_PROFILE] Production environment detected");
    console.log("[API_PROFILE] Environment check:", {
      hasProcess: typeof process !== "undefined",
      hasProcessEnv: typeof process !== "undefined" && !!process.env,
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      supabaseKeyLength: supabaseKey?.length || 0,
      processEnvKeys:
        typeof process !== "undefined" && process.env
          ? Object.keys(process.env).filter((k) => k.includes("SUPABASE"))
          : [],
      importMetaEnvKeys: Object.keys(import.meta.env).filter((k) => k.includes("SUPABASE")),
    });
  } else {
    // In local development, use known working local instance
    supabaseUrl = "http://127.0.0.1:18785";
    supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNmi43kdQwgnWNReilDMblYTn_I0";
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "POST /api/profile",
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
  if (!user || !user.id) {
    logger.warn("POST /api/profile called without authentication", {
      endpoint: "POST /api/profile",
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

  let body: unknown;
  try {
    // Parse request body
    try {
      body = await context.request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn("Invalid JSON in request body", {
          endpoint: "POST /api/profile",
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
      command = CreateProfileCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request body validation failed", {
          endpoint: "POST /api/profile",
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

    // Create profile using service
    const profileService = new ProfileService(supabase);
    const profile = await profileService.createProfile(user.id, command);

    // Log success
    logger.info("Profile created successfully", {
      endpoint: "POST /api/profile",
      userId: user.id,
      profileId: profile.id,
    });

    // Return created profile
    return new Response(JSON.stringify(profile), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Profile already exists
      if (error.message === "PROFILE_EXISTS") {
        logger.warn("Attempted to create duplicate profile", {
          endpoint: "POST /api/profile",
          userId: user.id,
        });

        return new Response(
          JSON.stringify({
            error: "Profile already exists for this user",
            code: "PROFILE_EXISTS",
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
    logger.error("Failed to create profile", error, {
      endpoint: "POST /api/profile",
      userId: user.id,
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
 * PATCH /api/profile
 * Updates the authenticated user's profile.
 * Supports partial updates (only provided fields are updated).
 *
 * Authentication: Required
 *
 * @returns 200 OK with updated ProfileDto on success
 * @returns 400 Bad Request for validation errors
 * @returns 401 Unauthorized if not authenticated
 * @returns 404 Not Found if profile doesn't exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const PATCH: APIRoute = async (context) => {
  // Always use service role key for API operations that need admin privileges
  // Hardcoded for testing - environment variables might not be loading properly
  const supabaseUrl = "http://127.0.0.1:18785";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "PATCH /api/profile",
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
  if (!user || !user.id) {
    logger.warn("PATCH /api/profile called without authentication", {
      endpoint: "PATCH /api/profile",
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

  let body: unknown;
  try {
    // Parse request body
    try {
      body = await context.request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn("Invalid JSON in request body", {
          endpoint: "PATCH /api/profile",
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
      command = UpdateProfileCommandSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Request body validation failed", {
          endpoint: "PATCH /api/profile",
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

    // Update profile using service
    const profileService = new ProfileService(supabase);

    const profile = await profileService.updateProfile(user.id, command);

    // Log success
    logger.info("Profile updated successfully", {
      endpoint: "PATCH /api/profile",
      userId: user.id,
      profileId: profile.id,
    });

    // Return updated profile
    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Profile not found
      if (error.message === "PROFILE_NOT_FOUND") {
        logger.info("Profile not found for update", {
          endpoint: "PATCH /api/profile",
          userId: user.id,
        });

        return new Response(
          JSON.stringify({
            error: "Profile not found",
            code: "PROFILE_NOT_FOUND",
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
    logger.error("Failed to update profile", error, {
      endpoint: "PATCH /api/profile",
      userId: user.id,
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
 * DELETE /api/profile
 * Deletes the authenticated user's profile.
 *
 * Authentication: Required
 *
 * @returns 204 No Content on success
 * @returns 401 Unauthorized if not authenticated
 * @returns 404 Not Found if profile doesn't exist
 * @returns 500 Internal Server Error for unexpected errors
 */
export const DELETE: APIRoute = async (context) => {
  // Always use service role key for API operations that need admin privileges
  // Hardcoded for testing - environment variables might not be loading properly
  const supabaseUrl = "http://127.0.0.1:18785";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const user = context.locals.user;

  // Validate Supabase client is available
  if (!supabase) {
    logger.error("Supabase client not initialized", {
      endpoint: "DELETE /api/profile",
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
  if (!user || !user.id) {
    logger.warn("DELETE /api/profile called without authentication", {
      endpoint: "DELETE /api/profile",
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

  try {
    // Delete profile using service
    const profileService = new ProfileService(supabase);
    await profileService.deleteProfile(user.id);

    // Log success
    logger.info("Profile deleted successfully", {
      endpoint: "DELETE /api/profile",
      userId: user.id,
    });

    // Return 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error) {
      // Profile not found
      if (error.message === "PROFILE_NOT_FOUND") {
        logger.info("Profile not found for deletion", {
          endpoint: "DELETE /api/profile",
          userId: user.id,
        });

        return new Response(
          JSON.stringify({
            error: "Profile not found",
            code: "PROFILE_NOT_FOUND",
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
    logger.error("Failed to delete profile", error, {
      endpoint: "DELETE /api/profile",
      userId: user.id,
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
