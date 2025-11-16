import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

// Lazy initialization to avoid hydration errors
let _supabaseClient: SupabaseClient<Database> | null = null;
let _supabaseClientPublic: SupabaseClient<Database> | null = null;

// Server-side client (for API routes and server-side rendering)
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabaseClient) {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables");
    }

    _supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _supabaseClient;
}

// Client-side client (for React components) - uses PUBLIC_ prefixed env vars
export function getSupabaseClientPublic(): SupabaseClient<Database> {
  if (!_supabaseClientPublic) {
    const publicSupabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const publicSupabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

    if (!publicSupabaseUrl || !publicSupabaseAnonKey) {
      throw new Error("Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_KEY environment variables for client-side usage");
    }

    _supabaseClientPublic = createClient<Database>(publicSupabaseUrl, publicSupabaseAnonKey);
  }
  return _supabaseClientPublic;
}

// Direct export for server-side use (Astro pages, API routes)
// Only initialize when actually accessed to avoid client-side errors
export const supabaseClient = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient<Database>];
  },
});

// Export for client-side use (React components)
export const supabaseClientPublic = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    return getSupabaseClientPublic()[prop as keyof SupabaseClient<Database>];
  },
});
