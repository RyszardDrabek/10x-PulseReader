import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types.ts";

/* eslint-disable no-console */
console.log("[supabase.client.ts] Module loaded");
console.log("[supabase.client.ts] typeof window:", typeof window);
console.log("[supabase.client.ts] typeof global:", typeof global);

try {
  console.log("[supabase.client.ts] About to import @supabase/ssr");
  console.log("[supabase.client.ts] createServerClient:", typeof createServerClient);
  console.log("[supabase.client.ts] About to import @supabase/supabase-js");
  console.log("[supabase.client.ts] createClient:", typeof createClient);
} catch (error) {
  console.error("[supabase.client.ts] Error importing dependencies:", error);
  throw error;
}

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};

// Client-side Supabase client for React components
// Lazy-loaded to prevent SSR issues with window access
let supabaseClientPublicInstance: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseClientPublic = (): ReturnType<typeof createClient<Database>> => {
  console.log("[supabase.client.ts] getSupabaseClientPublic called");
  console.log("[supabase.client.ts] typeof window:", typeof window);
  console.log("[supabase.client.ts] supabaseClientPublicInstance:", supabaseClientPublicInstance);

  if (typeof window === "undefined") {
    console.error("[supabase.client.ts] Window is undefined - SSR detected");
    // During SSR, return a mock client that won't be used
    // The actual client will be created in the browser
    throw new Error("Supabase client cannot be accessed during SSR");
  }

  console.log("[supabase.client.ts] Window is defined, proceeding with client creation");

  if (!supabaseClientPublicInstance) {
    console.log("[supabase.client.ts] Creating new Supabase client instance");
    try {
      supabaseClientPublicInstance = createClient<Database>(
        import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY
      );
      console.log("[supabase.client.ts] Supabase client instance created successfully");
    } catch (error) {
      console.error("[supabase.client.ts] Error creating Supabase client:", error);
      throw error;
    }
  } else {
    console.log("[supabase.client.ts] Using existing Supabase client instance");
  }

  return supabaseClientPublicInstance;
};
/* eslint-enable no-console */
