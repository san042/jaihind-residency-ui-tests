import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  // Use full URL — not relative
  await page.goto('https://jaihindresidency.lovable.app/auth');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL || '');
  await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD || '');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(url => !url.href.includes('/auth'), { timeout: 20000 });

  // Full URL for rent-details
  await page.goto('https://jaihindresidency.lovable.app/rent-details');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('\n📄 ALL VISIBLE TEXT:');
  console.log(await page.locator('body').innerText());

  console.log('\n🔘 ALL BUTTONS:');
  for (const btn of await page.getByRole('button').all()) {
    const text = await btn.textContent();
    if (text?.trim()) console.log(`  "${text.trim()}"`);
  }

  console.log('\n📋 ALL TABLES:');
  const tables = await page.getByRole('table').all();
  console.log(`  Found: ${tables.length} table(s)`);

  console.log('\n📄 ALL HEADINGS:');
  for (const h of await page.locator('h1,h2,h3,h4').all()) {
    const tag  = await h.evaluate(el => el.tagName);
    const text = await h.textContent();
    console.log(`  <${tag}> "${text?.trim()}"`);
  }

  console.log('\n📍 CURRENT URL:', page.url());
  await browser.close();
  console.log('\n✅ Done.');
})();
