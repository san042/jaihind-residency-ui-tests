import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Config ────────────────────────────────────────────────────────────────
const OMLX_BASE_URL = process.env.OMLX_BASE_URL || 'http://localhost:8000';
const OMLX_API_KEY  = process.env.OMLX_API_KEY  || 'local';

const PLANNER_MODEL  = 'oq6e-planner';
const CODER_MODEL    = 'qwen3-coder-30b-a3b-4bit';
const REVIEWER_MODEL = 'qwen-reviewer';

// ─── Modules to generate tests for ────────────────────────────────────────
const MODULES = [
  {
    name: 'Rooms',
    route: '/rooms',
    description: 'Room listing, room status (Vacant/Occupied/Maintenance), room type (AC/Non-AC), location (Chalikkavattom/Vyttila), Undo Checkout action',
  },
  {
    name: 'Guests',
    route: '/guests',
    description: 'Guest listing, guest details, check-in, check-out, guest search',
  },
  {
    name: 'Rent Details',
    route: '/rent-details',
    description: 'Rent records per room, payment status, pending payments, monthly rent tracking',
  },
  {
    name: 'Electricity',
    route: '/electricity',
    description: 'Electricity usage per room, current month charges, meter readings',
  },
  {
    name: 'Billing',
    route: '/billing',
    description: 'Bill generation, monthly billing, bill status, auto-generated bills, billing history',
  },
  {
    name: 'Maintenance',
    route: '/maintenance',
    description: 'Maintenance requests, open issues per room, maintenance status, expenses tracking',
  },
  {
    name: 'Laundry',
    route: '/laundry',
    description: 'Laundry tracking per guest/room, laundry charges, status',
  },
  {
    name: 'Audit Log',
    route: '/audit-log',
    description: 'System activity log, user actions, timestamps, action history',
  },
];

