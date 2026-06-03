import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('\n🔍 Navigating to /auth...');
  await page.goto('https://jaihindresidency.lovable.app/auth');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('\n📄 PAGE TITLE:', await page.title());

  console.log('\n🔘 ALL BUTTONS:');
  const buttons = await page.getByRole('button').all();
  for (const btn of buttons) {
    const text = await btn.textContent();
    const testId = await btn.getAttribute('data-testid');
    console.log(`  text="${text?.trim()}" | data-testid="${testId}"`);
  }

  console.log('\n📑 ALL TABS:');
  const tabs = await page.getByRole('tab').all();
  for (const tab of tabs) {
    const text = await tab.textContent();
    console.log(`  text="${text?.trim()}"`);
  }

  console.log('\n📝 ALL INPUTS:');
  const inputs = await page.locator('input').all();
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder');
    const name = await input.getAttribute('name');
    console.log(`  type="${type}" | name="${name}" | placeholder="${placeholder}"`);
  }

  console.log('\n🔗 ALL LINKS:');
  const links = await page.getByRole('link').all();
  for (const link of links) {
    const text = await link.textContent();
    const href = await link.getAttribute('href');
    console.log(`  text="${text?.trim()}" | href="${href}"`);
  }

  await browser.close();
  console.log('\n✅ Done.\n');
})();
