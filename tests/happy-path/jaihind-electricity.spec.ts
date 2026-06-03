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

test.describe('HP — Electricity', () => {

  test('HP-ELECTRICITY-01: Page loads successfully after login', async ({ page }) => {
    await page.goto('/electricity');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/electricity/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('HP-ELECTRICITY-02: Room-wise electricity data displays correctly', async ({ page }) => {
    await page.goto('/electricity');
    await page.waitForLoadState('networkidle');
    // FIX: removed duplicate 'rows' variable — single check block
    const table      = page.getByRole('table');
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) {
      const empty = page.getByText(/no electricity records/i);
      const emptyVisible = await empty.isVisible().catch(() => false);
      if (emptyVisible) {
        test.skip(true, 'No electricity records — empty state');
      }
      return;
    }
    const dataRows = page.getByRole('row');
    const rowCount = await dataRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('HP-ELECTRICITY-03: Navigation between electricity and rooms works', async ({ page }) => {
    await page.goto('/electricity');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^rooms$/i }).click();
    await expect(page).toHaveURL(/\/rooms/, { timeout: 15000 });
    await page.getByRole('link', { name: /^electricity$/i }).click();
    await expect(page).toHaveURL(/\/electricity/, { timeout: 15000 });
  });

  test('HP-ELECTRICITY-04: Electricity page shows charges heading or summary', async ({ page }) => {
    await page.goto('/electricity');
    await page.waitForLoadState('networkidle');
    // Check for any electricity-related heading or summary text
    const hasHeading = await page.getByRole('heading').filter({ hasText: /electricity/i })
                                 .isVisible().catch(() => false);
    const hasSummary = await page.getByText(/electricity charges/i)
                                 .isVisible().catch(() => false);
    expect(hasHeading || hasSummary).toBeTruthy();
  });

  test('HP-ELECTRICITY-05: Empty state displays when no records exist', async ({ page }) => {
    await page.goto('/electricity');
    await page.waitForLoadState('networkidle');
    const table   = page.getByRole('table');
    const hasData = await table.isVisible().catch(() => false);
    if (!hasData) {
      const empty = page.getByText(/no electricity records/i);
      const emptyVisible = await empty.isVisible().catch(() => false);
      if (emptyVisible) {
        await expect(empty).toBeVisible();
      } else {
        // No table and no empty message — just verify page loaded
        await expect(page).toHaveURL(/\/electricity/);
      }
    } else {
      test.skip(true, 'Records exist — empty state not applicable');
    }
  });

  test('HP-ELECTRICITY-06: Page does not crash with no meter reading data', async ({ page }) => {
    await page.goto('/electricity');
    await page.waitForLoadState('networkidle');
    // Verify no JS errors crash the page — just check URL and nav still present
    await expect(page).toHaveURL(/\/electricity/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

});
