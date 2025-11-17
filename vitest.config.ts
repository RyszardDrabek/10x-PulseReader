/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for lightweight DOM environment (lighter than jsdom)
    environment: "happy-dom",

    // Setup file for test environment
    setupFiles: ["./src/test/vitest.setup.ts"],

    // Include test files
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    // Exclude certain directories
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/e2e/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
    ],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/test/**",
        "e2e/**",
        "**/*.d.ts",
        "**/*.config.*",
        "src/env.d.ts",
        "src/pages/api/**",
        "src/middleware/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Global test timeout
    testTimeout: 10000,

    // Enable globals for describe, it, expect etc.
    globals: true,

    // Watch mode configuration
    watch: {
      exclude: ["**/node_modules/**", "**/dist/**"],
    },
  },

  // Path resolution for imports
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/components"),
      "@lib": resolve(__dirname, "./src/lib"),
      "@types": resolve(__dirname, "./src/types"),
      "@test": resolve(__dirname, "./src/test"),
    },
  },
});
