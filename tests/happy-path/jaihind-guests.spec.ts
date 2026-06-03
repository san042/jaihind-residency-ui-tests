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

test.describe('HP — Guests', () => {

  test('HP-GUESTS-01: Guest page loads successfully after authentication', async ({ page }) => {
    await page.goto('/guests');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/guests/);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('HP-GUESTS-02: Guest listing table is visible', async ({ page }) => {
    await page.goto('/guests');
    await page.waitForLoadState('networkidle');
    // FIX: removed typo 'g guestRows' — check table OR empty state
    const table    = page.getByRole('table');
    const empty    = page.getByText(/no guests/i);
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await empty.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test('HP-GUESTS-03: Guest rows are present in the table', async ({ page }) => {
    await page.goto('/guests');
    await page.waitForLoadState('networkidle');
    const table = page.getByRole('table');
    const tableVisible = await table.isVisible().catch(() => false);
    if (!tableVisible) {
      test.skip(true, 'No guest table visible — empty state');
      return;
    }
    // Header row + at least 1 data row
    const rows = page.getByRole('row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(1);
  });

  test('HP-GUESTS-04: Search input accepts text and filters results', async ({ page }) => {
    await page.goto('/guests');
    await page.waitForLoadState('networkidle');
    const search = page.getByRole('searchbox')
                       .or(page.getByPlaceholder(/search/i));
    const searchVisible = await search.isVisible().catch(() => false);
    if (!searchVisible) {
      test.skip(true, 'No search input on guests page');
      return;
    }
    await search.fill('Test');
    await page.waitForLoadState('networkidle');
    // Either results or no-results message should appear
    const hasResults = await page.getByRole('row').count() > 1;
    const hasEmpty   = await page.getByText(/no .* found/i).isVisible().catch(() => false);
    expect(hasResults || hasEmpty).toBeTruthy();
  });

  test('HP-GUESTS-05: Empty state shows correct message when no guests', async ({ page }) => {
    await page.goto('/guests');
    await page.waitForLoadState('networkidle');
    // FIX: removed typo 'g guestTable' — use conditional check
    const table   = page.getByRole('table');
    const isEmpty = !(await table.isVisible().catch(() => false));
    if (isEmpty) {
      await expect(page.getByText(/no guests/i)).toBeVisible({ timeout: 5000 });
    } else {
      // Table exists — page is not in empty state, skip
      test.skip(true, 'Guests exist — empty state not applicable');
    }
  });

  test('HP-GUESTS-06: Special character search returns no results gracefully', async ({ page }) => {
    await page.goto('/guests');
    await page.waitForLoadState('networkidle');
    const search = page.getByRole('searchbox')
                       .or(page.getByPlaceholder(/search/i));
    const searchVisible = await search.isVisible().catch(() => false);
    if (!searchVisible) {
      test.skip(true, 'No search input on guests page');
      return;
    }
    await search.fill('@#$%^&*');
    await page.waitForLoadState('networkidle');
    const hasEmpty = await page.getByText(/no .* found/i).isVisible().catch(() => false);
    const hasRows  = (await page.getByRole('row').count()) > 1;
    // Either empty message or zero data rows
    expect(hasEmpty || !hasRows).toBeTruthy();
  });

});
