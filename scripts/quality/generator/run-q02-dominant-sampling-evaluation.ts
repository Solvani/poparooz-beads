import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";
import { verifyFrozenGeneratorQualityFiles } from "./generator-quality-baseline.ts";
import {
  analyzePatternColorPurity,
  comparePatternMatrices,
  type PatternColorPurityDiagnostics,
} from "./generator-quality-color-purity.ts";
import { readGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import { decodeGeneratorQualityPng } from "./generator-quality-png.ts";
import { renderPatternComparisonPng } from "./generator-quality-pattern-preview.ts";
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

const CRITICAL_CASES: ReadonlyMap<string, string> = new Map([
  ["poparooz-logo-pair", "Poparooz Logo"],
  ["flat-dinosaur-illustration", "Flat Dinosaur"],
  ["pink-floral-illustration", "Pink Floral"],
  ["green-leaf-graphic", "Green Leaf"],
  ["thin-botanical-line-art", "Thin Botanical"],
  ["saturated-lake-landscape", "Saturated Landscape"],
  ["pale-teddy-bear-pair", "Teddy"],
  ["white-pump-bottle-pair", "Pump Bottle"],
  ["golden-retriever-pair", "Golden Retriever"],
  ["portrait-sweater-pair", "Sweater Portrait"],
]);

const repositoryRoot = process.cwd();
const observedMode = process.env.POPAROOZ_Q02_CANDIDATE === "q02-a03";
const candidateReplay = observedMode ? "q02-a03" : "q02-a02";
const outputSlug = observedMode ? "q02-a03" : "q02-a02";
const corpusRoot = process.env.POPAROOZ_QUALITY_CORPUS_DIR;
if (corpusRoot === undefined || corpusRoot.trim() === "") {
  throw new Error("POPAROOZ_QUALITY_CORPUS_DIR is required.");
}
const outputDirectory = path.join(
  repositoryRoot,
  `.quality-output/${outputSlug}`,
);
const visualDirectory = path.join(outputDirectory, "visuals");
const manifestResult = await readGeneratorQualityManifest(
  path.join(
    repositoryRoot,
    "data-source/quality/generator-corpus/1.0.0/manifest.json",
  ),
);
const baselineScorecardPath = path.join(
  repositoryRoot,
  "data-source/quality/generator-baselines/1.0.0/generator-quality-scorecard.json",
);
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
const visuals: VisualArtifact[] = [];
let baselineReplayEquality = true;
let deterministicReplay = true;

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
      const baseline = replayExternalQualityCase(
        declaration,
        source,
        reference,
        background,
        size,
        dependencies,
      );
      const candidate = replayExternalQualityCase(
        declaration,
        source,
        reference,
        background,
        size,
        dependencies,
        candidateReplay,
      );
      const repeatedCandidate = replayExternalQualityCase(
        declaration,
        source,
        reference,
        background,
        size,
        dependencies,
        candidateReplay,
      );
      const frozenCase = baselineById.get(baseline.result.id);
      if (frozenCase === undefined) {
        throw new Error("A replay case is missing from Baseline 1.0.0.");
      }
      baselineReplayEquality &&=
        serializeCanonicalJson(frozenCase.metrics) ===
        serializeCanonicalJson(baseline.result.metrics);
      deterministicReplay &&=
        serializeCanonicalJson(candidate.result.metrics) ===
          serializeCanonicalJson(repeatedCandidate.result.metrics) &&
        serializeCanonicalJson(candidateDiagnostics(candidate.result)) ===
          serializeCanonicalJson(
            candidateDiagnostics(repeatedCandidate.result),
          ) &&
        patternsEquivalent(
          candidate.artifacts.pattern,
          repeatedCandidate.artifacts.pattern,
        );

      const comparison = compareRun(
        declaration,
        baseline.result,
        baseline.artifacts.pattern,
        candidate.result,
        candidate.artifacts.pattern,
      );
      comparisons.push(comparison);

      const visualLabel = CRITICAL_CASES.get(declaration.id);
      if (visualLabel !== undefined && size === 104) {
        visuals.push(
          Object.freeze({
            id: declaration.id,
            label: visualLabel,
            fileName: `${declaration.id}-${background}-104.svg`,
            previewFileName: `${declaration.id}-${background}-104.png`,
            svg: comparisonSvg(
              visualLabel,
              baseline.artifacts.pattern,
              candidate.artifacts.pattern,
              comparison,
            ),
            png: renderPatternComparisonPng(
              baseline.artifacts.pattern,
              candidate.artifacts.pattern,
            ),
          }),
        );
      }
    }
  }
}

