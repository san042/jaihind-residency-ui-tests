import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const VALID_EMAIL    = process.env.TEST_USER_EMAIL    || '';
const VALID_PASSWORD = process.env.TEST_USER_PASSWORD || '';

test.beforeEach(async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(VALID_EMAIL);
  await page.locator('input[type="password"]').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(url => !url.href.includes('/auth'), { timeout: 20000 });
});

test.describe('HP — Laundry', () => {

  test('HP-LAUNDRY-01: Laundry page loads successfully after login', async ({ page }) => {
    await page.goto('/laundry');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/laundry/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('HP-LAUNDRY-02: Laundry records or empty state is displayed', async ({ page }) => {
    await page.goto('/laundry');
    await page.waitForLoadState('networkidle');
    const hasTable = await page.getByRole('table').isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no laundry/i).isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('HP-LAUNDRY-03: Laundry page heading is visible', async ({ page }) => {
    await page.goto('/laundry');
    await page.waitForLoadState('networkidle');
    const hasHeading = await page.getByRole('heading')
      .filter({ hasText: /laundry/i }).isVisible().catch(() => false);
    const hasText = await page.getByText(/laundry/i).first().isVisible().catch(() => false);
    expect(hasHeading || hasText).toBeTruthy();
  });

  test('HP-LAUNDRY-04: Navigation from laundry to other modules works', async ({ page }) => {
    await page.goto('/laundry');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /^laundry$/i }).click();
    await expect(page).toHaveURL(/\/laundry/, { timeout: 15000 });
  });

  test('HP-LAUNDRY-05: Laundry table columns are present when data exists', async ({ page }) => {
    await page.goto('/laundry');
    await page.waitForLoadState('networkidle');
    // FIX: guard with isVisible check before accessing table rows
    const table    = page.getByRole('table');
    const hasTable = await table.isVisible().catch(() => false);
    if (!hasTable) {
      test.skip(true, 'No laundry records — empty state');
      return;
    }
    const headers = await table.locator('thead th').allTextContents();
    expect(headers.length).toBeGreaterThan(0);
  });

  // FIX: moved unauthorized test to its own isolated context — NOT inside beforeEach block
  test('HP-LAUNDRY-06: Unauthenticated access to laundry redirects to auth', async ({ browser }) => {
    const freshContext = await browser.newContext();
    const freshPage    = await freshContext.newPage();
    await freshPage.goto('https://jaihindresidency.lovable.app/laundry');
    await freshPage.waitForURL(url => url.href.includes('/auth'), { timeout: 15000 });
    await expect(freshPage).toHaveURL(/\/auth/);
    await freshContext.close();
  });

});
