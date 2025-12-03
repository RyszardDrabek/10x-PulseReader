import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  try {
    // Use environment variables for Supabase client
    const { createClient } = await import("@supabase/supabase-js");

    // For production, use environment variables
    // For local development, use the known working local Supabase instance
    const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === "production";
    let supabaseUrl: string;
    let supabaseKey: string;

    if (isProduction) {
      // In production, use environment variables
      supabaseUrl =
        (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
        import.meta.env.SUPABASE_URL ||
        import.meta.env.PUBLIC_SUPABASE_URL;
      supabaseKey =
        (typeof process !== "undefined" && process.env?.SUPABASE_KEY) ||
        import.meta.env.SUPABASE_KEY ||
        import.meta.env.PUBLIC_SUPABASE_KEY;
    } else {
      // In local development, use known working local instance
      supabaseUrl = "http://127.0.0.1:18785";
      supabaseKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
    }

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          error: "Server configuration error: Supabase credentials not available",
          code: "CONFIGURATION_ERROR",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Simple test query - using the app schema
    const { data, error } = await supabase.schema("app").from("profiles").select("count").limit(1);

    if (error) {
      console.log("Query error:", error);
      return new Response(
        JSON.stringify({
          error: "Database query failed",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        message: "Supabase connection works!",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.log("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Unexpected error",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