if (
  comparisons.length !== 54 ||
  comparisons.length !== baselineScorecard.cases.length
) {
  throw new Error("Candidate evaluation does not cover all 54 baseline runs.");
}
if (visuals.length !== CRITICAL_CASES.size) {
  throw new Error("A required critical visual comparison is missing.");
}

comparisons.sort((left, right) => left.id.localeCompare(right.id));
visuals.sort((left, right) => left.id.localeCompare(right.id));
const hardGates = Object.freeze({
  corpusIntegrity:
    resolved.length === 29 &&
    manifestResult.manifest.cases.length === 24 &&
    manifestResult.manifest.cases.filter(
      (item) => item.reference.type === "trusted-alpha-pair",
    ).length === 5,
  frozenCoreIdentity: true,
  baselineReplayEquality,
  occupancyInvariance: comparisons.every(
    (item) =>
      item.matrix.occupancyIdentical &&
      item.delta.totalBeads === 0 &&
      item.delta.transparentPositions === 0 &&
      item.candidateDiagnostics.alphaMismatchCount === 0,
  ),
  deterministicReplay,
});
const baseEvidence = Object.freeze({
  schemaVersion: "1.0.0",
  evaluationId: observedMode
    ? "p3-a03-q02-a03-perceptual-observed-color-sampling"
    : "p3-a03-q02-a02-dominant-cell-sampling",
  baseline: Object.freeze({
    baselineId: baselineScorecard.baselineIdentity.baselineId,
    baselineVersion: baselineScorecard.baselineIdentity.baselineVersion,
    scorecardSha256: sha256(baselineScorecardBytes),
    canonicalScorecardSha256: baselineScorecard.canonicalScorecardSha256,
  }),
  corpus: Object.freeze({
    version: manifestResult.manifest.corpusVersion,
    manifestSha256: manifestResult.sha256,
    physicalInputCount: resolved.length,
    logicalCaseCount: manifestResult.manifest.cases.length,
    trustedPairCount: manifestResult.manifest.cases.filter(
      (item) => item.reference.type === "trusted-alpha-pair",
    ).length,
    evaluationRunCount: comparisons.length,
  }),
  frozenIdentities: frozenHashes,
  candidate: Object.freeze({
    id: observedMode
      ? "q02-a03-perceptual-observed-color-sampling"
      : "q02-a02-dominant-cell-sampling",
    productionActivation: false,
    applicability: "downscaling-only",
    colorWeight: "source-target-overlap-times-source-alpha",
    ...(observedMode
      ? {
          selection:
            "minimum-ciede2000-from-production-area-resize-reference-among-observed-rgb",
        }
      : {}),
    tieBreak: observedMode
      ? "greater-contribution-then-rgb-key"
      : "greater-contribution-then-lower-delta-e-to-area-average-then-rgb-key",
    alpha: "production-area-resized-alpha-with-frozen-cleanup-mask",
  }),
  hardGates,
  aggregate: Object.freeze({
    wholeCorpus: aggregate("whole-corpus", comparisons),
    byCategory: groupedAggregate(comparisons, (item) => item.category),
    byPatternSize: groupedAggregate(comparisons, (item) =>
      String(item.settings.size),
    ),
    byTrustedPair: groupedAggregate(
      comparisons.filter((item) => item.trustedPair),
      (item) => item.logicalCaseId,
    ),
  }),
  criticalVisuals: Object.freeze(
    visuals.map((item) =>
      Object.freeze({
        id: item.id,
        label: item.label,
        fileName: item.fileName,
        previewFileName: item.previewFileName,
      }),
    ),
  ),
  comparisons: Object.freeze(comparisons),
});
const canonicalEvidenceSha256 = sha256(serializeCanonicalJson(baseEvidence));
const evidence = Object.freeze({ ...baseEvidence, canonicalEvidenceSha256 });

