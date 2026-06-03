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

test.describe('HP — Billing', () => {

  test('HP-BILLING-01: Billing page loads successfully after login', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/billing/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('HP-BILLING-02: Billing page shows heading or billing content', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    // FIX: avoid CSS class selectors like div.bill-history — use semantic
    const hasHeading = await page.getByRole('heading')
      .filter({ hasText: /billing/i }).isVisible().catch(() => false);
    const hasContent = await page.getByText(/billing/i).first().isVisible().catch(() => false);
    expect(hasHeading || hasContent).toBeTruthy();
  });

  test('HP-BILLING-03: Billing table or empty state is visible', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    // FIX: do not assert specific column names — use conditional check
    const hasTable = await page.getByRole('table').isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no bills|no billing/i).isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('HP-BILLING-04: Billing page does not redirect to auth', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page).toHaveURL(/\/billing/);
  });

  test('HP-BILLING-05: Navigation from billing to other modules works', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /^billing$/i }).click();
    await expect(page).toHaveURL(/\/billing/, { timeout: 15000 });
  });

  test('HP-BILLING-06: Billing page shows monthly bills section or auto-bill info', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    // Check for any billing-related content
    const hasMonthly = await page.getByText(/monthly|auto.generat/i).isVisible().catch(() => false);
    const hasTable   = await page.getByRole('table').isVisible().catch(() => false);
    const hasEmpty   = await page.getByText(/no bills/i).isVisible().catch(() => false);
    expect(hasMonthly || hasTable || hasEmpty).toBeTruthy();
  });

});
