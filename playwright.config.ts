import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot only when test fails */
    screenshot: "only-on-failure",

    /* Record video only when test fails */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  /* Per testing rules: Initialize configuration only with Chromium/Desktop Chrome browser */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },

  /* Global test timeout */
  timeout: 30 * 1000, // 30 seconds

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000, // 10 seconds
  },

  /* Output directory for test artifacts */
  outputDir: "test-results/",

  /* Global setup and teardown */
  globalSetup: path.resolve(__dirname, "./e2e/global-setup.ts"),
  globalTeardown: path.resolve(__dirname, "./e2e/global-teardown.ts"),
});
