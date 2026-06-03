import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const OMLX_BASE_URL = process.env.OMLX_BASE_URL || 'http://localhost:8000';
const OMLX_API_KEY  = process.env.OMLX_API_KEY  || 'local';
const PLANNER_MODEL = 'oq6e-planner';

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

async function callOMLX(model: string, systemPrompt: string, userPrompt: string, maxTokens = 3000): Promise<string> {
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
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function safeParseJSON(raw: string): any {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function runPlanner() {
  console.log('🚀 STAGE 1: Test Plan Generation');
  console.log(`   Model: ${PLANNER_MODEL}`);
  console.log(`   Modules: ${MODULES.map(m => m.name).join(', ')}\n`);

  const plansDir = path.resolve(__dirname, '../tests/generated-plans');
  ensureDir(plansDir);

  const results: any[] = [];

  for (const module of MODULES) {
    console.log(`\n📋 Planning: ${module.name}...`);

    try {
      const systemPrompt = `You are a senior QA engineer specialising in lodge management systems.
Your job is to create structured test plans in JSON format only.
Output ONLY valid JSON — no markdown, no explanation, no preamble, no thinking tags.`;

      const userPrompt = `Create a test plan for the "${module.name}" module of Jaihind Residency lodge management system.

Module details:
- Route: ${module.route}
- Description: ${module.description}
- App URL: https://jaihindresidency.lovable.app
- Auth required: Yes (login at /auth with email + password)
- User role: Employee

Output ONLY this JSON structure, nothing else:
{
  "module": "${module.name}",
  "route": "${module.route}",
  "testCases": [
    {
      "id": "HP-${module.name.toUpperCase().replace(/\s+/g, '-')}-01",
      "title": "test title",
      "type": "happy-path",
      "priority": "high",
      "preconditions": ["User is logged in"],
      "steps": ["Navigate to ${module.route}", "step 2"],
      "expectedResult": "expected outcome"
    }
  ]
}

Generate exactly 6 test cases covering: page load, data display, navigation, key interactions, empty state, and one edge case.`;

      const raw  = await callOMLX(PLANNER_MODEL, systemPrompt, userPrompt, 3000);
      const plan = safeParseJSON(raw);

      if (!plan) {
        console.error(`  ❌ Failed to parse JSON for ${module.name}`);
        console.error(`  Raw (first 300 chars): ${raw.substring(0, 300)}`);
        results.push({ module: module.name, status: 'FAILED' });
        continue;
      }

      const fileName = `${module.name.toLowerCase().replace(/\s+/g, '-')}-plan.json`;
      const filePath = path.join(plansDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));

      console.log(`  ✅ ${plan.testCases?.length || 0} test cases — saved: ${fileName}`);
      results.push({ module: module.name, status: 'OK', testCount: plan.testCases?.length || 0, file: filePath });

    } catch (err: any) {
      console.error(`  ❌ Error: ${err.message}`);
      results.push({ module: module.name, status: 'ERROR', error: err.message });
    }

    // Small delay between calls
    await new Promise(r => setTimeout(r, 1000));
  }

  // Save stage summary
  const summaryPath = path.resolve(__dirname, '../tests/stage1-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  console.log('\n════════════════════════════════════════');
  console.log('  STAGE 1 SUMMARY');
  console.log('════════════════════════════════════════');
  results.forEach(r => {
    const icon = r.status === 'OK' ? '✅' : '❌';
    console.log(`  ${icon} ${r.module.padEnd(15)} — ${r.testCount || 0} test cases`);
  });

  const failed = results.filter(r => r.status !== 'OK');
  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} module(s) failed. Re-run or fix manually before Stage 2.`);
  } else {
    console.log('\n✅ All plans generated successfully!');
  }

  console.log('\n════════════════════════════════════════');
  console.log('  NEXT STEPS:');
  console.log('  1. Run: omlx-stop');
  console.log('  2. Then run Stage 2: npx ts-node --project tsconfig.json scripts/stage2-coder.ts');
  console.log('════════════════════════════════════════\n');
}

runPlanner().catch(console.error);
