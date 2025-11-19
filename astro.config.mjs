// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Bundle @supabase/ssr for Cloudflare compatibility
      // Keep @supabase/supabase-js external as it's used client-side
      external: ["@supabase/supabase-js"],
      noExternal: ["@supabase/auth-helpers-shared", "@supabase/ssr"],
    },
  },
  adapter: cloudflare(),
});
