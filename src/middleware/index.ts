import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import { defineMiddleware } from "astro:middleware";
import type { Database } from "../db/database.types.ts";
import { createRequestLogger, createCloudflareLogger } from "../lib/utils/logger.ts";

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Main feed accessible to guests
  "/",
  // Server-Rendered Astro Pages
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
];

/**
 * Decodes a base64url string (used in JWT tokens).
 * Converts base64url to standard base64 before decoding.
 */
function decodeBase64Url(str: string): string {
  // Replace URL-safe characters with standard base64 characters
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }
  return atob(base64);
}

/**
 * Checks if a path matches a public path pattern.
 * Handles exact matches and dynamic route patterns.
 */
function isPublicPath(pathname: string, method: string): boolean {
  // Check exact matches first
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  // Check dynamic API routes
  // GET /api/articles/:id is publicly accessible
  if (method === "GET" && pathname.startsWith("/api/articles/")) {
    return true;
  }

  return false;
}

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const reqLogger = createRequestLogger(request);
  const cfLogger = createCloudflareLogger(request);

  // Critical trace point - highly visible in Functions tab
  cfLogger.trace("REQUEST_START", {
    method: request.method,
    path: url.pathname,
    search: url.search,
    userAgent: request.headers.get("User-Agent")?.substring(0, 100),
  });

  // Log incoming request
  reqLogger.info("Incoming request", {
    method: request.method,
    url: url.pathname + url.search,
  });

  // Always set up Supabase client for all routes (both public and protected)
  try {
    // Check for service role authentication first
    const authHeader = request.headers.get("Authorization");
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    // Debug logging for authorization header
    if (authHeader) {
      const headerPreview = authHeader.length > 20 ? authHeader.substring(0, 20) + "..." : authHeader;
      cfLogger.trace("AUTH_HEADER_PRESENT", { headerPreview, startsWithBearer: authHeader.startsWith("Bearer ") });
      reqLogger.debug("Authorization header present", {
        headerLength: authHeader.length,
        startsWithBearer: authHeader.startsWith("Bearer "),
      });
    } else {
      cfLogger.trace("AUTH_HEADER_MISSING");
      reqLogger.debug("No authorization header present");
    }

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Check if token matches service role key (direct comparison)
      if (serviceRoleKey && token === serviceRoleKey) {
        cfLogger.trace("AUTH_SERVICE_ROLE_SUCCESS");
        reqLogger.info("Service role authentication successful");
        const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;

        if (supabaseUrl) {
          // Create service role client using @supabase/supabase-js directly
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          locals.supabase = supabase;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          locals.user = { role: "service_role" } as any;

          // Skip auth check for public paths
          if (isPublicPath(url.pathname, request.method)) {
            return next();
          }

          // For API routes, let the route handler decide
          if (url.pathname.startsWith("/api/")) {
            return next();
          }

          return next();
        }
      } else {
        // Try to verify as JWT token (for API requests with Bearer tokens)
        const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
        const supabaseKey = import.meta.env.SUPABASE_KEY || import.meta.env.PUBLIC_SUPABASE_KEY;

        if (supabaseUrl && supabaseKey) {
          try {
            // First, decode JWT to check if it's a service_role token
            let isServiceRoleToken = false;
            let tokenPayload: { role?: string; exp?: number; iss?: string; ref?: string } | null = null;

            try {
              const tokenParts = token.split(".");
              if (tokenParts.length === 3) {
                tokenPayload = JSON.parse(decodeBase64Url(tokenParts[1]));
                isServiceRoleToken = tokenPayload.role === "service_role";

                // Check token expiration
                if (tokenPayload.exp) {
                  const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
                  if (Date.now() > expirationTime) {
                    cfLogger.trace("AUTH_JWT_EXPIRED");
                    reqLogger.debug("JWT token has expired");
                    throw new Error("Token expired");
                  }
                }

                // Verify issuer matches Supabase
                if (tokenPayload.iss && !tokenPayload.iss.includes("supabase")) {
                  cfLogger.trace("AUTH_JWT_INVALID_ISSUER");
                  reqLogger.debug("JWT token has invalid issuer");
                  throw new Error("Invalid token issuer");
                }
              }
            } catch (decodeError) {
              cfLogger.trace("AUTH_JWT_DECODE_ERROR", {
                error: decodeError instanceof Error ? decodeError.message : String(decodeError),
              });
              reqLogger.debug("Error decoding JWT token", { error: decodeError });
              // Fall through to try getUser() verification
            }

            // Handle service_role JWT tokens
            if (isServiceRoleToken && tokenPayload) {
              const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
              if (serviceRoleKey) {
                const { createClient } = await import("@supabase/supabase-js");
                const serviceSupabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
                  auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                  },
                });
                locals.supabase = serviceSupabase;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                locals.user = { role: "service_role" } as any;

                cfLogger.trace("AUTH_SERVICE_ROLE_JWT_SUCCESS");
                reqLogger.debug("Service role JWT token authenticated", {
                  ref: tokenPayload.ref,
                });

                // Skip auth check for public paths
                if (isPublicPath(url.pathname, request.method)) {
                  return next();
                }

                // For API routes, let the route handler decide
                if (url.pathname.startsWith("/api/")) {
                  return next();
                }

                return next();
              } else {
                cfLogger.trace("AUTH_SERVICE_ROLE_KEY_MISSING");
                reqLogger.warn("Service role JWT token detected but SUPABASE_SERVICE_ROLE_KEY is not configured");
                // Fall through to normal auth flow
              }
            } else {
              // Try to verify as regular user JWT token
              const { createClient } = await import("@supabase/supabase-js");
              const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false,
                },
              });

              // Verify the JWT token by calling getUser with the token
              const {
                data: { user },
                error: authError,
              } = await supabase.auth.getUser(token);

              if (user && !authError) {
                locals.supabase = supabase;
                locals.user = user;

                cfLogger.trace("AUTH_USER_SUCCESS", { userId: user.id });
                reqLogger.debug("User authenticated via Bearer token", {
                  userId: user.id,
                  userEmail: user.email,
                });

                // Skip auth check for public paths
                if (isPublicPath(url.pathname, request.method)) {
                  return next();
                }

                // For API routes, let the route handler decide
                if (url.pathname.startsWith("/api/")) {
                  return next();
                }

                // For protected routes, continue
                const result = await next();
                cfLogger.trace("REQUEST_COMPLETE");
                return result;
              } else {
                cfLogger.trace("AUTH_JWT_VERIFICATION_FAILED", {
                  error: authError?.message,
                });
                reqLogger.debug("JWT token verification failed", {
                  error: authError?.message,
                });
              }
            }
          } catch (jwtError) {
            cfLogger.trace("AUTH_JWT_ERROR", {
              error: jwtError instanceof Error ? jwtError.message : String(jwtError),
            });
            reqLogger.debug("Error verifying JWT token", { error: jwtError });
            // Fall through to normal auth flow
          }
        }
      }
    }

    // Normal authentication flow (cookie-based or no auth header)
    reqLogger.debug("Starting normal authentication flow");

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });
    locals.supabase = supabase;

    // IMPORTANT: Always get user session first before any other operations
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      locals.user = user;
      cfLogger.trace("AUTH_USER_SUCCESS", { userId: user.id });
      reqLogger.debug("User authenticated", {
        userId: user.id,
        userEmail: user.email,
      });
    } else {
      locals.user = null;
      cfLogger.trace("AUTH_USER_NONE");
      reqLogger.debug("User not authenticated");
    }

    // Skip auth check for public paths (but user is still set above if authenticated)
    if (isPublicPath(url.pathname, request.method)) {
      cfLogger.trace("ROUTE_PUBLIC", { isAuthenticated: !!user });
      reqLogger.debug("Accessing public path", {
        isAuthenticated: !!user,
      });
      return next();
    }

    // For API routes, let the route handler decide authentication/authorization
    // API routes return JSON errors instead of redirects
    if (url.pathname.startsWith("/api/")) {
      cfLogger.trace("ROUTE_API", { isAuthenticated: !!user });
      reqLogger.debug("API route access", {
        isAuthenticated: !!user,
      });
      return next();
    }

    // For protected non-API routes, redirect to login if not authenticated
    if (!user) {
      cfLogger.trace("ROUTE_REDIRECT_LOGIN");
      reqLogger.warn("Unauthenticated access to protected route, redirecting to login");
      return redirect("/login");
    }

    cfLogger.trace("ROUTE_AUTHENTICATED", { userId: user.id });
    reqLogger.debug("Authenticated access to protected route", {
      userId: user.id,
    });

    const result = await next();
    cfLogger.trace("REQUEST_COMPLETE");
    return result;
  } catch (error) {
    // If Supabase initialization fails, log error but continue
    // This allows the app to work even if Supabase is not configured
    const reqLogger = createRequestLogger(request);
    reqLogger.error("Middleware error during request processing", error);
    // Set supabase to null so pages can handle it gracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    locals.supabase = null as any;
    locals.user = null;

    // For public paths, allow access even if Supabase fails
    if (isPublicPath(url.pathname, request.method)) {
      reqLogger.warn("Supabase error but allowing access to public path");
      return next();
    }

    // For API routes, let the route handler decide (even if Supabase fails)
    if (url.pathname.startsWith("/api/")) {
      reqLogger.warn("Supabase error but allowing API route access");
      return next();
    }

    // For protected routes, redirect to login
    reqLogger.warn("Supabase error, redirecting protected route to login");
    return redirect("/login");
  }
});
