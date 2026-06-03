import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const OMLX_BASE_URL = process.env.OMLX_BASE_URL || "http://localhost:8000";
const OMLX_API_KEY = process.env.OMLX_API_KEY || "local";
const REVIEWER_MODEL = process.env.REVIEWER_MODEL || "qwen-reviewer";

// ── Fix 1: Reduced max_tokens + thinking disabled ─────────────────────────
async function callOMLX(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 800, // Fix 4: reduced from 2000 → 800 (saves ~4x time per file)
): Promise<string> {
  const response = await fetch(`${OMLX_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OMLX_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      // Fix 2: Disable thinking mode — prevents reasoning traces leaking into JSON
      thinking: { type: "disabled" },
      extra_body: { enable_thinking: false },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `oMLX API error: ${response.status} ${response.statusText} — ${errorText}`,
    );
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content || "";

  // Fix 1: Strip thinking blocks if model still outputs them despite disable flag
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*?(?=\{)/m, "") // strip any preamble before first {
    .trim();
}

// ── Fix 3: Robust JSON parser with multiple fallback strategies ───────────
function safeParseJSON(raw: string): any {
  if (!raw || raw.trim().length === 0) return null;

  // Strategy 1: Parse directly if raw is already valid JSON
  try {
    return JSON.parse(raw.trim());
  } catch {
    /* fall through */
  }

  // Strategy 2: Strip thinking blocks and retry
  const noThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  try {
    return JSON.parse(noThink);
  } catch {
    /* fall through */
  }

  // Strategy 3: Strip markdown code fences (```json ... ```)
  const noFences = noThink
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    return JSON.parse(noFences);
  } catch {
    /* fall through */
  }

  // Strategy 4: Extract first complete JSON object
  const match = noFences.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      /* fall through */
    }
  }

  // Strategy 5: Extract from anywhere in raw (last resort)
  const rawMatch = raw.match(/\{[\s\S]*\}/);
  if (rawMatch) {
    try {
      return JSON.parse(rawMatch[0]);
    } catch {
      /* fall through */
    }
  }

  return null;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function runReviewer() {
  console.log("🚀 STAGE 3: Spec Review");
  console.log(`   Model: ${REVIEWER_MODEL}`);
  console.log(`   oMLX:  ${OMLX_BASE_URL}\n`);

  const specsDir = path.resolve(__dirname, "../tests/happy-path");
  const reviewsDir = path.resolve(__dirname, "../tests/generated-reviews");
  ensureDir(reviewsDir);

  // Find all generated spec files (exclude auth and dashboard)
  const specFiles = fs
    .readdirSync(specsDir)
    .filter(
      (f) =>
        f.startsWith("jaihind-") &&
        f.endsWith(".spec.ts") &&
        !f.includes("auth") &&
        !f.includes("dashboard"),
    );

  if (specFiles.length === 0) {
    console.error("❌ No generated spec files found. Run Stage 2 first.");
    process.exit(1);
  }

  console.log(`   Found ${specFiles.length} spec files to review\n`);

  const results: any[] = [];

  for (const specFile of specFiles) {
    const moduleName = specFile
      .replace("jaihind-", "")
      .replace(".spec.ts", "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const specPath = path.join(specsDir, specFile);
    const spec = fs.readFileSync(specPath, "utf-8");

    console.log(`\n🔍 Reviewing: ${specFile}...`);

    try {
      // Fix 2: Explicit instruction to output ONLY JSON — no thinking, no preamble
      const systemPrompt = `You are a senior QA code reviewer specialising in Playwright TypeScript tests.
CRITICAL RULES:
- Output ONLY a valid JSON object. Nothing else.
- Do NOT output any thinking, reasoning, preamble, or explanation.
- Do NOT use markdown code fences.
- Start your response with { and end with }.
- No text before { and no text after }.`;

      const userPrompt = `Review this Playwright TypeScript spec file for the "${moduleName}" module.

${spec}

Check:
1. Correct dotenv setup (dotenv.config with path.resolve)
2. Proper beforeEach login flow
3. Correct use of getByRole/getByText/getByLabel (not CSS selectors)
4. Appropriate timeouts
5. Empty state handling
6. Test isolation (no shared state between tests)
7. Missing coverage gaps

Respond with ONLY this JSON object (no other text):
{"module":"${moduleName}","overallScore":8,"approved":true,"issues":[{"severity":"critical|warning|info","issue":"description","fix":"how to fix"}],"missingCoverage":["scenario"],"strengths":["good practice"]}`;

      const raw = await callOMLX(REVIEWER_MODEL, systemPrompt, userPrompt, 800);
      const review = safeParseJSON(raw);

      if (!review) {
        console.error(`  ⚠️  Could not parse review JSON for ${moduleName}`);
        console.error(
          `  Raw output (first 400 chars):\n  ${raw.substring(0, 400)}`,
        );

        // Save raw for debugging
        const debugFile = path.join(
          reviewsDir,
          specFile.replace(".spec.ts", "-debug.txt"),
        );
        fs.writeFileSync(debugFile, raw);
        console.error(`  Raw saved to: ${debugFile}`);

        results.push({ module: moduleName, status: "PARSE_FAILED" });
        continue;
      }

      const reviewFile = path.join(
        reviewsDir,
        specFile.replace(".spec.ts", "-review.json"),
      );
      fs.writeFileSync(reviewFile, JSON.stringify(review, null, 2));

      const criticalCount =
        review.issues?.filter((i: any) => i.severity === "critical").length ||
        0;
      const warnCount =
        review.issues?.filter((i: any) => i.severity === "warning").length || 0;
      console.log(
        `  ✅ Score: ${review.overallScore}/10 | Approved: ${review.approved} | Critical: ${criticalCount} | Warnings: ${warnCount}`,
      );

      if (criticalCount > 0) {
        review.issues
          .filter((i: any) => i.severity === "critical")
          .forEach((i: any) => console.log(`     🔴 ${i.issue}`));
      }

      results.push({
        module: moduleName,
        status: "OK",
        score: review.overallScore,
        approved: review.approved,
        critical: criticalCount,
        warnings: warnCount,
        missing: review.missingCoverage?.length || 0,
        file: reviewFile,
      });
    } catch (err: any) {
      console.error(`  ❌ Error reviewing ${moduleName}: ${err.message}`);
      results.push({ module: moduleName, status: "ERROR", error: err.message });
    }

    // Small delay between requests to avoid oMLX queue pressure
    await new Promise((r) => setTimeout(r, 500));
  }

  // Save stage summary
  const summaryPath = path.resolve(__dirname, "../tests/stage3-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  // Final consolidated report
  try {
    const stage1Path = path.resolve(__dirname, "../tests/stage1-summary.json");
    const stage2Path = path.resolve(__dirname, "../tests/stage2-summary.json");
    const stage1 = fs.existsSync(stage1Path)
      ? JSON.parse(fs.readFileSync(stage1Path, "utf-8"))
      : [];
    const stage2 = fs.existsSync(stage2Path)
      ? JSON.parse(fs.readFileSync(stage2Path, "utf-8"))
      : [];

    const report = {
      generatedAt: new Date().toISOString(),
      totalModules: results.length,
      approved: results.filter((r) => r.approved).length,
      parseFailures: results.filter((r) => r.status === "PARSE_FAILED").length,
      errors: results.filter((r) => r.status === "ERROR").length,
      stages: { stage1, stage2, stage3: results },
    };

    const reportPath = path.resolve(__dirname, "../tests/pipeline-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } catch (e: any) {
    console.warn(`  ⚠️  Could not write consolidated report: ${e.message}`);
  }

  // Summary
  const okCount = results.filter((r) => r.status === "OK").length;
  const failCount = results.filter((r) => r.status !== "OK").length;

  console.log("\n════════════════════════════════════════");
  console.log("  STAGE 3 SUMMARY");
  console.log("════════════════════════════════════════");
  results.forEach((r) => {
    const icon =
      r.status === "OK" && r.approved ? "✅" : r.status === "OK" ? "⚠️ " : "❌";
    const score = r.score !== undefined ? ` | Score: ${r.score}/10` : "";
    const crit = r.critical > 0 ? ` | 🔴 ${r.critical} critical` : "";
    const warn = r.warnings > 0 ? ` | ⚠️  ${r.warnings} warnings` : "";
    console.log(`  ${icon} ${r.module.padEnd(20)}${score}${crit}${warn}`);
  });

  console.log(
    `\n  Total: ${results.length} | OK: ${okCount} | Failed: ${failCount}`,
  );
  console.log("\n════════════════════════════════════════");
  console.log("  NEXT STEPS:");
  console.log("  1. Run: omlx-stop");
  console.log("  2. Review specs:   tests/happy-path/");
  console.log("  3. Review reports: tests/generated-reviews/");
  console.log("  4. Run all tests:  npx playwright test --reporter=list");
  console.log("  5. Build n8n workflow!");
  console.log("════════════════════════════════════════\n");
}

runReviewer().catch(console.error);
