import { Page, Locator, expect } from '@playwright/test';
import { JaihindBasePage } from './JaihindBasePage';

/**
 * JaihindLoginPage — Login/Auth Page POM for Jaihind Residency
 * Auth route: /auth
 * App: https://jaihindresidency.lovable.app
 *
 * Confirmed DOM:
 * - input[type="email"]  placeholder="you@example.com"
 * - input[type="password"] placeholder="••••••••"
 * - button[type="submit"] text="Sign In"
 * - p text="Contact your administrator if you need an account."
 * - After login → redirects to /dashboard (Supabase auth, ~3-5s)
 */
export class JaihindLoginPage extends JaihindBasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly adminContactMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.emailInput    = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton   = page.getByRole('button', { name: /^sign in$/i });
    this.errorMessage  = page.getByRole('alert')
                             .or(page.locator('[class*="error"], [class*="toast"], [class*="destructive"]'));
    this.adminContactMessage = page.getByText(/contact your administrator/i);
  }

  async goto() {
    await super.goto('/auth');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Supabase auth redirect takes 3-5s — wait for URL change not networkidle
    await this.page.waitForURL(url => !url.href.includes('/auth'), { timeout: 20000 })
      .catch(() => {}); // catch: may stay on /auth for invalid login
  }

  async expectLoginError(message?: string) {
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });
    if (message) await expect(this.errorMessage).toContainText(message);
  }

  async expectRedirectedAfterLogin() {
    await expect(this.page).not.toHaveURL(/\/auth/, { timeout: 20000 });
  }
}
