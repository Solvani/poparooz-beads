import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { verifyFrozenGeneratorQualityFiles } from "./generator-quality-baseline.ts";
import { readGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import { decodeGeneratorQualityPng } from "./generator-quality-png.ts";
import {
  loadGeneratorQualityDependencies,
  replayExternalQualityCase,
} from "./generator-quality-replay.ts";
import { resolveExternalCorpus } from "./generator-quality-resolver.ts";
import { serializeCanonicalJson } from "./generator-quality-scorecard.ts";
import type {
  GeneratorQualityCaseDeclaration,
  GeneratorQualityCaseMetrics,
  GeneratorQualityCaseResult,
  GeneratorQualityScorecard,
} from "./generator-quality.types.ts";

const repositoryRoot = process.cwd();
const corpusRoot = process.env.POPAROOZ_QUALITY_CORPUS_DIR;
if (corpusRoot === undefined || corpusRoot.trim() === "") {
  throw new Error("POPAROOZ_QUALITY_CORPUS_DIR is required.");
}

const manifestPath = path.join(
  repositoryRoot,
  "data-source/quality/generator-corpus/1.0.0/manifest.json",
);
const baselineScorecardPath = path.join(
  repositoryRoot,
  "data-source/quality/generator-baselines/1.0.0/generator-quality-scorecard.json",
);
const baselineSummaryPath = path.join(
  repositoryRoot,
  "data-source/quality/generator-baselines/1.0.0/generator-quality-summary.md",
);
const outputDirectory = path.join(repositoryRoot, ".quality-output/h03-d02");

const manifestResult = await readGeneratorQualityManifest(manifestPath);
const baselineScorecardBytes = readFileSync(baselineScorecardPath, "utf8");
const baselineScorecard = parseBaselineScorecard(baselineScorecardBytes);
if (
  !baselineScorecard.authoritativeBaseline ||
  baselineScorecard.baselineIdentity.baselineVersion !== "1.0.0" ||
  baselineScorecard.baselineIdentity.corpusManifestSha256 !==
    manifestResult.sha256
) {
  throw new Error("The authoritative baseline identity is invalid.");
}
const frozenHashes = verifyFrozenGeneratorQualityFiles(repositoryRoot);
const resolved = await resolveExternalCorpus(
  manifestResult.manifest,
  corpusRoot,
);
const byLogicalId = new Map(resolved.map((item) => [item.logicalId, item]));
const dependencies = loadGeneratorQualityDependencies(repositoryRoot);
const baselineById = new Map(
  baselineScorecard.cases.map((item) => [item.id, item]),
);

const comparisons: CandidateComparison[] = [];
const performance: PerformanceComparison[] = [];
const explicitAlphaProbes: ExplicitAlphaProbe[] = [];
for (const declaration of manifestResult.manifest.cases
  .filter((item) => item.sourceKind === "external-curated")
  .sort((left, right) => left.id.localeCompare(right.id))) {
  const source = decodeInput(declaration.input.logicalId, declaration.input);
  const reference =
    declaration.reference.type === "trusted-alpha-pair"
      ? decodeInput(
          declaration.reference.input.logicalId,
          declaration.reference.input,
        )
      : undefined;
  for (const background of declaration.supportedBackgrounds) {
    for (const size of declaration.supportedPatternSizes) {
      const baselineReplay = replayExternalQualityCase(
        declaration,
        source,
        reference,
        background,
        size,
        dependencies,
      );
      const candidateReplay = replayExternalQualityCase(
        declaration,
        source,
        reference,
        background,
        size,
        dependencies,
        "h03-d02",
      );
      const frozenCase = baselineById.get(candidateReplay.result.id);
      if (frozenCase === undefined) {
        throw new Error("The candidate case is missing from the baseline.");
      }
      if (!metricsEqual(frozenCase.metrics, baselineReplay.result.metrics)) {
        throw new Error("Fresh baseline replay differs from Baseline 1.0.0.");
      }
      comparisons.push(
        comparison(frozenCase, candidateReplay.result, declaration.id),
      );
      performance.push(
        Object.freeze({
          id: candidateReplay.result.id,
          baselineTotalMs: baselineReplay.performance.totalMs,
          candidateTotalMs: candidateReplay.performance.totalMs,
          candidatePostResizeCleanupMs:
            candidateReplay.performance.postResizeCleanupMs,
        }),
      );
    }
  }

  if (declaration.reference.type === "trusted-alpha-pair") {
    const explicitSource = decodeInput(
      declaration.reference.input.logicalId,
      declaration.reference.input,
    );
    const explicitDeclaration: GeneratorQualityCaseDeclaration = {
      ...declaration,
      id: `${declaration.id}-explicit-alpha-probe`,
      input: declaration.reference.input,
      reference: {
        ...declaration.reference,
        input: declaration.reference.input,
      },
    };
    for (const size of declaration.supportedPatternSizes) {
      const baselineProbe = replayExternalQualityCase(
        explicitDeclaration,
        explicitSource,
        explicitSource,
        "transparent",
        size,
        dependencies,
      ).result;
      const candidateProbe = replayExternalQualityCase(
        explicitDeclaration,
        explicitSource,
        explicitSource,
        "transparent",
        size,
        dependencies,
        "h03-d02",
      ).result;
      explicitAlphaProbes.push(
        Object.freeze({
          id: candidateProbe.id,
          byteEquivalent:
            serializeCanonicalJson(baselineProbe.metrics) ===
              serializeCanonicalJson(candidateProbe.metrics) &&
            candidateProbe.diagnostics.h03Candidate?.bypassReason ===
              "explicit-alpha-source",
        }),
      );
    }
  }
}

if (comparisons.length !== baselineScorecard.cases.length) {
  throw new Error("Candidate evaluation does not cover every baseline case.");
}

const hardGates = Object.freeze({
  corpusIntegrity: resolved.length === 29,
  frozenCoreIdentity: true,
  baselineReplayEquality: true,
  explicitAlphaInvariance: explicitAlphaProbes.every(
    (item) => item.byteEquivalent,
  ),
  structuralSafety: comparisons.every(
    (item) =>
      (item.candidateDiagnostics.topologyGuardRejected ||
        item.candidateDiagnostics.componentCountAfter <=
          item.candidateDiagnostics.componentCountBefore) &&
      item.candidateMetrics.background.deletedComponentCount <=
        item.baselineMetrics.background.deletedComponentCount &&
      item.candidateMetrics.background.splitComponentCount <=
        item.baselineMetrics.background.splitComponentCount,
  ),
});

const baseEvidence = Object.freeze({
  schemaVersion: "1.0.0",
  evaluationId: "p3-a03-h03-d02-golden-corpus-candidate",
  baseline: Object.freeze({
    baselineId: baselineScorecard.baselineIdentity.baselineId,
    baselineVersion: baselineScorecard.baselineIdentity.baselineVersion,
    scorecardSha256: sha256(baselineScorecardBytes),
    summarySha256: sha256(readFileSync(baselineSummaryPath, "utf8")),
    canonicalScorecardSha256: baselineScorecard.canonicalScorecardSha256,
  }),
  corpus: Object.freeze({
    version: manifestResult.manifest.corpusVersion,
    manifestSha256: manifestResult.sha256,
    physicalInputCount: resolved.length,
    logicalCaseCount: manifestResult.manifest.cases.length,
    evaluationRunCount: comparisons.length,
    explicitAlphaProbeCount: explicitAlphaProbes.length,
  }),
  frozenIdentities: frozenHashes,
  candidate: Object.freeze({
    id: "h03-d02-architecture-c",
    pipelinePosition: "after-normalization-before-h02-and-occupancy",
    activation:
      "transparent-background-and-original-source-hasAlpha-false-only",
    rule: Object.freeze({
      alphaInclusive: Object.freeze([33, 63]),
      maximumRgbChannelSpread: 2,
      requiresDirectFourNeighborAlphaAtMost: 32,
      excludesCanvasBoundary: true,
      minimumOccupiedFourNeighbors: 2,
      candidateSetBuiltBeforeMutation: true,
      mutation: "rgba-to-zero",
      topologyGuard: "reject-batch-on-component-increase-removal-or-split",
    }),
  }),
  hardGates,
  explicitAlphaProbes: Object.freeze(explicitAlphaProbes),
  comparisons: Object.freeze(
    comparisons.sort((left, right) => left.id.localeCompare(right.id)),
  ),
});
const canonicalEvidenceSha256 = sha256(serializeCanonicalJson(baseEvidence));
const evidence = Object.freeze({ ...baseEvidence, canonicalEvidenceSha256 });
const evidenceBytes = serializeCanonicalJson(evidence);
const summary = markdownSummary(evidence);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(
    path.join(outputDirectory, "h03-d02-candidate-scorecard.json"),
    evidenceBytes,
    "utf8",
  ),
  writeFile(
    path.join(outputDirectory, "h03-d02-candidate-summary.md"),
    summary,
    "utf8",
  ),
  writeFile(
    path.join(outputDirectory, "h03-d02-candidate-performance.json"),
    serializeCanonicalJson({ canonical: false, samples: performance }),
    "utf8",
  ),
]);

