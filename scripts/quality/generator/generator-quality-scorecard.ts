import { createHash } from "node:crypto";

import type {
  GeneratorQualityBaselineIdentity,
  GeneratorQualityCaseResult,
  GeneratorQualityCategory,
  GeneratorQualityScorecard,
} from "./generator-quality.types.ts";

export function createGeneratorQualityScorecard(
  corpusMode: "synthetic" | "external",
  baselineIdentity: GeneratorQualityBaselineIdentity,
  inputCases: readonly GeneratorQualityCaseResult[],
  authoritativeBaseline = false,
): GeneratorQualityScorecard {
  const cases = Object.freeze(
    [...inputCases].sort((left, right) => left.id.localeCompare(right.id)),
  );
  const categories = [...new Set(cases.map((item) => item.category))].sort();
  const categorySummary = Object.freeze(
    categories.map((category) => summarizeCategory(category, cases)),
  );
  const passedGateCount = cases.reduce(
    (sum, item) =>
      sum + item.hardGates.filter((gate) => gate.status === "passed").length,
    0,
  );
  const failedGateCount = cases.reduce(
    (sum, item) =>
      sum + item.hardGates.filter((gate) => gate.status === "failed").length,
    0,
  );
  const base = {
    schemaVersion: "1.0.0" as const,
    corpusMode,
    baselineIdentity,
    authoritativeBaseline,
    cases,
    categorySummary,
    overallSummary: Object.freeze({
      caseCount: cases.length,
      passedGateCount,
      failedGateCount,
      improvedCaseCount: cases.filter(
        (item) => item.comparisonStatus === "improved",
      ).length,
      regressedCaseCount: cases.filter(
        (item) => item.comparisonStatus === "regressed",
      ).length,
    }),
  };
  const canonicalScorecardSha256 = createHash("sha256")
    .update(serializeCanonicalJson(base))
    .digest("hex");
  return Object.freeze({ ...base, canonicalScorecardSha256 });
}

export function serializeGeneratorQualityScorecard(
  scorecard: GeneratorQualityScorecard,
): string {
  return serializeCanonicalJson(scorecard);
}

export function serializeCanonicalJson(input: unknown): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

export function createGeneratorQualityMarkdown(
  scorecard: GeneratorQualityScorecard,
): string {
  const lines = [
    "# Poparooz Generator Quality Summary",
    "",
    `- Corpus mode: ${scorecard.corpusMode}`,
    `- Corpus version: ${scorecard.baselineIdentity.corpusManifestVersion}`,
    `- Git commit: ${scorecard.baselineIdentity.gitCommit}`,
    `- Cases: ${scorecard.overallSummary.caseCount}`,
    `- Passed hard gates: ${scorecard.overallSummary.passedGateCount}`,
    `- Failed hard gates: ${scorecard.overallSummary.failedGateCount}`,
    `- Authoritative baseline: ${scorecard.authoritativeBaseline ? "yes" : "no"}`,
    "",
    "This summary contains metrics only. It contains no image pixels, local paths, user names, timestamps, or machine identity.",
    "",
    "## Category summary",
    "",
    "| Category | Cases | Passed gates | Failed gates |",
    "|---|---:|---:|---:|",
    ...scorecard.categorySummary.map(
      (item) =>
        `| ${item.category} | ${item.caseCount} | ${item.passedGateCount} | ${item.failedGateCount} |`,
    ),
    "",
    "## Cases",
    "",
    "| Case | Mode | Size | Beads | FP background | Lost subject | Singletons | Gate |",
    "|---|---|---:|---:|---:|---:|---:|---|",
    ...scorecard.cases.map((item) => {
      const gate = item.hardGates.some((entry) => entry.status === "failed")
        ? "FAIL"
        : "PASS";
      return `| ${item.id} | ${item.settings.background} | ${item.settings.size} | ${item.metrics.pattern.totalBeads} | ${item.metrics.background.falseBackgroundOccupied} | ${item.metrics.background.lostSubject} | ${item.metrics.background.singletonCount} | ${gate} |`;
    }),
    "",
    "No weighted overall quality score is calculated.",
    "",
  ];
  return lines.join("\n");
}

export function generatorQualityExitCode(
  scorecard: GeneratorQualityScorecard,
): 0 | 1 {
  return scorecard.overallSummary.failedGateCount === 0 ? 0 : 1;
}

function summarizeCategory(
  category: GeneratorQualityCategory,
  cases: readonly GeneratorQualityCaseResult[],
) {
  const selected = cases.filter((item) => item.category === category);
  return Object.freeze({
    category,
    caseCount: selected.length,
    passedGateCount: selected.reduce(
      (sum, item) =>
        sum + item.hardGates.filter((gate) => gate.status === "passed").length,
      0,
    ),
    failedGateCount: selected.reduce(
      (sum, item) =>
        sum + item.hardGates.filter((gate) => gate.status === "failed").length,
      0,
    ),
  });
}
