import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "../db/database.types.ts";

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
  const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_KEY || import.meta.env.PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `Supabase environment variables are missing. SUPABASE_URL: ${!!supabaseUrl}, SUPABASE_KEY: ${!!supabaseKey}`
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
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
let supabaseClientPublicInstance: ReturnType<typeof import("@supabase/supabase-js").createClient<Database>> | null =
  null;

export const getSupabaseClientPublic = async () => {
  if (typeof window === "undefined") {
    throw new Error("Supabase client cannot be accessed during SSR");
  }

  if (!supabaseClientPublicInstance) {
    // Dynamic import to avoid loading on server
    const { createClient } = await import("@supabase/supabase-js");

    supabaseClientPublicInstance = createClient<Database>(
      import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_KEY || import.meta.env.SUPABASE_KEY
    );
  }

  return supabaseClientPublicInstance;
};
