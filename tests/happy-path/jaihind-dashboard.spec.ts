import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { JaihindDashboardPage } from '../../pages/JaihindDashboardPage';
import testData from '../../fixtures/jaihind-testData.json';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const VALID_EMAIL    = process.env.TEST_USER_EMAIL    || '';
const VALID_PASSWORD = process.env.TEST_USER_PASSWORD || '';

test.describe('HP — Dashboard & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="email"]').fill(VALID_EMAIL);
    await page.locator('input[type="password"]').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(url => !url.href.includes('/auth'), { timeout: 20000 });
  });

  test('HP-DASH-01: Dashboard heading visible after login', async ({ page }) => {
    const dashboard = new JaihindDashboardPage(page);
    await dashboard.expectLoaded();
    await expect(dashboard.mainHeading).toBeVisible({ timeout: testData.timeouts.medium });
  });

  test('HP-DASH-02: Navigation menu with all links visible', async ({ page }) => {
    const dashboard = new JaihindDashboardPage(page);
    await dashboard.expectLoaded();
    await expect(dashboard.navMenu).toBeVisible();
  });

  test('HP-DASH-03: Sign Out button is present and enabled', async ({ page }) => {
    const dashboard = new JaihindDashboardPage(page);
    await dashboard.expectLoaded();
    await expect(dashboard.logoutButton).toBeVisible();
    await expect(dashboard.logoutButton).toBeEnabled();
  });

  test('HP-DASH-04: Vacant Rooms section is visible', async ({ page }) => {
    const dashboard = new JaihindDashboardPage(page);
    await dashboard.expectLoaded();
    await expect(dashboard.vacantRoomsSection).toBeVisible({ timeout: testData.timeouts.medium });
  });

  test('HP-DASH-05: All 9 nav links are present', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    const expectedLinks = ['Dashboard','Rooms','Guests','Rent Details',
                           'Electricity','Billing','Maintenance','Laundry','Audit Log'];
    for (const link of expectedLinks) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${link}$`, 'i') })
      ).toBeVisible({ timeout: testData.timeouts.short });
    }
  });

  test('HP-DASH-06: Page title reflects Jaihind app name', async ({ page }) => {
    await expect(page).toHaveTitle(
      new RegExp(testData.app.expectedTitle, 'i'),
      { timeout: testData.timeouts.medium }
    );
  });

  test('HP-DASH-07: Rooms Under Maintenance section visible', async ({ page }) => {
    const dashboard = new JaihindDashboardPage(page);
    await dashboard.expectLoaded();
    await expect(dashboard.maintenanceSection).toBeVisible({ timeout: testData.timeouts.medium });
  });

});
