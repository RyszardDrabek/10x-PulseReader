import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Middleware to initialize Supabase client and extract user authentication context.
 * Sets context.locals.supabase and context.locals.user for use in API routes.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Extract token from Authorization header if present
  const authHeader = context.request.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Check if this is the service role key
    if (token === supabaseServiceKey) {
      // Service role bypasses auth - create a special client
      const serviceClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
      });
      context.locals.supabase = serviceClient;
      // Set a special user object to indicate service role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context.locals.user = { role: "service_role" } as any;
    } else {
      // Regular user token - create client and verify
      const anonKey = import.meta.env.SUPABASE_KEY;
      const userClient = createClient<Database>(supabaseUrl, anonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      const { data, error } = await userClient.auth.getUser();

      if (!error && data.user) {
        context.locals.supabase = userClient;
        context.locals.user = data.user;
      } else {
        // Invalid token
        const anonClient = createClient<Database>(supabaseUrl, anonKey);
        context.locals.supabase = anonClient;
        context.locals.user = null;
      }
    }
  } else {
    // No auth header - anonymous access
    const anonKey = import.meta.env.SUPABASE_KEY;
    const anonClient = createClient<Database>(supabaseUrl, anonKey);
    context.locals.supabase = anonClient;
    context.locals.user = null;
  }

  return next();
});
