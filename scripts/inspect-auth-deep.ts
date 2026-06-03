import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://jaihindresidency.lovable.app/auth');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Dump ALL text content on the page
  console.log('\n📄 ALL VISIBLE TEXT ON PAGE:');
  const allText = await page.locator('body').innerText();
  console.log(allText);

  // Dump ALL clickable elements (buttons, links, spans with onclick)
  console.log('\n🖱️ ALL CLICKABLE ELEMENTS:');
  const clickables = await page.locator('button, a, [role="button"], [onclick], span[class*="link"], p[class*="link"]').all();
  for (const el of clickables) {
    const text = await el.textContent();
    const tag = await el.evaluate(e => e.tagName);
    const cls = await el.getAttribute('class');
    const testId = await el.getAttribute('data-testid');
    if (text?.trim()) {
      console.log(`  <${tag}> text="${text?.trim()}" | class="${cls?.substring(0,60)}" | data-testid="${testId}"`);
    }
  }

  // Dump full HTML of the main form/card area
  console.log('\n🏗️ MAIN FORM HTML (first 3000 chars):');
  const formHtml = await page.locator('form, [class*="card"], [class*="auth"], main').first().innerHTML().catch(() => 'not found');
  console.log(formHtml.substring(0, 3000));

  await browser.close();
  console.log('\n✅ Done.\n');
})();
