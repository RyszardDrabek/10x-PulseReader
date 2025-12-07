import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types.ts";

/**
 * Creates a Supabase client authenticated with the service role key.
 * Falls back to the local development credentials when not running in production.
 *
 * Throws if the required environment variables are not available.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === "production";

  let supabaseUrl: string | undefined;
  let supabaseServiceRoleKey: string | undefined;

  if (isProduction) {
    supabaseUrl =
      (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
      import.meta.env.SUPABASE_URL ||
      import.meta.env.PUBLIC_SUPABASE_URL;

    supabaseServiceRoleKey =
      (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    supabaseUrl = "http://127.0.0.1:18785";
    supabaseServiceRoleKey = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Service role Supabase configuration is missing.");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
