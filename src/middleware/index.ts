import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import { defineMiddleware } from "astro:middleware";

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
  // Articles API endpoint (accessible to guests)
  "/api/articles",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Always set up Supabase client for all routes (both public and protected)
  try {
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
    } else {
      locals.user = null;
    }

    // Skip auth check for public paths (but user is still set above if authenticated)
    if (PUBLIC_PATHS.includes(url.pathname)) {
      return next();
    }

    // For protected routes, redirect to login if not authenticated
    if (!user) {
      return redirect("/login");
    }

    return next();
  } catch (error) {
    // If Supabase initialization fails, log error but continue
    // This allows the app to work even if Supabase is not configured
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    // eslint-disable-next-line no-console
    console.error("[Middleware] Supabase initialization error:", errorMessage);
    if (errorStack) {
      // eslint-disable-next-line no-console
      console.error("[Middleware] Error stack:", errorStack);
    }
    // Set supabase to null so pages can handle it gracefully
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    locals.supabase = null as any;
    locals.user = null;

    // For public paths, allow access even if Supabase fails
    if (PUBLIC_PATHS.includes(url.pathname)) {
      return next();
    }

    // For protected routes, redirect to login
    return redirect("/login");
  }
});
