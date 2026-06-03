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

test.describe('HP — Rent Details', () => {

  test('HP-RENT-DETAILS-01: Rent Details page loads successfully', async ({ page }) => {
    await page.goto('https://jaihindresidency.lovable.app/rent-details');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/rent-details/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('HP-RENT-DETAILS-02: Page shows correct heading', async ({ page }) => {
    await page.goto('https://jaihindresidency.lovable.app/rent-details');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /rent details/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('HP-RENT-DETAILS-03: Page shows room-wise rent register description', async ({ page }) => {
    await page.goto('https://jaihindresidency.lovable.app/rent-details');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/room-wise monthly rent register/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('HP-RENT-DETAILS-04: Select Room dropdown is visible', async ({ page }) => {
    await page.goto('https://jaihindresidency.lovable.app/rent-details');
    await page.waitForLoadState('networkidle');
    // Page shows "Select Room" dropdown before any data loads
    await expect(
      page.getByText(/select room/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('HP-RENT-DETAILS-05: Default state shows select a room prompt', async ({ page }) => {
    await page.goto('https://jaihindresidency.lovable.app/rent-details');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/select a room to view rent details/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('HP-RENT-DETAILS-06: Navigation from rent details to dashboard works', async ({ page }) => {
    await page.goto('https://jaihindresidency.lovable.app/rent-details');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

});
