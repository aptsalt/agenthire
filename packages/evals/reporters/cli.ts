import type { EvalSuiteReport } from "../src/types.js";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const RESULTS_DIR = "eval-results";

function printReport(report: EvalSuiteReport): void {
  const passEmoji = report.passRate >= 0.9 ? "PASS" : report.passRate >= 0.7 ? "WARN" : "FAIL";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${passEmoji}] ${report.suiteName} (${report.agentName})`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Pass Rate: ${(report.passRate * 100).toFixed(1)}%`);
  console.log(`Total Latency: ${report.totalLatencyMs}ms`);
  console.log(`Total Cost: $${report.totalCost.toFixed(4)}`);
  console.log(`Timestamp: ${report.timestamp}`);

  console.log(`\nAverage Scores:`);
  for (const [key, value] of Object.entries(report.averageScores)) {
    const bar = "#".repeat(Math.round(value * 20)) + "-".repeat(20 - Math.round(value * 20));
    console.log(`  ${key.padEnd(25)} [${bar}] ${(value * 100).toFixed(1)}%`);
  }

  console.log(`\nTest Cases:`);
  for (const result of report.results) {
    const status = result.passed ? "PASS" : "FAIL";
    console.log(`  [${status}] ${result.testCaseId} (${result.latencyMs}ms, $${(result.tokenUsage?.estimatedCost ?? 0).toFixed(4)})`);
    for (const detail of result.details) {
      const detailStatus = detail.passed ? "ok" : "FAIL";
      console.log(`    [${detailStatus}] ${detail.criterion}: ${detail.score}/${detail.maxScore}`);
      if (!detail.passed) {
        console.log(`         ${detail.reasoning.slice(0, 100)}`);
      }
    }
  }
}

function main(): void {
  if (!existsSync(RESULTS_DIR)) {
    console.log("No eval results found. Run `npm run eval` first.");
    process.exit(1);
  }

  const files = readdirSync(RESULTS_DIR).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No eval result files found.");
    process.exit(1);
  }

  console.log(`\nAgentHire Eval Report`);
  console.log(`Found ${files.length} eval suite(s)\n`);

  let allPassed = true;

  for (const file of files) {
    const content = readFileSync(`${RESULTS_DIR}/${file}`, "utf-8");
    const report = JSON.parse(content) as EvalSuiteReport;
    printReport(report);
    if (report.passRate < 0.7) allPassed = false;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(allPassed ? "[PASS] All suites passed" : "[FAIL] Some suites failed");
  console.log(`${"=".repeat(60)}\n`);

  process.exit(allPassed ? 0 : 1);
}

main();
