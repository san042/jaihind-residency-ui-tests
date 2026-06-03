import * as fs from 'fs';
import * as path from 'path';

/**
 * Jaihind Residency — Test Report Generator
 * Reads reports/results.json → generates detailed HTML report
 * Columns: Test ID | Title | Steps | Expected Output | Actual Output | Result
 */

const resultsPath = path.resolve(__dirname, '../reports/results.json');
const reportPath  = path.resolve(__dirname, '../reports/test-report.html');
const csvPath     = path.resolve(__dirname, '../reports/test-report.csv');

const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

// ─── Step definitions per test ID ─────────────────────────────────────────────
const TEST_STEPS: Record<string, { steps: string[]; expected: string }> = {
  // Smoke
  'SM-01': { steps: ['Navigate to root URL /'], expected: 'HTTP response < 400' },
  'SM-02': { steps: ['Navigate to /', 'Wait for page load'], expected: 'Title matches "Jaihind Residency"' },
  'SM-03': { steps: ['Navigate to /auth', 'Wait for networkidle'], expected: 'Sign In button is visible' },
  'SM-04': { steps: ['Navigate to /auth', 'Check page text'], expected: '"Contact your administrator" message visible' },
  'SM-05': { steps: ['Navigate to /', 'Monitor console errors', 'Filter CORS/favicon errors'], expected: 'No critical console errors' },
  // Auth
  'HP-AUTH-01': { steps: ['Navigate to /'], expected: 'Page title matches "Jaihind Residency"' },
  'HP-AUTH-02': { steps: ['Navigate to /auth'], expected: 'Email input, password input, Sign In button visible' },
  'HP-AUTH-03': { steps: ['Navigate to /auth', 'Check email input'], expected: 'Placeholder = "you@example.com"' },
  'HP-AUTH-04': { steps: ['Navigate to /auth'], expected: '"Contact your administrator" message visible' },
  'HP-AUTH-05': { steps: ['Navigate to /auth', 'Fill email', 'Fill password', 'Click Sign In'], expected: 'Redirected to /dashboard' },
  'HP-AUTH-06': { steps: ['Login with valid credentials', 'Check dashboard'], expected: '"Employee Dashboard" heading visible' },
  'HP-AUTH-07': { steps: ['Login with valid credentials', 'Check navigation'], expected: 'All 9 nav links visible' },
  'HP-AUTH-08': { steps: ['Login', 'Click Sign Out'], expected: 'Redirected to /auth' },
  'HP-AUTH-09': { steps: ['Navigate to /auth', 'Fill invalid credentials', 'Click Sign In'], expected: 'User stays on /auth' },
  'HP-AUTH-10': { steps: ['Login', 'Navigate to /dashboard'], expected: 'Vacant Rooms table visible' },
  // Dashboard
  'HP-DASH-01': { steps: ['Login', 'Check heading'], expected: '"Employee Dashboard" heading visible' },
  'HP-DASH-02': { steps: ['Login', 'Check navigation'], expected: 'Navigation menu visible' },
  'HP-DASH-03': { steps: ['Login', 'Check Sign Out button'], expected: 'Sign Out button present and enabled' },
  'HP-DASH-04': { steps: ['Login', 'Check Vacant Rooms section'], expected: 'Vacant Rooms section visible' },
  'HP-DASH-05': { steps: ['Login', 'Check all nav links'], expected: '9 nav links: Dashboard, Rooms, Guests, Rent Details, Electricity, Billing, Maintenance, Laundry, Audit Log' },
  'HP-DASH-06': { steps: ['Login', 'Check page title'], expected: 'Title matches "Jaihind Residency"' },
  'HP-DASH-07': { steps: ['Login', 'Check maintenance section'], expected: 'Rooms Under Maintenance section visible' },
  // Rooms
  'HP-ROOMS-01': { steps: ['Login', 'Navigate to /rooms'], expected: 'Rooms page loads, URL = /rooms' },
  'HP-ROOMS-02': { steps: ['Login', 'Navigate to /rooms', 'Check content'], expected: 'Room data or empty state visible' },
  'HP-ROOMS-03': { steps: ['Login', 'Navigate to /rooms', 'Check room details'], expected: 'AC/Non-AC and location labels visible' },
  'HP-ROOMS-04': { steps: ['Login', 'Navigate to /rooms', 'Check Undo Checkout'], expected: 'Undo Checkout button present (or skipped if none)' },
  'HP-ROOMS-05': { steps: ['Login', 'Navigate to /rooms', 'Check status labels'], expected: 'Vacant/Occupied/Maintenance labels visible' },
  'HP-ROOMS-06': { steps: ['Login', 'Navigate to /rooms', 'Click Dashboard link'], expected: 'Navigated to /dashboard' },
  // Guests
  'HP-GUESTS-01': { steps: ['Login', 'Navigate to /guests'], expected: 'Guests page loads, URL = /guests' },
  'HP-GUESTS-02': { steps: ['Login', 'Navigate to /guests', 'Check table'], expected: 'Guest table or empty state visible' },
  'HP-GUESTS-03': { steps: ['Login', 'Navigate to /guests', 'Count rows'], expected: 'More than 1 row present in table' },
  'HP-GUESTS-04': { steps: ['Login', 'Navigate to /guests', 'Fill search input'], expected: 'Search filters results or shows no-results message' },
  'HP-GUESTS-05': { steps: ['Login', 'Navigate to /guests', 'Check empty state'], expected: '"No guests" message visible (skipped if guests exist)' },
  'HP-GUESTS-06': { steps: ['Login', 'Navigate to /guests', 'Search "@#$%"'], expected: 'Empty results or no rows shown' },
  // Billing
  'HP-BILLING-01': { steps: ['Login', 'Navigate to /billing'], expected: 'Billing page loads, URL = /billing' },
  'HP-BILLING-02': { steps: ['Login', 'Navigate to /billing', 'Check heading'], expected: 'Billing heading or content visible' },
  'HP-BILLING-03': { steps: ['Login', 'Navigate to /billing', 'Check table'], expected: 'Billing table or empty state visible' },
  'HP-BILLING-04': { steps: ['Login', 'Navigate to /billing', 'Check URL'], expected: 'URL stays at /billing (no redirect to auth)' },
  'HP-BILLING-05': { steps: ['Login', 'Navigate to /billing', 'Click Dashboard', 'Click Billing'], expected: 'Navigation between modules works' },
  'HP-BILLING-06': { steps: ['Login', 'Navigate to /billing', 'Check monthly bills'], expected: 'Monthly bills or auto-bill info visible' },
  // Electricity
  'HP-ELECTRICITY-01': { steps: ['Login', 'Navigate to /electricity'], expected: 'Electricity page loads, URL = /electricity' },
  'HP-ELECTRICITY-02': { steps: ['Login', 'Navigate to /electricity', 'Check table'], expected: 'Electricity data table or empty state visible' },
  'HP-ELECTRICITY-03': { steps: ['Login', 'Navigate to /electricity', 'Click Rooms', 'Click Electricity'], expected: 'Navigation between modules works' },
  'HP-ELECTRICITY-04': { steps: ['Login', 'Navigate to /electricity', 'Check heading'], expected: 'Electricity charges heading or summary visible' },
  'HP-ELECTRICITY-05': { steps: ['Login', 'Navigate to /electricity', 'Check empty state'], expected: 'Empty state visible (skipped if records exist)' },
  'HP-ELECTRICITY-06': { steps: ['Login', 'Navigate to /electricity', 'Check stability'], expected: 'Page loads without crash' },
  // Maintenance
  'HP-MAINTENANCE-01': { steps: ['Login', 'Navigate to /maintenance'], expected: 'Maintenance page loads, URL = /maintenance' },
  'HP-MAINTENANCE-02': { steps: ['Login', 'Navigate to /maintenance', 'Check data'], expected: 'Maintenance data or empty state visible' },
  'HP-MAINTENANCE-03': { steps: ['Login', 'Navigate to /maintenance', 'Click Rooms', 'Click Maintenance'], expected: 'Navigation between modules works' },
  'HP-MAINTENANCE-04': { steps: ['Login', 'Navigate to /maintenance', 'Check add button'], expected: 'Add request button present and enabled (if available)' },
  'HP-MAINTENANCE-05': { steps: ['Login', 'Navigate to /maintenance', 'Check summary'], expected: 'Expenses or summary section visible' },
  'HP-MAINTENANCE-06': { steps: ['Login', 'Navigate to /maintenance', 'Check stability'], expected: 'Page loads without crash, URL = /maintenance' },
  // Laundry
  'HP-LAUNDRY-01': { steps: ['Login', 'Navigate to /laundry'], expected: 'Laundry page loads, URL = /laundry' },
  'HP-LAUNDRY-02': { steps: ['Login', 'Navigate to /laundry', 'Check content'], expected: 'Laundry records or empty state visible' },
  'HP-LAUNDRY-03': { steps: ['Login', 'Navigate to /laundry', 'Check heading'], expected: 'Laundry heading visible' },
  'HP-LAUNDRY-04': { steps: ['Login', 'Navigate to /laundry', 'Click Dashboard', 'Click Laundry'], expected: 'Navigation between modules works' },
  'HP-LAUNDRY-05': { steps: ['Login', 'Navigate to /laundry', 'Check table columns'], expected: 'Table headers visible (skipped if no data)' },
  'HP-LAUNDRY-06': { steps: ['Open fresh browser (no auth)', 'Navigate to /laundry'], expected: 'Redirected to /auth' },
  // Rent Details
  'HP-RENT-DETAILS-01': { steps: ['Login', 'Navigate to /rent-details'], expected: 'Rent Details page loads, URL = /rent-details' },
  'HP-RENT-DETAILS-02': { steps: ['Login', 'Navigate to /rent-details', 'Check heading'], expected: '"Rent Details" heading visible' },
  'HP-RENT-DETAILS-03': { steps: ['Login', 'Navigate to /rent-details', 'Check description'], expected: '"Room-wise monthly rent register" text visible' },
  'HP-RENT-DETAILS-04': { steps: ['Login', 'Navigate to /rent-details', 'Check dropdown'], expected: '"Select Room" dropdown visible' },
  'HP-RENT-DETAILS-05': { steps: ['Login', 'Navigate to /rent-details', 'Check prompt'], expected: '"Select a room to view rent details" prompt visible' },
  'HP-RENT-DETAILS-06': { steps: ['Login', 'Navigate to /rent-details', 'Click Dashboard'], expected: 'Navigated to /dashboard' },
  // Audit Log
  'HP-AUDIT-LOG-01': { steps: ['Login', 'Navigate to /audit-log'], expected: 'Audit Log page loads, URL = /audit-log' },
  'HP-AUDIT-LOG-02': { steps: ['Login', 'Navigate to /audit-log', 'Check table'], expected: 'Audit log table or empty state visible' },
  'HP-AUDIT-LOG-03': { steps: ['Login', 'Navigate to /audit-log', 'Check table headers'], expected: 'Table column headers present' },
  'HP-AUDIT-LOG-04': { steps: ['Login', 'Navigate to /audit-log', 'Check heading'], expected: '"Audit Log" heading visible' },
  'HP-AUDIT-LOG-05': { steps: ['Login', 'Navigate to /audit-log', 'Click Dashboard'], expected: 'Navigated to /dashboard' },
  'HP-AUDIT-LOG-06': { steps: ['Open fresh browser (no auth)', 'Navigate to /audit-log'], expected: 'Redirected to /auth' },
};

