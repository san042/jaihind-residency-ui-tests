import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
// FIX: removed space in path '../../. env' → '../../.env'
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

test.describe('HP — Maintenance', () => {

  test('HP-MAINTENANCE-01: Maintenance page loads successfully after login', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/maintenance/);
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByText(/maintenance/i).first()).toBeVisible();
  });

  test('HP-MAINTENANCE-02: Maintenance data or empty state is displayed', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
    const table   = page.getByRole('table');
    const hasData = await table.isVisible().catch(() => false);
    const empty   = page.getByText(/no maintenance/i);
    const hasEmpty = await empty.isVisible().catch(() => false);
    expect(hasData || hasEmpty).toBeTruthy();
  });

  test('HP-MAINTENANCE-03: Navigation from maintenance to other modules works', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^rooms$/i }).click();
    await expect(page).toHaveURL(/\/rooms/, { timeout: 15000 });
    await page.getByRole('link', { name: /^maintenance$/i }).click();
    await expect(page).toHaveURL(/\/maintenance/, { timeout: 15000 });
  });

  test('HP-MAINTENANCE-04: Add new maintenance request button is present if available', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
    // FIX: only verify button presence — do NOT submit form to avoid state leak
    const addButton = page.getByRole('button', { name: /new request|add|create/i });
    const hasButton = await addButton.isVisible().catch(() => false);
    if (hasButton) {
      await expect(addButton).toBeEnabled();
    } else {
      test.skip(true, 'No add request button on this build');
    }
  });

  test('HP-MAINTENANCE-05: Maintenance page shows expenses or summary section', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
    // FIX: do not assume empty state — check for expenses text OR table
    const hasExpenses = await page.getByText(/expenses/i).isVisible().catch(() => false);
    const hasTable    = await page.getByRole('table').isVisible().catch(() => false);
    const hasEmpty    = await page.getByText(/no maintenance/i).isVisible().catch(() => false);
    expect(hasExpenses || hasTable || hasEmpty).toBeTruthy();
  });

  test('HP-MAINTENANCE-06: Maintenance page does not crash on load', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
    // Verify stable page — nav present and no redirect
    await expect(page).toHaveURL(/\/maintenance/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

});
