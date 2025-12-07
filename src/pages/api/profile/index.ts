import type { APIRoute } from "astro";
import { ZodError } from "zod";

import { ProfileService } from "../../../lib/services/profile.service.ts";
import { logger } from "../../../lib/utils/logger.ts";
import { createServiceRoleClient } from "../../../lib/utils/supabase.server.ts";
import { CreateProfileCommandSchema, UpdateProfileCommandSchema } from "../../../lib/validation/profile.schema.ts";

export const prerender = false;

/**
 * GET /api/profile
 * Retrieves the authenticated user's profile.
 * If no profile exists, a default one is automatically created and returned.
 *
 * Authentication: Required
 *
 * @returns 200 OK with ProfileDto on success
 * @returns 401 Unauthorized if not authenticated
 * @returns 500 Internal Server Error for unexpected errors
 */
export const GET: APIRoute = async (context) => {
  const supabase = createServiceRoleClient();

  const user = context.locals.user;

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
      // Auto-create default profile when missing (idempotent on first call)
      const defaultProfileCommand = CreateProfileCommandSchema.parse({});
      const createdProfile = await profileService.createProfile(user.id, defaultProfileCommand);

      logger.info("Profile auto-created on first access", {
        endpoint: "GET /api/profile",
        userId: user.id,
        profileId: createdProfile.id,
      });

      return new Response(JSON.stringify(createdProfile), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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
  const supabase = createServiceRoleClient();

  const user = context.locals.user;

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
  const supabase = createServiceRoleClient();

  const user = context.locals.user;

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
  const supabase = createServiceRoleClient();

  const user = context.locals.user;

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
