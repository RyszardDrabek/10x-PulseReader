import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseServerInstance({
      cookies: new Map(),
      headers: request.headers,
    });

    // Try to create the user (this will fail if user already exists, which is fine)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error && !error.message.includes("already registered")) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure a profile exists for this user
    if (data?.user?.id) {
      try {
        const profileService = new (await import("../../../lib/services/profile.service.ts")).ProfileService(supabase);
        const existingProfile = await profileService.getProfile(data.user.id).catch(() => null);

        if (!existingProfile) {
          await profileService.createProfile(data.user.id, {
            mood: null,
            blocklist: [],
            personalizationEnabled: true,
          });
        }
      } catch (profileError) {
        console.error("Failed to create profile:", profileError);
      }
    }

    return new Response(JSON.stringify({ success: true, userId: data?.user?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ensure user error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