// ─── Parse results ─────────────────────────────────────────────────────────────
interface TestRow {
  id:         string;
  suite:      string;
  title:      string;
  browser:    string;
  steps:      string;
  expected:   string;
  actual:     string;
  result:     string;
  duration:   number;
  skipReason: string;
}

const rows: TestRow[] = [];

for (const suite of data.suites) {
  for (const subSuite of (suite.suites || [])) {
    const suiteName = subSuite.title;
    for (const spec of (subSuite.specs || [])) {
      for (const test of (spec.tests || [])) {
        const result   = test.results?.[0];
        const status   = result?.status || 'unknown';
        const duration = result?.duration || 0;
        const errors   = result?.errors || [];
        const skipNote = test.annotations?.find((a: any) => a.type === 'skip')?.description || '';

        // Extract test ID from title (e.g. "HP-AUTH-01: ..." → "HP-AUTH-01")
        const idMatch = spec.title.match(/^([A-Z]+-[A-Z]+-?\d+)/);
        const testId  = idMatch ? idMatch[1] : spec.title.substring(0, 20);

        // Get step definitions
        const stepDef  = TEST_STEPS[testId];
        const steps    = stepDef?.steps.join(' → ') || 'See spec file';
        const expected = stepDef?.expected || 'See spec file';

        // Determine actual output
        let actual = '';
        if (status === 'passed')  actual = expected;
        else if (status === 'skipped') actual = `Skipped: ${skipNote}`;
        else if (errors.length > 0) {
          actual = errors[0]?.message?.split('\n')[0] || 'Test failed';
        } else actual = 'Test failed';

        // Result badge
        let resultLabel = '';
        if (status === 'passed')       resultLabel = 'PASS';
        else if (status === 'skipped') resultLabel = 'SKIP';
        else                           resultLabel = 'FAIL';

        rows.push({
          id:         testId,
          suite:      suiteName,
          title:      spec.title,
          browser:    test.projectName,
          steps,
          expected,
          actual,
          result:     resultLabel,
          duration:   Math.round(duration / 1000),
          skipReason: skipNote,
        });
      }
    }
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────
const total   = rows.length;
const passed  = rows.filter(r => r.result === 'PASS').length;
const failed  = rows.filter(r => r.result === 'FAIL').length;
const skipped = rows.filter(r => r.result === 'SKIP').length;
const passRate = ((passed / (total - skipped)) * 100).toFixed(1);
const runDate = new Date(data.stats.startTime).toLocaleString();
const duration = Math.round(data.stats.duration / 1000);

// ─── Group by suite ────────────────────────────────────────────────────────────
const suiteMap: Record<string, TestRow[]> = {};
for (const row of rows) {
  if (!suiteMap[row.suite]) suiteMap[row.suite] = [];
  suiteMap[row.suite].push(row);
}

// ─── HTML Report ───────────────────────────────────────────────────────────────
const suiteRows = Object.entries(suiteMap).map(([suiteName, tests]) => {
  const sp = tests.filter(t => t.result === 'PASS').length;
  const sf = tests.filter(t => t.result === 'FAIL').length;
  const ss = tests.filter(t => t.result === 'SKIP').length;
  const uniqueTests = tests.filter(t => t.browser === 'chromium'); // one row per test

  const testRows = uniqueTests.map(t => `
    <tr class="${t.result.toLowerCase()}">
      <td class="id">${t.id}</td>
      <td class="title">${t.title.replace(t.id + ': ', '')}</td>
      <td class="steps">${t.steps.split(' → ').map(s => `<div class="step">▶ ${s}</div>`).join('')}</td>
      <td class="expected">${t.expected}</td>
      <td class="actual">${t.actual}</td>
      <td class="result-cell">
        <span class="badge badge-${t.result.toLowerCase()}">${t.result === 'PASS' ? '✅ PASS' : t.result === 'SKIP' ? '⏭️ SKIP' : '❌ FAIL'}</span>
        <div class="duration">${t.duration}s</div>
      </td>
    </tr>`).join('');

  return `
  <div class="suite-block">
    <div class="suite-header">
      <h2>${suiteName}</h2>
      <div class="suite-stats">
        <span class="badge badge-pass">✅ ${sp / 2} passed</span>
        ${sf > 0 ? `<span class="badge badge-fail">❌ ${sf / 2} failed</span>` : ''}
        ${ss > 0 ? `<span class="badge badge-skip">⏭️ ${ss / 2} skipped</span>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Test ID</th>
          <th>Test Case</th>
          <th>Test Steps</th>
          <th>Expected Output</th>
          <th>Actual Output</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>${testRows}</tbody>
    </table>
  </div>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jaihind Residency — Test Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #333; }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 32px 40px; }
  .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .header .subtitle { opacity: 0.7; font-size: 14px; }
  .summary { display: flex; gap: 16px; padding: 24px 40px; flex-wrap: wrap; }
  .stat-card { background: white; border-radius: 12px; padding: 20px 28px; flex: 1; min-width: 140px;
               box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: center; }
  .stat-card .num { font-size: 36px; font-weight: 700; }
  .stat-card .lbl { font-size: 13px; color: #888; margin-top: 4px; }
  .num.green  { color: #22c55e; }
  .num.red    { color: #ef4444; }
  .num.yellow { color: #f59e0b; }
  .num.blue   { color: #3b82f6; }
  .num.purple { color: #8b5cf6; }
  .content { padding: 0 40px 40px; }
  .suite-block { background: white; border-radius: 12px; margin-bottom: 24px;
                 box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
  .suite-header { display: flex; justify-content: space-between; align-items: center;
                  padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
  .suite-header h2 { font-size: 16px; font-weight: 600; color: #1e293b; }
  .suite-stats { display: flex; gap: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; padding: 12px 16px; text-align: left; font-size: 12px;
       font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr.pass { background: #fff; }
  tr.fail { background: #fff5f5; }
  tr.skip { background: #fffbf0; }
  tr:hover { background: #f8fafc !important; }
  .id { font-family: monospace; font-weight: 600; color: #3b82f6; white-space: nowrap; }
  .title { font-weight: 500; color: #1e293b; max-width: 200px; }
  .steps { max-width: 220px; }
  .step { color: #64748b; font-size: 12px; padding: 2px 0; }
  .expected { color: #059669; font-size: 12px; max-width: 180px; }
  .actual { color: #334155; font-size: 12px; max-width: 180px; }
  .result-cell { text-align: center; white-space: nowrap; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-pass { background: #dcfce7; color: #16a34a; }
  .badge-fail { background: #fee2e2; color: #dc2626; }
  .badge-skip { background: #fef9c3; color: #ca8a04; }
  .duration { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 8px 40px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); border-radius: 4px; }
  .meta { padding: 0 40px 8px; font-size: 13px; color: #64748b; display: flex; gap: 24px; }
  @media print { body { background: white; } .suite-block { box-shadow: none; border: 1px solid #e5e7eb; } }
</style>
</head>
<body>

<div class="header">
  <h1>🏨 Jaihind Residency — Test Execution Report</h1>
  <div class="subtitle">Automated UI Testing with Playwright • ${runDate}</div>
</div>

<div class="summary">
  <div class="stat-card"><div class="num blue">${total / 2}</div><div class="lbl">Total Tests</div></div>
  <div class="stat-card"><div class="num green">${passed / 2}</div><div class="lbl">Passed</div></div>
  <div class="stat-card"><div class="num red">${failed / 2}</div><div class="lbl">Failed</div></div>
  <div class="stat-card"><div class="num yellow">${skipped / 2}</div><div class="lbl">Skipped</div></div>
  <div class="stat-card"><div class="num purple">${passRate}%</div><div class="lbl">Pass Rate</div></div>
  <div class="stat-card"><div class="num blue">${duration}s</div><div class="lbl">Duration</div></div>
</div>

<div class="progress-bar">
  <div class="progress-fill" style="width: ${passRate}%"></div>
</div>

<div class="meta">
  <span>📅 Run Date: ${runDate}</span>
  <span>🌐 Browsers: Chromium + Mobile Chrome</span>
  <span>🔗 App: https://jaihindresidency.lovable.app</span>
  <span>⏱️ Total Duration: ${Math.floor(duration/60)}m ${duration%60}s</span>
</div>

<div class="content">
${suiteRows}
</div>

</body>
</html>`;

fs.writeFileSync(reportPath, html);

// ─── CSV Report ────────────────────────────────────────────────────────────────
const csvHeader = 'Test ID,Suite,Title,Browser,Steps,Expected Output,Actual Output,Result,Duration(s)\n';
const csvContent = rows.map(r =>
  [r.id, r.suite, `"${r.title}"`, r.browser,
   `"${r.steps}"`, `"${r.expected}"`, `"${r.actual}"`,
   r.result, r.duration].join(',')
).join('\n');

fs.writeFileSync(csvPath, csvHeader + csvContent);

console.log('\n✅ Reports generated:');
console.log(`   HTML → ${reportPath}`);
console.log(`   CSV  → ${csvPath}`);
console.log(`\n📊 Summary:`);
console.log(`   Total:    ${total / 2} tests`);
console.log(`   Passed:   ${passed / 2}`);
console.log(`   Failed:   ${failed / 2}`);
console.log(`   Skipped:  ${skipped / 2}`);
console.log(`   Pass Rate: ${passRate}%`);
console.log(`   Duration:  ${Math.floor(duration/60)}m ${duration%60}s`);
console.log('\n💡 Open reports/test-report.html in your browser to view the report\n');