process.stdout.write(
  [
    `Candidate cases: ${comparisons.length}`,
    `Explicit-alpha probes: ${explicitAlphaProbes.length}`,
    `Hard gates passed: ${Object.values(hardGates).filter(Boolean).length}/${Object.keys(hardGates).length}`,
    `Canonical SHA-256: ${canonicalEvidenceSha256}`,
    `Output: ${path.relative(repositoryRoot, outputDirectory)}`,
  ].join("\n") + "\n",
);
process.exitCode = Object.values(hardGates).every(Boolean) ? 0 : 1;

interface CandidateComparison {
  readonly id: string;
  readonly logicalCaseId: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly settings: GeneratorQualityCaseResult["settings"];
  readonly baselineMetrics: GeneratorQualityCaseMetrics;
  readonly candidateMetrics: GeneratorQualityCaseMetrics;
  readonly delta: Readonly<{
    falseBackgroundOccupied: number;
    lostSubject: number;
    occupancyDisagreementCount: number;
    singletonCount: number;
    totalBeads: number;
  }>;
  readonly candidateDiagnostics: NonNullable<
    GeneratorQualityCaseResult["diagnostics"]["h03Candidate"]
  >;
}

interface PerformanceComparison {
  readonly id: string;
  readonly baselineTotalMs: number;
  readonly candidateTotalMs: number;
  readonly candidatePostResizeCleanupMs: number;
}