// ─── oMLX API call helper ───────────────────────────────────────────────────
async function callOMLX(model: string, systemPrompt: string, userPrompt: string, maxTokens = 2000): Promise<string> {
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

  // Strip <think>...</think> blocks that reasoning models emit
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

// ─── Stage 1: Generate test plan ───────────────────────────────────────────
async function generateTestPlan(module: typeof MODULES[0]): Promise<string> {
  console.log(`\n📋 [Stage 1] Planning tests for: ${module.name}`);

  const systemPrompt = `You are a senior QA engineer specialising in lodge management systems.
Your job is to create structured test plans in JSON format only.
Output ONLY valid JSON — no markdown, no explanation, no preamble.`;

  const userPrompt = `Create a test plan for the "${module.name}" module of Jaihind Residency lodge management system.

Module details:
- Route: ${module.route}
- Description: ${module.description}
- App URL: https://jaihindresidency.lovable.app
- Auth required: Yes (login at /auth with email/password)
- User role: Employee

Output a JSON object with this exact structure:
{
  "module": "${module.name}",
  "route": "${module.route}",
  "testCases": [
    {
      "id": "HP-${module.name.toUpperCase().replace(/\s/g, '-')}-01",
      "title": "test title",
      "type": "happy-path | negative | edge-case",
      "priority": "high | medium | low",
      "preconditions": ["list of preconditions"],
      "steps": ["step 1", "step 2"],
      "expectedResult": "what should happen"
    }
  ]
}

Generate 6-8 test cases covering: page load, data display, user interactions, navigation, edge cases.`;

  return await callOMLX(PLANNER_MODEL, systemPrompt, userPrompt, 3000);
}

// ─── Stage 2: Generate Playwright spec ─────────────────────────────────────
async function generatePlaywrightSpec(module: typeof MODULES[0], testPlan: string): Promise<string> {
  console.log(`\n💻 [Stage 2] Coding Playwright spec for: ${module.name}`);

  const systemPrompt = `You are an expert Playwright TypeScript test engineer.
Write clean, production-ready Playwright test code only.
Output ONLY valid TypeScript code — no markdown fences, no explanation.
Always use dotenv.config() at top of file to load .env credentials.`;

  const userPrompt = `Convert this test plan into a complete Playwright TypeScript spec file.

Test Plan:
${testPlan}

Requirements:
- File header comment with module name and route
- Import dotenv: import * as dotenv from 'dotenv'; import * as path from 'path';
- Load env: dotenv.config({ path: path.resolve(__dirname, '../../.env') });
- Use process.env.TEST_USER_EMAIL and process.env.TEST_USER_PASSWORD for credentials
- Use test.beforeEach to login before each test that needs auth
- Login steps: goto('/auth'), fill email input, fill password input, click Sign In button, waitForURL to not contain /auth
- Base URL is set in playwright.config.ts — use relative paths like '/rooms'
- Use getByRole, getByText, getByLabel selectors — avoid CSS selectors
- Each test must have the test ID from the plan as a comment
- Use async/await throughout
- Add appropriate timeouts (15000ms for navigation, 5000ms for elements)
- Import from '@playwright/test' only — no external dependencies
- test.describe block named: 'HP — ${module.name}'
- Handle cases where page may have empty state (no data) gracefully with test.skip or soft assertions

Output the complete TypeScript file content only.`;

  return await callOMLX(CODER_MODEL, systemPrompt, userPrompt, 4000);
}

// ─── Stage 3: Review the spec ───────────────────────────────────────────────
async function reviewSpec(module: typeof MODULES[0], spec: string): Promise<string> {
  console.log(`\n🔍 [Stage 3] Reviewing spec for: ${module.name}`);

  const systemPrompt = `You are a senior QA reviewer specialising in Playwright test quality.
Output ONLY a JSON review object — no markdown, no explanation.`;

  const userPrompt = `Review this Playwright TypeScript spec for the "${module.name}" module:

${spec}

Output a JSON object:
{
  "module": "${module.name}",
  "overallScore": 0-10,
  "issues": [
    { "severity": "critical|warning|info", "line": "approximate line", "issue": "description", "fix": "suggested fix" }
  ],
  "missingCoverage": ["list of scenarios not covered"],
  "strengths": ["list of good practices found"],
  "approved": true|false
}`;

  return await callOMLX(REVIEWER_MODEL, systemPrompt, userPrompt, 1500);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function safeParseJSON(raw: string): any {
  try {
    // Extract JSON if wrapped in any text
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────
async function runPipeline() {
  console.log('🚀 Starting oMLX Test Generation Pipeline');
  console.log(`   Planner:  ${PLANNER_MODEL}`);
  console.log(`   Coder:    ${CODER_MODEL}`);
  console.log(`   Reviewer: ${REVIEWER_MODEL}`);
  console.log(`   Modules:  ${MODULES.map(m => m.name).join(', ')}\n`);

  // Output directories
  const specsDir   = path.resolve(__dirname, '../tests/happy-path');
  const plansDir   = path.resolve(__dirname, '../tests/generated-plans');
  const reviewsDir = path.resolve(__dirname, '../tests/generated-reviews');
  ensureDir(specsDir);
  ensureDir(plansDir);
  ensureDir(reviewsDir);

  const summary: any[] = [];

  for (const module of MODULES) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  MODULE: ${module.name.toUpperCase()}`);
    console.log(`${'═'.repeat(60)}`);

    try {
      // ── Stage 1: Plan ──────────────────────────────────────────
      const rawPlan = await generateTestPlan(module);
      const plan    = safeParseJSON(rawPlan);

      if (!plan) {
        console.error(`  ❌ Stage 1 failed — could not parse JSON plan for ${module.name}`);
        console.error(`  Raw output: ${rawPlan.substring(0, 200)}`);
        summary.push({ module: module.name, status: 'FAILED', stage: 'planning' });
        continue;
      }

      const planFile = path.join(plansDir, `${module.name.toLowerCase().replace(/\s/g, '-')}-plan.json`);
      fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
      console.log(`  ✅ Stage 1 complete — ${plan.testCases?.length || 0} test cases planned`);
      console.log(`     Saved: ${planFile}`);

      // ── Stage 2: Code ──────────────────────────────────────────
      const spec     = await generatePlaywrightSpec(module, JSON.stringify(plan, null, 2));
      const specName = `jaihind-${module.name.toLowerCase().replace(/\s/g, '-')}.spec.ts`;
      const specFile = path.join(specsDir, specName);
      fs.writeFileSync(specFile, spec);
      console.log(`  ✅ Stage 2 complete — spec file written`);
      console.log(`     Saved: ${specFile}`);

      // ── Stage 3: Review ────────────────────────────────────────
      const rawReview = await reviewSpec(module, spec);
      const review    = safeParseJSON(rawReview);

      if (review) {
        const reviewFile = path.join(reviewsDir, `${module.name.toLowerCase().replace(/\s/g, '-')}-review.json`);
        fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2));
        console.log(`  ✅ Stage 3 complete — Score: ${review.overallScore}/10 | Approved: ${review.approved}`);
        if (review.issues?.length > 0) {
          const critical = review.issues.filter((i: any) => i.severity === 'critical');
          if (critical.length > 0) {
            console.log(`  ⚠️  ${critical.length} critical issue(s) found:`);
            critical.forEach((i: any) => console.log(`     → ${i.issue}`));
          }
        }
        summary.push({
          module:    module.name,
          status:    'SUCCESS',
          testCount: plan.testCases?.length || 0,
          score:     review.overallScore,
          approved:  review.approved,
          specFile,
        });
      } else {
        summary.push({
          module:    module.name,
          status:    'SUCCESS_NO_REVIEW',
          testCount: plan.testCases?.length || 0,
          specFile,
        });
      }

    } catch (err: any) {
      console.error(`  ❌ Pipeline error for ${module.name}: ${err.message}`);
      summary.push({ module: module.name, status: 'ERROR', error: err.message });
    }

    // Small delay between modules to avoid overwhelming the local GPU
    await new Promise(r => setTimeout(r, 2000));
  }

  // ── Final Summary ────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  PIPELINE SUMMARY');
  console.log(`${'═'.repeat(60)}`);
  summary.forEach(s => {
    const icon = s.status === 'SUCCESS' ? '✅' : s.status === 'SUCCESS_NO_REVIEW' ? '⚠️ ' : '❌';
    const score = s.score !== undefined ? ` | Score: ${s.score}/10` : '';
    console.log(`  ${icon} ${s.module.padEnd(15)} — ${s.testCount || 0} tests${score}`);
  });

  // Save summary
  const summaryFile = path.resolve(__dirname, '../tests/pipeline-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.log(`\n📊 Summary saved: ${summaryFile}`);
  console.log('\n✅ Pipeline complete!\n');
}

runPipeline().catch(console.error);
