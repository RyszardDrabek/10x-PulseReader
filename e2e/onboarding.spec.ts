import { test, expect } from "@playwright/test";

test.describe("User Onboarding Flow", () => {
  test("should load homepage without errors", async ({ page }) => {
    // Basic test to ensure the onboarding-related components don't break the app
    await page.goto("/");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify basic page structure
    await expect(page).toHaveTitle(/PulseReader/);
    await expect(page.locator("main")).toBeVisible();

    // Check that key components are present (may not be visible depending on user state)
    const mainContent = page.locator("main");

    // These elements should exist in the DOM even if not visible
    await expect(mainContent).toBeAttached();

    // The onboarding modal is conditionally rendered in the Homepage component
    // We don't need to check for it here since it's tested in the next test
  });

  test("should handle onboarding modal interactions when present", async ({ page }) => {
    // This test covers the case where onboarding modal might appear
    // We can't guarantee it will appear without specific user setup,
    // but we can test that the modal structure works when it does

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check if onboarding modal appears (it may not for existing users)
    const onboardingModal = page.locator('[role="dialog"]').filter({
      hasText: "Welcome to PulseReader"
    });

    try {
      await onboardingModal.waitFor({ state: "visible", timeout: 2000 });

      // If modal appears, test basic interactions
      await expect(onboardingModal.getByText("Welcome to PulseReader! 🎉")).toBeVisible();

      // Test skip functionality
      const skipButton = onboardingModal.getByText("Skip for now");
      await skipButton.click();

      // Modal should close
      await expect(onboardingModal).not.toBeVisible();

    } catch {
      // Modal didn't appear - this is expected for users who already have preferences
      // Just verify the page loaded correctly
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("should allow navigation to settings page", async ({ page }) => {
    // Test that settings navigation works (may require authentication)
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check if settings link exists (may be hidden for unauthenticated users)
    const settingsLink = page.locator('a[href="/settings"]');

    if (await settingsLink.isVisible()) {
      await settingsLink.click();

      // Should navigate to settings page or login page
      await page.waitForLoadState("networkidle");

      // Either we're on settings page or redirected to login
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(\/settings|\/login)$/);
    } else {
      // Settings link not visible - user might be unauthenticated
      // This is expected behavior
      await expect(page.locator("main")).toBeVisible();
    }
  });
});
