import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OMLX_BASE_URL = process.env.OMLX_BASE_URL || 'http://localhost:8000';
const OMLX_API_KEY  = process.env.OMLX_API_KEY  || 'local';
const CODER_MODEL   = 'qwen3-coder-30b-a3b-4bit';

async function callOMLX(model: string, systemPrompt: string, userPrompt: string, maxTokens = 4000): Promise<string> {
  const response = await fetch(`${OMLX_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OMLX_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`oMLX API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content || '';
  // Strip thinking tags and markdown code fences
  return content
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```typescript\n?/g, '')
    .replace(/```ts\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function runCoder() {
  console.log('🚀 STAGE 2: Playwright Spec Generation');
  console.log(`   Model: ${CODER_MODEL}\n`);

  const plansDir = path.resolve(__dirname, '../tests/generated-plans');
  const specsDir = path.resolve(__dirname, '../tests/happy-path');
  ensureDir(specsDir);

  // Load all plan files
  const planFiles = fs.readdirSync(plansDir).filter(f => f.endsWith('-plan.json'));

  if (planFiles.length === 0) {
    console.error('❌ No plan files found. Run Stage 1 first.');
    process.exit(1);
  }

  console.log(`   Found ${planFiles.length} plan files: ${planFiles.join(', ')}\n`);

  const results: any[] = [];

  for (const planFile of planFiles) {
    const planPath = path.join(plansDir, planFile);
    const plan     = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    const module   = plan.module;
    const route    = plan.route;

    console.log(`\n💻 Coding spec for: ${module}...`);

    try {
      const systemPrompt = `You are an expert Playwright TypeScript test engineer.
Write production-ready Playwright test code.
Output ONLY valid TypeScript — no markdown fences, no explanation, no preamble.
The output must start directly with import statements.`;

      const userPrompt = `Convert this test plan into a complete Playwright TypeScript spec file.

Test Plan:
${JSON.stringify(plan, null, 2)}

Requirements:
1. Start file with these exact imports and dotenv setup:
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

2. Read credentials:
const VALID_EMAIL    = process.env.TEST_USER_EMAIL    || '';
const VALID_PASSWORD = process.env.TEST_USER_PASSWORD || '';

3. Login helper using beforeEach:
test.beforeEach(async ({ page }) => {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(VALID_EMAIL);
  await page.locator('input[type="password"]').fill(VALID_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(url => !url.href.includes('/auth'), { timeout: 20000 });
});

4. test.describe block: 'HP — ${module}'
5. Each test function named exactly as the test case ID + title
6. Navigate to '${route}' inside each test after beforeEach login
7. Use getByRole, getByText, getByLabel — avoid fragile CSS selectors
8. Add { timeout: 15000 } for navigation waits
9. Handle empty state gracefully — use .isVisible() checks before asserting table rows
10. All test IDs from the plan must appear as comments above each test

Output the complete TypeScript file only. Start directly with import statements.`;

      const spec = await callOMLX(CODER_MODEL, systemPrompt, userPrompt, 4000);

      // Validate it looks like TypeScript
      if (!spec.includes('import') || !spec.includes('test(')) {
        console.error(`  ⚠️  Output doesn't look like valid TypeScript for ${module}`);
        console.error(`  First 200 chars: ${spec.substring(0, 200)}`);
      }

      const specName = `jaihind-${module.toLowerCase().replace(/\s+/g, '-')}.spec.ts`;
      const specPath = path.join(specsDir, specName);
      fs.writeFileSync(specPath, spec);

      console.log(`  ✅ Spec written — ${specName}`);
      results.push({ module, status: 'OK', file: specPath, testCount: plan.testCases?.length || 0 });

    } catch (err: any) {
      console.error(`  ❌ Error: ${err.message}`);
      results.push({ module, status: 'ERROR', error: err.message });
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Save stage summary
  const summaryPath = path.resolve(__dirname, '../tests/stage2-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  console.log('\n════════════════════════════════════════');
  console.log('  STAGE 2 SUMMARY');
  console.log('════════════════════════════════════════');
  results.forEach(r => {
    const icon = r.status === 'OK' ? '✅' : '❌';
    console.log(`  ${icon} ${r.module.padEnd(15)} — ${r.file?.split('/').pop() || 'failed'}`);
  });

  const failed = results.filter(r => r.status !== 'OK');
  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} module(s) failed.`);
  } else {
    console.log('\n✅ All specs generated successfully!');
  }

  console.log('\n════════════════════════════════════════');
  console.log('  NEXT STEPS:');
  console.log('  1. Run: omlx-stop');
  console.log('  2. Then run Stage 3: npx ts-node --project tsconfig.json scripts/stage3-reviewer.ts');
  console.log('════════════════════════════════════════\n');
}

runCoder().catch(console.error);
