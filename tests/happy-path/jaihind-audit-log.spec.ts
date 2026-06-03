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

test.describe('HP — Audit Log', () => {

  test('HP-AUDIT-LOG-01: Page loads successfully after login', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/audit-log/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('HP-AUDIT-LOG-02: Audit log table or empty state is visible', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');
    const table    = page.locator('table');
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no .*(log|audit|record)/i).isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('HP-AUDIT-LOG-03: Audit log table has expected column headers', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');
    const table    = page.locator('table');
    const hasTable = await table.isVisible().catch(() => false);
    if (!hasTable) {
      test.skip(true, 'No audit log table — empty state');
      return;
    }
    const headers = await table.locator('thead th').allTextContents();
    expect(headers.length).toBeGreaterThan(0);
  });

  test('HP-AUDIT-LOG-04: Page heading contains audit log text', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');
    const hasHeading = await page.getByRole('heading')
      .filter({ hasText: /audit/i }).isVisible().catch(() => false);
    const hasText = await page.getByText(/audit log/i).isVisible().catch(() => false);
    expect(hasHeading || hasText).toBeTruthy();
  });

  test('HP-AUDIT-LOG-05: Navigation from audit log to dashboard works', async ({ page }) => {
    await page.goto('/audit-log');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  // FIX: removed page.context().close() — replaced with separate unauthenticated test
  test('HP-AUDIT-LOG-06: Unauthenticated access to audit-log redirects to auth', async ({ browser }) => {
    // Use a brand new context with no cookies — fully unauthenticated
    const freshContext = await browser.newContext();
    const freshPage    = await freshContext.newPage();
    await freshPage.goto('https://jaihindresidency.lovable.app/audit-log');
    await freshPage.waitForURL(url => url.href.includes('/auth'), { timeout: 15000 });
    await expect(freshPage).toHaveURL(/\/auth/);
    await freshContext.close();
  });

});
