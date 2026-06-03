import { Page, Locator, expect } from '@playwright/test';
import { JaihindBasePage } from './JaihindBasePage';

/**
 * JaihindDashboardPage — Real selectors from live DOM inspection
 * App: https://jaihindresidency.lovable.app/dashboard
 *
 * Confirmed DOM structure:
 * - Nav sidebar: nav links for Dashboard, Rooms, Guests, Rent Details,
 *                Electricity, Billing, Maintenance, Laundry, Audit Log
 * - H1: "Jaihind Residency" (sidebar), "Employee Dashboard" (main)
 * - Sign Out button in sidebar
 * - User info: "Santhosh / Employee" text in sidebar
 * - Stats cards: Total Rooms, Current Non-Occupancy, Maintenance Rooms,
 *                Pending Payments, Electricity Charges, Deposits Held, Maintenance Expenses
 * - Tables: Vacant Rooms, Rooms Under Maintenance
 */
export class JaihindDashboardPage extends JaihindBasePage {
  readonly navMenu: Locator;
  readonly logoutButton: Locator;
  readonly mainHeading: Locator;
  readonly appHeading: Locator;
  readonly vacantRoomsSection: Locator;
  readonly maintenanceSection: Locator;

  // Nav links
  readonly navDashboard: Locator;
  readonly navRooms: Locator;
  readonly navGuests: Locator;
  readonly navRentDetails: Locator;
  readonly navElectricity: Locator;
  readonly navBilling: Locator;
  readonly navMaintenance: Locator;
  readonly navLaundry: Locator;
  readonly navAuditLog: Locator;

  constructor(page: Page) {
    super(page);

    // Navigation sidebar
    this.navMenu       = page.getByRole('navigation');
    this.logoutButton  = page.getByRole('button', { name: /sign out/i });
    this.appHeading    = page.getByRole('heading', { name: /jaihind residency/i });
    this.mainHeading   = page.getByRole('heading', { name: /employee dashboard/i });

    // Sections
    this.vacantRoomsSection   = page.getByRole('heading', { name: /vacant rooms/i });
    this.maintenanceSection   = page.getByRole('heading', { name: /rooms under maintenance/i });

    // Nav links by exact text
    this.navDashboard   = page.getByRole('link', { name: /^dashboard$/i });
    this.navRooms       = page.getByRole('link', { name: /^rooms$/i });
    this.navGuests      = page.getByRole('link', { name: /^guests$/i });
    this.navRentDetails = page.getByRole('link', { name: /^rent details$/i });
    this.navElectricity = page.getByRole('link', { name: /^electricity$/i });
    this.navBilling     = page.getByRole('link', { name: /^billing$/i });
    this.navMaintenance = page.getByRole('link', { name: /^maintenance$/i });
    this.navLaundry     = page.getByRole('link', { name: /^laundry$/i });
    this.navAuditLog    = page.getByRole('link', { name: /^audit log$/i });
  }

  async goto() {
    await super.goto('/dashboard');
  }

  async expectLoaded() {
    // Wait for URL to be dashboard
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    // Wait for main heading and nav
    await expect(this.mainHeading).toBeVisible({ timeout: 15000 });
    await expect(this.navMenu).toBeVisible({ timeout: 10000 });
  }

  async logout() {
    await this.logoutButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateTo(section: 'rooms' | 'guests' | 'billing' | 'maintenance' | 'electricity' | 'laundry' | 'audit-log' | 'rent-details') {
    const map: Record<string, Locator> = {
      'rooms':       this.navRooms,
      'guests':      this.navGuests,
      'billing':     this.navBilling,
      'maintenance': this.navMaintenance,
      'electricity': this.navElectricity,
      'laundry':     this.navLaundry,
      'audit-log':   this.navAuditLog,
      'rent-details':this.navRentDetails,
    };
    await map[section].click();
    await this.page.waitForLoadState('networkidle');
  }
}
