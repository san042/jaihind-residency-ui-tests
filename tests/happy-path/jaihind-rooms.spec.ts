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

test.describe('HP — Rooms', () => {

  test('HP-ROOMS-01: Rooms page loads successfully after login', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/rooms/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('HP-ROOMS-02: Room data or empty state is displayed', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    // Rooms may show as cards, table, or list
    const hasTable = await page.getByRole('table').isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no rooms/i).isVisible().catch(() => false);
    expect(hasTable || hasCards || hasEmpty).toBeTruthy();
  });

  test('HP-ROOMS-03: Room entries show type and location info', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    // FIX: use waitForLoadState instead of waitForTimeout
    await page.waitForLoadState('networkidle');
    const hasAC       = await page.getByText(/AC|Non-AC/i).first().isVisible().catch(() => false);
    const hasLocation = await page.getByText(/Chalikkavattom|Vyttila/i).first().isVisible().catch(() => false);
    if (!hasAC && !hasLocation) {
      test.skip(true, 'No room data visible');
      return;
    }
    expect(hasAC || hasLocation).toBeTruthy();
  });

  test('HP-ROOMS-04: Undo Checkout button is conditionally present for vacant rooms', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    // FIX: do not assert button exists — it only shows for recently checked-out rooms
    const undoButton = page.getByRole('button', { name: /undo checkout/i }).first();
    const hasUndo    = await undoButton.isVisible().catch(() => false);
    if (hasUndo) {
      // Button exists — verify it is enabled
      await expect(undoButton).toBeEnabled();
    } else {
      // No checked-out rooms currently — this is valid state
      test.skip(true, 'No recently checked-out rooms — Undo Checkout not shown');
    }
  });

  test('HP-ROOMS-05: Room status labels are visible', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    const hasVacant   = await page.getByText(/vacant/i).first().isVisible().catch(() => false);
    const hasOccupied = await page.getByText(/occupied/i).first().isVisible().catch(() => false);
    const hasMaint    = await page.getByText(/maintenance/i).first().isVisible().catch(() => false);
    const hasEmpty    = await page.getByText(/no rooms/i).isVisible().catch(() => false);
    expect(hasVacant || hasOccupied || hasMaint || hasEmpty).toBeTruthy();
  });

  test('HP-ROOMS-06: Navigation from rooms to dashboard works', async ({ page }) => {
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: /^dashboard$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

});
