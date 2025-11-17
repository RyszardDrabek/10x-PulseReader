import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load homepage successfully", async ({ page }) => {
    // Navigate to homepage
    await page.goto("/");

    // Check if page loaded
    await expect(page).toHaveTitle(/10x PulseReader/);

    // Check for main elements
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should display article list", async ({ page }) => {
    await page.goto("/");

    // Wait for articles to load (adjust selector based on your implementation)
    await page.waitForSelector('[data-testid="article-list"]', { timeout: 10000 });

    // Check if articles are displayed
    const articles = page.locator('[data-testid="article-card"]');
    await expect(articles).toHaveCount(await articles.count());
  });

  test("should allow filtering articles", async ({ page }) => {
    await page.goto("/");

    // Click on a filter (adjust based on your UI)
    await page.click('[data-testid="filter-button"]');

    // Check if filter is applied
    await expect(page.locator('[data-testid="active-filter"]')).toBeVisible();
  });
});