await mkdir(visualDirectory, { recursive: true });
await Promise.all([
  writeFile(
    path.join(
      outputDirectory,
      observedMode
        ? "q02-a03-sampling-scorecard.json"
        : "q02-a02-dominant-sampling-scorecard.json",
    ),
    serializeCanonicalJson(evidence),
    "utf8",
  ),
  writeFile(
    path.join(
      outputDirectory,
      observedMode
        ? "q02-a03-sampling-summary.md"
        : "q02-a02-dominant-sampling-summary.md",
    ),
    markdownSummary(evidence),
    "utf8",
  ),
  ...visuals.map((item) =>
    writeFile(path.join(visualDirectory, item.fileName), item.svg, "utf8"),
  ),
  ...visuals.map((item) =>
    writeFile(path.join(visualDirectory, item.previewFileName), item.png),
  ),
]);

process.stdout.write(
  [
    `Candidate cases: ${comparisons.length}`,
    `Critical visuals: ${visuals.length}`,
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
  readonly trustedPair: boolean;
  readonly settings: GeneratorQualityCaseResult["settings"];
  readonly baseline: Readonly<{
    totalBeads: number;
    transparentPositions: number;
    finalColorCount: number;
    quantizedRepresentativeCount: number;
    representativeToCodeConsolidation: number;
    colorQuality: GeneratorQualityCaseMetrics["color"];
    purity: PatternColorPurityDiagnostics;
  }>;
  readonly candidate: CandidateComparison["baseline"];
  readonly delta: Readonly<{
    totalBeads: number;
    transparentPositions: number;
    finalColorCount: number;
    quantizedRepresentativeCount: number;
    representativeToCodeConsolidation: number;
    size1Components: number;
    size2Components: number;
    size3To4Components: number;
    size5PlusComponents: number;
    totalComponents: number;
  }>;
  readonly matrix: Readonly<{
    occupancyIdentical: boolean;
    changedCodePositions: number;
    totalPositions: number;
  }>;
  readonly candidateDiagnostics: NonNullable<
    | GeneratorQualityCaseResult["diagnostics"]["q02Candidate"]
    | GeneratorQualityCaseResult["diagnostics"]["q02A03Candidate"]
  >;
}

interface VisualArtifact {
  readonly id: string;
  readonly label: string;
  readonly fileName: string;
  readonly previewFileName: string;
  readonly svg: string;
  readonly png: Buffer;
}

function compareRun(
  declaration: GeneratorQualityCaseDeclaration,
  baselineResult: GeneratorQualityCaseResult,
  baselinePattern: PublicPatternResult,
  candidateResult: GeneratorQualityCaseResult,
  candidatePattern: PublicPatternResult,
): CandidateComparison {
  const diagnostics = candidateDiagnostics(candidateResult);
  const baselinePurity = analyzePatternColorPurity(
    baselinePattern,
    dependencies.palette.colors,
  );
  const candidatePurity = analyzePatternColorPurity(
    candidatePattern,
    dependencies.palette.colors,
  );
  const matrix = comparePatternMatrices(baselinePattern, candidatePattern);
  const baseline = Object.freeze({
    totalBeads: baselineResult.metrics.pattern.totalBeads,
    transparentPositions: baselineResult.metrics.pattern.transparentPositions,
    finalColorCount: baselineResult.metrics.pattern.colorCount,
    quantizedRepresentativeCount:
      baselineResult.diagnostics.quantizedColorCount,
    representativeToCodeConsolidation:
      baselineResult.diagnostics.quantizedColorCount -
      baselineResult.metrics.pattern.colorCount,
    colorQuality: baselineResult.metrics.color,
    purity: baselinePurity,
  });
  const candidate = Object.freeze({
    totalBeads: candidateResult.metrics.pattern.totalBeads,
    transparentPositions: candidateResult.metrics.pattern.transparentPositions,
    finalColorCount: candidateResult.metrics.pattern.colorCount,
    quantizedRepresentativeCount:
      candidateResult.diagnostics.quantizedColorCount,
    representativeToCodeConsolidation:
      candidateResult.diagnostics.quantizedColorCount -
      candidateResult.metrics.pattern.colorCount,
    colorQuality: candidateResult.metrics.color,
    purity: candidatePurity,
  });
  return Object.freeze({
    id: candidateResult.id,
    logicalCaseId: declaration.id,
    category: declaration.primaryCategory,
    trustedPair: declaration.reference.type === "trusted-alpha-pair",
    settings: candidateResult.settings,
    baseline,
    candidate,
    delta: Object.freeze({
      totalBeads: candidate.totalBeads - baseline.totalBeads,
      transparentPositions:
        candidate.transparentPositions - baseline.transparentPositions,
      finalColorCount: candidate.finalColorCount - baseline.finalColorCount,
      quantizedRepresentativeCount:
        candidate.quantizedRepresentativeCount -
        baseline.quantizedRepresentativeCount,
      representativeToCodeConsolidation:
        candidate.representativeToCodeConsolidation -
        baseline.representativeToCodeConsolidation,
      size1Components:
        candidate.purity.componentBuckets.size1 -
        baseline.purity.componentBuckets.size1,
      size2Components:
        candidate.purity.componentBuckets.size2 -
        baseline.purity.componentBuckets.size2,
      size3To4Components:
        candidate.purity.componentBuckets.size3To4 -
        baseline.purity.componentBuckets.size3To4,
      size5PlusComponents:
        candidate.purity.componentBuckets.size5Plus -
        baseline.purity.componentBuckets.size5Plus,
      totalComponents:
        candidate.purity.totalComponentCount -
        baseline.purity.totalComponentCount,
    }),
    matrix,
    candidateDiagnostics: diagnostics,
  });
}

function aggregate(label: string, items: readonly CandidateComparison[]) {
  const profileSizes = [24, 48, 72, 120, 168, 221] as const;
  return Object.freeze({
    label,
    runCount: items.length,
    baselineRepresentativeCapCount: items.filter(
      (item) => item.baseline.quantizedRepresentativeCount === 32,
    ).length,
    candidateRepresentativeCapCount: items.filter(
      (item) => item.candidate.quantizedRepresentativeCount === 32,
    ).length,
    totalDelta: sumDeltas(items),
    colorQualityMeanDelta: Object.freeze(
      profileSizes.map((profileSize) => {
        const deltas = items.map((item) => {
          const baseline = item.baseline.colorQuality.find(
            (entry) => entry.profileSize === profileSize,
          );
          const candidate = item.candidate.colorQuality.find(
            (entry) => entry.profileSize === profileSize,
          );
          if (baseline === undefined || candidate === undefined) {
            throw new Error("A Color Set quality metric is missing.");
          }
          return {
            usedColorCount: candidate.usedColorCount - baseline.usedColorCount,
            weightedMeanPaletteDeltaE00:
              candidate.weightedMeanPaletteDeltaE00 -
              baseline.weightedMeanPaletteDeltaE00,
            weightedP95PaletteDeltaE00:
              candidate.weightedP95PaletteDeltaE00 -
              baseline.weightedP95PaletteDeltaE00,
            maximumPaletteDeltaE00:
              candidate.maximumPaletteDeltaE00 -
              baseline.maximumPaletteDeltaE00,
          };
        });
        return Object.freeze({
          profileSize,
          usedColorCount: mean(deltas.map((item) => item.usedColorCount)),
          weightedMeanPaletteDeltaE00: mean(
            deltas.map((item) => item.weightedMeanPaletteDeltaE00),
          ),
          weightedP95PaletteDeltaE00: mean(
            deltas.map((item) => item.weightedP95PaletteDeltaE00),
          ),
          maximumPaletteDeltaE00: mean(
            deltas.map((item) => item.maximumPaletteDeltaE00),
          ),
        });
      }),
    ),
  });
}

function groupedAggregate(
  items: readonly CandidateComparison[],
  keyFor: (item: CandidateComparison) => string,
) {
  const groups = new Map<string, CandidateComparison[]>();
  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [item]);
    else group.push(item);
  }
  return Object.freeze(
    [...groups]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, group]) => aggregate(label, group)),
  );
}

