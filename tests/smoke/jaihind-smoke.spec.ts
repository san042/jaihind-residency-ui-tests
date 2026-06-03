import { test, expect } from '@playwright/test';
import testData from '../../fixtures/jaihind-testData.json';

/**
 * Jaihind Residency — Smoke Tests
 * Fast sanity checks. Run before happy-path suite.
 * App: https://jaihindresidency.lovable.app
 *
 * NOTE: This is an admin-only lodge management system.
 * There is no self-registration — accounts are created by admin only.
 */

test.describe('Smoke — Jaihind Residency App Availability', () => {

  test('SM-01: Root URL is reachable (HTTP < 400)', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('SM-02: App loads with expected title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(
      new RegExp(testData.app.expectedTitle, 'i'),
      { timeout: testData.timeouts.medium }
    );
  });

  test('SM-03: Auth page is reachable and shows Sign In button', async ({ page }) => {
    const response = await page.goto(testData.routes.auth);
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('button', { name: /sign in/i })
    ).toBeVisible({ timeout: testData.timeouts.medium });
  });

  test('SM-04: Auth page shows admin-only access message (no self-registration)', async ({ page }) => {
    await page.goto(testData.routes.auth);
    await page.waitForLoadState('networkidle');
    // This app does not allow self-signup — admin creates accounts
    await expect(
      page.getByText(/contact your administrator/i)
    ).toBeVisible({ timeout: testData.timeouts.medium });
  });

  test('SM-05: No critical app errors on landing page (CORS warnings ignored)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter known 3rd-party CORS issues and favicon — not app bugs
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('frankfurter.app') &&
      !e.includes('CORS') &&
      !e.includes('ERR_FAILED')
    );
    expect(criticalErrors).toHaveLength(0);
  });

});
