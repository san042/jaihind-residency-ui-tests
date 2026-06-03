import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { JaihindLoginPage } from '../../pages/JaihindLoginPage';
import { JaihindDashboardPage } from '../../pages/JaihindDashboardPage';
import users from '../../fixtures/jaihind-users.json';
import testData from '../../fixtures/jaihind-testData.json';

// Explicitly load .env in the worker process
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Jaihind Residency — Happy Path: Authentication
 * App: https://jaihindresidency.lovable.app
 */

const VALID_EMAIL    = process.env.TEST_USER_EMAIL    || users.validUser.email;
const VALID_PASSWORD = process.env.TEST_USER_PASSWORD || '';

test.describe('HP — Authentication', () => {

  test('HP-AUTH-01: Landing page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(
      new RegExp(testData.app.expectedTitle, 'i'),
      { timeout: testData.timeouts.medium }
    );
  });

  test('HP-AUTH-02: Auth page renders email, password inputs and Sign In button', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    await loginPage.goto();
    await expect(loginPage.emailInput).toBeVisible({ timeout: testData.timeouts.medium });
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('HP-AUTH-03: Auth page shows correct email placeholder', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    await loginPage.goto();
    await expect(loginPage.emailInput).toHaveAttribute('placeholder', 'you@example.com');
  });

  test('HP-AUTH-04: Auth page shows admin-only contact message', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    await loginPage.goto();
    await expect(loginPage.adminContactMessage).toBeVisible({ timeout: testData.timeouts.medium });
  });

  test('HP-AUTH-05: Valid user logs in and is redirected to /dashboard', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
    await loginPage.expectRedirectedAfterLogin();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: testData.timeouts.medium });
  });

  test('HP-AUTH-06: Dashboard heading visible after login', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    const dashboard = new JaihindDashboardPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
    await dashboard.expectLoaded();
    await expect(dashboard.mainHeading).toBeVisible({ timeout: testData.timeouts.medium });
  });

  test('HP-AUTH-07: All 9 nav links visible after login', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    const dashboard = new JaihindDashboardPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
    await dashboard.expectLoaded();
    const expectedLinks = [
      'Dashboard', 'Rooms', 'Guests', 'Rent Details',
      'Electricity', 'Billing', 'Maintenance', 'Laundry', 'Audit Log'
    ];
    for (const link of expectedLinks) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${link}$`, 'i') })
      ).toBeVisible({ timeout: testData.timeouts.short });
    }
  });

  test('HP-AUTH-08: Logged-in user can sign out and return to /auth', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    const dashboard = new JaihindDashboardPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
    await dashboard.expectLoaded();
    await dashboard.logout();
    await expect(page).toHaveURL(/\/(auth|$)/, { timeout: testData.timeouts.medium });
  });

  test('HP-AUTH-09: Invalid credentials keep user on /auth page', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    await loginPage.goto();
    await loginPage.login(users.invalidUser.email, users.invalidUser.password);
    await expect(page).toHaveURL(/\/auth/, { timeout: testData.timeouts.medium });
  });

  test('HP-AUTH-10: Vacant Rooms table visible on dashboard after login', async ({ page }) => {
    const loginPage = new JaihindLoginPage(page);
    const dashboard = new JaihindDashboardPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
    await dashboard.expectLoaded();
    await expect(dashboard.vacantRoomsSection).toBeVisible({ timeout: testData.timeouts.medium });
  });

});