interface ExplicitAlphaProbe {
  readonly id: string;
  readonly byteEquivalent: boolean;
}

function decodeInput(
  logicalId: string,
  declaration: GeneratorQualityCaseDeclaration["input"],
) {
  const input = byLogicalId.get(logicalId);
  if (input === undefined) throw new Error("Resolved corpus input is missing.");
  return decodeGeneratorQualityPng(input.bytes, declaration);
}

function comparison(
  baseline: GeneratorQualityCaseResult,
  candidate: GeneratorQualityCaseResult,
  logicalCaseId: string,
): CandidateComparison {
  const diagnostics = candidate.diagnostics.h03Candidate;
  if (diagnostics === undefined) {
    throw new Error("Candidate diagnostics are missing.");
  }
  return Object.freeze({
    id: candidate.id,
    logicalCaseId,
    category: candidate.category,
    tags: candidate.tags,
    settings: candidate.settings,
    baselineMetrics: baseline.metrics,
    candidateMetrics: candidate.metrics,
    delta: Object.freeze({
      falseBackgroundOccupied:
        candidate.metrics.background.falseBackgroundOccupied -
        baseline.metrics.background.falseBackgroundOccupied,
      lostSubject:
        candidate.metrics.background.lostSubject -
        baseline.metrics.background.lostSubject,
      occupancyDisagreementCount:
        candidate.metrics.background.occupancyDisagreementCount -
        baseline.metrics.background.occupancyDisagreementCount,
      singletonCount:
        candidate.metrics.background.singletonCount -
        baseline.metrics.background.singletonCount,
      totalBeads:
        candidate.metrics.pattern.totalBeads -
        baseline.metrics.pattern.totalBeads,
    }),
    candidateDiagnostics: diagnostics,
  });
}

function metricsEqual(
  left: GeneratorQualityCaseMetrics,
  right: GeneratorQualityCaseMetrics,
): boolean {
  return serializeCanonicalJson(left) === serializeCanonicalJson(right);
}

function parseBaselineScorecard(input: string): GeneratorQualityScorecard {
  const parsed: unknown = JSON.parse(input);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("cases" in parsed) ||
    !Array.isArray(parsed.cases) ||
    !("baselineIdentity" in parsed) ||
    typeof parsed.baselineIdentity !== "object" ||
    parsed.baselineIdentity === null ||
    !("authoritativeBaseline" in parsed)
  ) {
    throw new Error("The authoritative baseline scorecard is invalid.");
  }
  return parsed as GeneratorQualityScorecard;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function markdownSummary(
  evidence: typeof baseEvidence & {
    readonly canonicalEvidenceSha256: string;
  },
): string {
  const changed = evidence.comparisons.filter(
    (item) =>
      item.delta.falseBackgroundOccupied !== 0 ||
      item.delta.lostSubject !== 0 ||
      item.delta.totalBeads !== 0,
  );
  return [
    "# H03-D02 Golden-Corpus Candidate Summary",
    "",
    `- Baseline: ${evidence.baseline.baselineVersion}`,
    `- Cases: ${evidence.comparisons.length}`,
    `- Explicit-alpha probes: ${evidence.explicitAlphaProbes.length}`,
    `- Changed cases: ${changed.length}`,
    `- Hard gates: ${Object.values(evidence.hardGates).every(Boolean) ? "PASS" : "FAIL"}`,
    `- Canonical SHA-256: ${evidence.canonicalEvidenceSha256}`,
    "",
    "| Case | FP delta | FN delta | Disagreement delta | Bead delta | Removed | Guard rejected |",
    "|---|---:|---:|---:|---:|---:|---|",
    ...changed.map(
      (item) =>
        `| ${item.id} | ${item.delta.falseBackgroundOccupied} | ${item.delta.lostSubject} | ${item.delta.occupancyDisagreementCount} | ${item.delta.totalBeads} | ${item.candidateDiagnostics.removedCount} | ${item.candidateDiagnostics.topologyGuardRejected ? "yes" : "no"} |`,
    ),
    "",
    "This evaluation does not activate the candidate in production.",
    "",
  ].join("\n");
}
