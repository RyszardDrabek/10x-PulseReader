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
}
