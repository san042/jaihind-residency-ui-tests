import { Page, expect } from '@playwright/test';

/**
 * JaihindBasePage — base utilities specific to the Jaihind app.
 * Extends the generic pattern from web-automation/tools/pages/BasePage.ts
 * with Jaihind-specific waitFor helpers and common assertions.
 */
export class JaihindBasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async expectTitle(title: string | RegExp) {
    await expect(this.page).toHaveTitle(title);
  }

  async expectURL(url: string | RegExp) {
    await expect(this.page).toHaveURL(url);
  }

  /** Jaihind apps rendered via Lovable.dev may lazy-load — wait for main element */
  async waitForAppReady() {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('[data-testid], main, [role="main"]', { timeout: 15000 });
  }
}
