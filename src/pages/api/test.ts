import type { APIRoute } from "astro";

export const GET: APIRoute = async (context) => {
  try {
    // Try to create a direct Supabase client with known working URLs
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient("http://127.0.0.1:18785", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");

    // Simple test query - using the app schema
    const { data, error } = await supabase
      .schema("app")
      .from("profiles")
      .select("count")
      .limit(1);

    if (error) {
      console.log("Query error:", error);
      return new Response(JSON.stringify({
        error: "Database query failed",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: data,
      message: "Supabase connection works!"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.log("Unexpected error:", error);
    return new Response(JSON.stringify({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
