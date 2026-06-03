import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('\n📧 Using email:', process.env.TEST_USER_EMAIL);

  await page.goto('https://jaihindresidency.lovable.app/auth');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Fill and submit login form
  await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL || '');
  await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD || '');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for navigation or response
  await page.waitForTimeout(5000);

  console.log('\n📍 URL AFTER LOGIN:', page.url());
  console.log('\n📄 PAGE TITLE:', await page.title());

  console.log('\n📄 ALL VISIBLE TEXT:');
  console.log(await page.locator('body').innerText());

  console.log('\n🔘 ALL BUTTONS:');
  const buttons = await page.getByRole('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent();
    console.log(`  "${text?.trim()}"`);
  }

  console.log('\n🧩 ALL HEADINGS:');
  const headings = await page.locator('h1,h2,h3,h4').all();
  for (const h of headings) {
    const tag = await h.evaluate(el => el.tagName);
    const text = await h.textContent();
    console.log(`  <${tag}> "${text?.trim()}"`);
  }

  console.log('\n🔗 NAV / SIDEBAR items:');
  const navItems = await page.locator('nav a, nav button, [role="navigation"] a').all();
  for (const item of navItems) {
    const text = await item.textContent();
    console.log(`  "${text?.trim()}"`);
  }

  await browser.close();
  console.log('\n✅ Done.\n');
})();