function sumDeltas(items: readonly CandidateComparison[]) {
  const result = {
    totalBeads: 0,
    transparentPositions: 0,
    finalColorCount: 0,
    quantizedRepresentativeCount: 0,
    representativeToCodeConsolidation: 0,
    size1Components: 0,
    size2Components: 0,
    size3To4Components: 0,
    size5PlusComponents: 0,
    totalComponents: 0,
    changedCodePositions: 0,
  };
  for (const item of items) {
    for (const key of Object.keys(item.delta) as (keyof typeof item.delta)[]) {
      result[key] += item.delta[key];
    }
    result.changedCodePositions += item.matrix.changedCodePositions;
  }
  return Object.freeze(result);
}

function patternsEquivalent(
  left: PublicPatternResult,
  right: PublicPatternResult,
): boolean {
  return (
    comparePatternMatrices(left, right).changedCodePositions === 0 &&
    serializeCanonicalJson(
      left.colors.map((item) => ({
        code: item.color.code,
        beadCount: item.beadCount,
      })),
    ) ===
      serializeCanonicalJson(
        right.colors.map((item) => ({
          code: item.color.code,
          beadCount: item.beadCount,
        })),
      )
  );
}

function candidateDiagnostics(
  result: GeneratorQualityCaseResult,
): NonNullable<
  | GeneratorQualityCaseResult["diagnostics"]["q02Candidate"]
  | GeneratorQualityCaseResult["diagnostics"]["q02A03Candidate"]
