# 🏨 Jaihind Residency — Automated UI Test Suite

Automated UI testing for [Jaihind Residency](https://jaihindresidency.lovable.app) lodge management system using **Playwright + TypeScript**.

---

## 📊 Test Results

| Metric | Value |
|--------|-------|
| Total Tests | 65 unique tests (130 with browsers) |
| ✅ Passed | 124 |
| ⏭️ Skipped | 6 (data-dependent, correct behaviour) |
| ❌ Failed | 0 |
| Pass Rate | 100% |
| Browsers | Chromium + Mobile Chrome |
| Duration | ~3m 30s |

---

## 🏗️ Project Structure
jaihind-ui-testing/
├── tests/
│   ├── smoke/                    # Quick sanity checks (5 tests)
│   │   └── jaihind-smoke.spec.ts
│   ├── happy-path/               # Full functional tests (60 tests)
│   │   ├── jaihind-auth.spec.ts
│   │   ├── jaihind-dashboard.spec.ts
│   │   ├── jaihind-rooms.spec.ts
│   │   ├── jaihind-guests.spec.ts
│   │   ├── jaihind-billing.spec.ts
│   │   ├── jaihind-electricity.spec.ts
│   │   ├── jaihind-maintenance.spec.ts
│   │   ├── jaihind-laundry.spec.ts
│   │   ├── jaihind-rent-details.spec.ts
│   │   └── jaihind-audit-log.spec.ts
│   ├── generated-plans/          # AI-generated test plans (oq6e-planner)
│   └── generated-reviews/        # AI review reports (qwen-reviewer)
├── pages/                        # Page Object Models (POM)
│   ├── JaihindBasePage.ts
│   ├── JaihindLoginPage.ts
│   └── JaihindDashboardPage.ts
├── fixtures/                     # Test data
│   ├── jaihind-testData.json
│   └── jaihind-users.json
├── scripts/                      # Utility scripts
│   ├── stage1-planner.ts         # oMLX test plan generator
│   ├── stage2-coder.ts           # oMLX spec file generator
│   ├── stage3-reviewer.ts        # oMLX spec reviewer
│   ├── generate-report.ts        # HTML + CSV report generator
│   └── inspect-*.ts              # DOM inspection scripts
├── reports/                      # Generated reports (gitignored)
├── playwright.config.ts
├── package.json
└── tsconfig.json
---

## 🧪 Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Smoke | 5 | ✅ |
| Authentication | 10 | ✅ |
| Dashboard | 7 | ✅ |
| Rooms | 6 | ✅ |
| Guests | 6 | ✅ |
| Billing | 6 | ✅ |
| Electricity | 6 | ✅ |
| Maintenance | 6 | ✅ |
| Laundry | 6 | ✅ |
| Rent Details | 6 | ✅ |
| Audit Log | 6 | ✅ |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm

### Install

```bash
npm install
npx playwright install chromium
```

### Configure

```bash
cp .env.example .env
# Edit .env with your credentials:
# TEST_USER_EMAIL=your@email.com
# TEST_USER_PASSWORD=yourpassword
```

### Run Tests

```bash
# Smoke tests only (fast ~30s)
npx playwright test tests/smoke/ --reporter=list

# Happy path tests
npx playwright test tests/happy-path/ --reporter=list

# All tests
npx playwright test --reporter=list

# Single module
npx playwright test tests/happy-path/jaihind-auth.spec.ts --reporter=list
```

### Generate HTML Report

```bash
# Run tests and save JSON results
npx playwright test tests/happy-path/ tests/smoke/ --reporter=json 2>/dev/null | python3 -c "
import sys,json
c=sys.stdin.read()
s=c.find('{'); e=c.rfind('}')+1
open('reports/results.json','w').write(c[s:e])
"

# Generate HTML + CSV report
npx ts-node --project tsconfig.json scripts/generate-report.ts

# Open report
open reports/test-report.html
```

---

## 🤖 AI-Generated Tests (oMLX)

Test plans and specs for modules were generated using local LLMs via **oMLX**:
Stage 1: oq6e-planner      → JSON test plans
npx ts-node scripts/stage1-planner.ts
Stage 2: qwen3-coder        → Playwright .spec.ts files
omlx-stop
npx ts-node scripts/stage2-coder.ts
Stage 3: qwen-reviewer      → Quality review + gap analysis
omlx-stop
npx ts-node scripts/stage3-reviewer.ts
> ⚠️ Requires oMLX running at `http://localhost:8000`

---

## 📋 Report Format

The generated HTML report includes per test case:

| Test ID | Suite | Test Case | Test Steps | Expected Output | Actual Output | Result |
|---------|-------|-----------|------------|-----------------|---------------|--------|

---

## ⚙️ n8n Automation (Attempted)

We attempted to integrate with **n8n** (self-hosted Docker) to automate:
- Scheduled test runs
- HTML report generation
- Result reporting

**Blocker:** n8n uses a Docker Hardened Alpine image that strips system graphics libraries (`libglib`, `libX11`, `libnss`, etc.) required by Chromium/Playwright.

**Recommended Solutions:**
1. Use `mcr.microsoft.com/playwright:v1.52.0` Docker image for test execution
2. Run Playwright tests on the host machine and have n8n read `reports/results.json`
3. Use GitHub Actions for scheduled CI/CD test runs (see below)

---

## 🔄 Recommended CI/CD (GitHub Actions)

Create `.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 9 * * *'  # Daily at 9am

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npx playwright install chromium
      - run: npx playwright test
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: reports/
```

---

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `BASE_URL` | App URL (default: https://jaihindresidency.lovable.app) |
| `TEST_USER_EMAIL` | Login email |
| `TEST_USER_PASSWORD` | Login password |
| `OMLX_API_KEY` | oMLX API key (default: local) |
| `OMLX_BASE_URL` | oMLX server URL (default: http://localhost:8000) |

> ⚠️ Never commit `.env` to git

---

## 🛠️ Tech Stack

- [Playwright](https://playwright.dev) — Browser automation
- [TypeScript](https://typescriptlang.org) — Type-safe test code
- [oMLX](https://github.com/jundot/omlx) — Local LLM inference
- Page Object Model (POM) design pattern
