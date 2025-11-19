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
    build: {
      rollupOptions: {
        output: {
          // Organize chunks in a chunks directory for Cloudflare Pages compatibility
          chunkFileNames: "chunks/[name]-[hash].mjs",
          entryFileNames: "[name].mjs",
        },
      },
    },
  },
  adapter: cloudflare(),
});
