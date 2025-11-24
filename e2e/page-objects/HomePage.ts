import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for the Homepage
 * Follows the Page Object Model pattern for maintainable tests
 */
export class HomePage {
  readonly page: Page;
  readonly articleList: Locator;
  readonly articleCards: Locator;
  readonly filterButton: Locator;
  readonly activeFilters: Locator;
  readonly h1Heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.articleList = page.getByTestId("article-list");
    this.articleCards = page.getByTestId("article-card");
    this.filterButton = page.getByTestId("filter-button");
    this.activeFilters = page.locator('[data-testid="active-filter"]');
    this.h1Heading = page.locator("h1");
  }

  /**
   * Navigate to the homepage
   */
  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  /**
   * Wait for the article list to be visible
   */
  async waitForArticleList(timeout = 10000): Promise<void> {
    await this.articleList.waitFor({ state: "visible", timeout });
  }

  /**
   * Get the count of article cards
   */
  async getArticleCount(): Promise<number> {
    return await this.articleCards.count();
  }

  /**
   * Click the filter/personalization toggle button
   */
  async toggleFilter(): Promise<void> {
    await this.filterButton.click();
  }

  /**
   * Check if any active filters are visible
   */
  async hasActiveFilters(): Promise<boolean> {
    const count = await this.activeFilters.count();
    return count > 0;
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Scroll to the bottom of the page
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  /**
   * Scroll to a specific element
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  /**
   * Wait for article count to increase (for infinite scroll)
   */
  async waitForArticleCountIncrease(initialCount: number, timeout = 10000): Promise<number> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const currentCount = await this.getArticleCount();
      if (currentCount > initialCount) {
        return currentCount;
      }
      await this.page.waitForTimeout(500); // Check every 500ms
    }
    return await this.getArticleCount();
  }

  /**
   * Wait for network request to complete (for infinite scroll loading)
   */
  async waitForArticleLoad(timeout = 10000): Promise<void> {
    await this.page.waitForResponse(
      (response) => response.url().includes("/api/articles") && response.status() === 200,
      { timeout }
    );
  }

  /**
   * Get the last article card element
   */
  getLastArticleCard(): Locator {
    return this.articleCards.last();
  }

  /**
   * Check if "No more articles to load" message is visible
   */
  async hasNoMoreArticlesMessage(): Promise<boolean> {
    const message = this.page.getByText("No more articles to load");
    try {
      await message.waitFor({ state: "visible", timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }
}
