import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

/**
 * Middleware to initialize Supabase client and extract user authentication context.
 * Sets context.locals.supabase and context.locals.user for use in API routes.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase client
  context.locals.supabase = supabaseClient;

  // Extract user from Authorization header if present
  const authHeader = context.request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Get user from token
    const { data, error } = await supabaseClient.auth.getUser(token);

    if (!error && data.user) {
      context.locals.user = data.user;
    } else {
      context.locals.user = null;
    }
  } else {
    context.locals.user = null;
  }

  return next();
});
