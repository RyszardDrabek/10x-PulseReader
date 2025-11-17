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
    locals.user = {
      email: user.email,
      id: user.id,
    };
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
});
