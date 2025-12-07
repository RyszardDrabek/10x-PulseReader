import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { ProfileService } from "../../../lib/services/profile.service.ts";
import { createServiceRoleClient } from "../../../lib/utils/supabase.server.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      // Handle specific Supabase auth errors
      let errorMessage = "Registration failed";
      const statusCode = 400;

      switch (error.message) {
        case "User already registered":
          errorMessage = "An account with this email already exists.";
          break;
        case "Password should be at least 6 characters":
          errorMessage = "Password must be at least 6 characters long.";
          break;
        case "Invalid email":
          errorMessage = "Please enter a valid email address.";
          break;
        default:
          errorMessage = "Something went wrong. Please try again.";
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Auto-create default profile for the new user (best-effort)
    if (data.user?.id) {
      try {
        const serviceSupabase = createServiceRoleClient();
        const profileService = new ProfileService(serviceSupabase);
        await profileService.createProfile(data.user.id, {
          mood: null,
          blocklist: [],
          personalizationEnabled: true,
        });
      } catch (profileError) {
        // eslint-disable-next-line no-console
        console.warn("[API_AUTH_REGISTER] Failed to auto-create profile:", profileError);
      }
    }

    return new Response(
      JSON.stringify({
        user: data.user,
        session: data.session,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Registration API error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