> {
  const diagnostics = observedMode
    ? result.diagnostics.q02A03Candidate
    : result.diagnostics.q02Candidate;
  if (diagnostics === undefined) {
    throw new Error(
      observedMode
        ? "Observed-color sampling diagnostics are missing."
        : "Dominant-sampling diagnostics are missing.",
    );
  }
  return diagnostics;
}

function comparisonSvg(
  label: string,
  baseline: PublicPatternResult,
  candidate: PublicPatternResult,
  comparison: CandidateComparison,
): string {
  const panelGap = 10;
  const top = 12;
  const width = baseline.matrix.width * 2 + panelGap;
  const height = baseline.matrix.height + top;
  const svgNamespace = ["http", "://www.w3.org/2000/svg"].join("");
  return [
    `<svg xmlns="${svgNamespace}" width="${width * 4}" height="${height * 4}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
    `<rect width="100%" height="100%" fill="#f2f2f2"/>`,
    `<text x="0" y="4" font-family="Arial,sans-serif" font-size="4" fill="#111">${escapeXml(label)} — BASELINE (${comparison.baseline.finalColorCount} colors)</text>`,
    `<text x="${baseline.matrix.width + panelGap}" y="4" font-family="Arial,sans-serif" font-size="4" fill="#111">CANDIDATE (${comparison.candidate.finalColorCount} colors)</text>`,
    `<text x="0" y="9" font-family="Arial,sans-serif" font-size="3" fill="#444">beads ${comparison.baseline.totalBeads} → ${comparison.candidate.totalBeads}; changed positions ${comparison.matrix.changedCodePositions}</text>`,
    patternPaths(baseline, 0, top),
    patternPaths(candidate, baseline.matrix.width + panelGap, top),
    `</svg>`,
    "",
  ].join("\n");
}

function patternPaths(
  pattern: PublicPatternResult,
  offsetX: number,
  offsetY: number,
): string {
  const byIndex = new Map(
    pattern.colors.map((item) => [item.index, item.color] as const),
  );
  const pathByHex = new Map<string, string[]>();
  for (let index = 0; index < pattern.matrix.colorIndices.length; index += 1) {
    const colorIndex = pattern.matrix.colorIndices[index]!;
    if (colorIndex === pattern.matrix.transparentIndex) continue;
    const color = byIndex.get(colorIndex);
    if (color === undefined)
      throw new Error("Visual Pattern index is invalid.");
    const x = offsetX + (index % pattern.matrix.width);
    const y = offsetY + Math.floor(index / pattern.matrix.width);
    const commands = pathByHex.get(color.hex);
    const command = `M${x} ${y}h1v1h-1z`;
    if (commands === undefined) pathByHex.set(color.hex, [command]);
    else commands.push(command);
  }
  return [...pathByHex]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([hex, commands]) => `<path fill="${hex}" d="${commands.join("")}"/>`)
    .join("\n");
}

function markdownSummary(
  evidence: typeof baseEvidence & {
    readonly canonicalEvidenceSha256: string;
  },
): string {
  const whole = evidence.aggregate.wholeCorpus;
  const critical = evidence.comparisons.filter((item) =>
    CRITICAL_CASES.has(item.logicalCaseId),
  );
  return [
    observedMode
      ? "# Q02-A03 Perceptual Observed-Color Sampling Evaluation"
      : "# Q02-A02 Dominant Cell Sampling Evaluation",
    "",
    `- Runs: ${evidence.comparisons.length}`,
    `- Hard gates: ${Object.values(evidence.hardGates).every(Boolean) ? "PASS" : "FAIL"}`,
    `- Canonical SHA-256: ${evidence.canonicalEvidenceSha256}`,
    `- Final color-count delta: ${whole.totalDelta.finalColorCount}`,
    `- Singleton-component delta: ${whole.totalDelta.size1Components}`,
    `- 2-cell-component delta: ${whole.totalDelta.size2Components}`,
    `- 3–4-cell-component delta: ${whole.totalDelta.size3To4Components}`,
    `- Total color-component delta: ${whole.totalDelta.totalComponents}`,
    `- Changed Pattern positions: ${whole.totalDelta.changedCodePositions}`,
    `- Quantizer cap: ${whole.baselineRepresentativeCapCount} baseline / ${whole.candidateRepresentativeCapCount} candidate`,
    "",
    "| Critical case | Size | Beads | Color delta | Singleton delta | 2-cell delta | 3–4 delta | Changed positions |",
    "|---|---:|---:|---:|---:|---:|---:|---:|",
    ...critical.map(
      (item) =>
        `| ${item.id} | ${item.settings.size} | ${item.candidate.totalBeads} | ${item.delta.finalColorCount} | ${item.delta.size1Components} | ${item.delta.size2Components} | ${item.delta.size3To4Components} | ${item.matrix.changedCodePositions} |`,
    ),
    "",
    "Visual comparisons are under `visuals/`. This evaluation does not activate production behavior.",
    "",
  ].join("\n");
}

function decodeInput(
  logicalId: string,
  declaration: GeneratorQualityCaseDeclaration["input"],
) {
  const input = byLogicalId.get(logicalId);
  if (input === undefined) throw new Error("Resolved corpus input is missing.");
  return decodeGeneratorQualityPng(input.bytes, declaration);
}

function parseBaselineScorecard(input: string): GeneratorQualityScorecard {
  const parsed: unknown = JSON.parse(input);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("cases" in parsed) ||
    !Array.isArray(parsed.cases) ||
    !("baselineIdentity" in parsed) ||
    !("authoritativeBaseline" in parsed)
  ) {
    throw new Error("The authoritative baseline scorecard is invalid.");
  }
  return parsed as GeneratorQualityScorecard;
}

function mean(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
