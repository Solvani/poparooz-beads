import { createHash } from "node:crypto";

import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";
import type { GenerationColorSetSnapshot } from "../../../src/runtime/generation-color-set/generation-color-set.types.ts";
import type { GenerationPaletteSnapshot } from "../../../src/runtime/generation-palette/generation-palette.types.ts";
import { serializeCanonicalJson } from "./generator-quality-scorecard.ts";
import type {
  GeneratorQualityCaseDeclaration,
  GeneratorQualityCaseResult,
} from "./generator-quality.types.ts";

export const E05_PROFILE_SIZES = [24, 48, 72, 120, 168, 221] as const;
export const E05_TRANSITIONS = [
  [24, 48],
  [48, 72],
  [72, 120],
  [120, 168],
  [168, 221],
] as const;

export type E05ProfileSize = (typeof E05_PROFILE_SIZES)[number];

export interface E05ProductionIdentity {
  readonly gitCommit: string;
  readonly pipeline: "production-baseline";
  readonly sampling: "area-average";
  readonly backgroundRemoval: "Background Removal v1 — Conservative";
  readonly processingPolicy: Readonly<{ id: string; version: string }>;
  readonly runtimePaletteArtifactSha256: string;
  readonly runtimePaletteLockSha256: string;
  readonly colorSetArtifactSha256: string;
  readonly colorSetLockSha256: string;
  readonly boardProfile: Readonly<{
    id: string;
    version: string;
    artifactSha256: string;
  }>;
}

export interface E05CorpusIdentity {
  readonly version: string;
  readonly manifestSha256: string;
  readonly logicalCaseCount: number;
  readonly physicalInputCount: number;
  readonly trustedPairCount: number;
  readonly runCount: number;
}

export interface E05ProfileQuality {
  readonly profileId: string;
  readonly profileSize: E05ProfileSize;
  readonly usedColorCount: number;
  readonly totalWeightedPixelCount: number;
  readonly weightedMeanPaletteDeltaE00: number;
  readonly weightedP95PaletteDeltaE00: number;
  readonly maximumPaletteDeltaE00: number;
  readonly meanDeltaVs221: number;
  readonly p95DeltaVs221: number;
}

export interface E05ProfileTransition {
  readonly fromProfileSize: E05ProfileSize;
  readonly toProfileSize: E05ProfileSize;
  readonly weightedMeanPaletteDeltaE00Improvement: number;
  readonly weightedP95PaletteDeltaE00Improvement: number;
  readonly maximumPaletteDeltaE00Improvement: number;
  readonly usedColorCountChange: number;
}

export interface E05RequiredBeadSetEvidence {
  readonly profileId: string;
  readonly profileSize: E05ProfileSize;
  readonly coverage: readonly Readonly<{
    profileId: string;
    profileSize: E05ProfileSize;
    coversAllUsedCodes: boolean;
    missingCodes: readonly string[];
  }>[];
}

export interface E05ProductionRunEvidence {
  readonly id: string;
  readonly caseId: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly source: Readonly<{
    logicalId: string;
    sha256: string;
    alphaClassification: string;
  }>;
  readonly reference: null | Readonly<{
    type: "trusted-alpha-pair";
    logicalId: string;
    sha256: string;
    confidence: "exact" | "strong";
  }>;
  readonly settings: Readonly<{
    background: "white" | "transparent";
    patternSize: 40 | 60 | 80 | 104;
    maxColors: 32;
  }>;
  readonly pattern: Readonly<{
    width: number;
    height: number;
    occupiedPositionCount: number;
    transparentPositionCount: number;
    totalBeadCount: number;
    usedPatternColorCount: number;
    quantizedRepresentativeCount: number;
    colors: readonly Readonly<{ code: string; beadCount: number }>[];
  }>;
  readonly profileQuality: readonly E05ProfileQuality[];
  readonly requiredBeadSet: E05RequiredBeadSetEvidence;
  readonly transitions: readonly E05ProfileTransition[];
  readonly hardGates: readonly Readonly<{
    id: string;
    status: "passed";
  }>[];
}

interface ProfileAggregate {
  readonly profileId: string;
  readonly profileSize: E05ProfileSize;
  readonly runCount: number;
  readonly meanRunWeightedMeanPaletteDeltaE00: number;
  readonly medianRunWeightedMeanPaletteDeltaE00: number;
  readonly p95OfRunWeightedMeanPaletteDeltaE00: number;
  readonly meanRunWeightedP95PaletteDeltaE00: number;
  readonly worstRunWeightedP95PaletteDeltaE00: number;
  readonly worstRunMaximumPaletteDeltaE00: number;
  readonly meanUsedColorCount: number;
  readonly minimumUsedColorCount: number;
  readonly maximumUsedColorCount: number;
  readonly meanRunMeanDeltaVs221: number;
  readonly meanRunP95DeltaVs221: number;
}

interface TransitionAggregate extends E05ProfileTransition {
  readonly runCount: number;
}

interface EvidenceGroupAggregate {
  readonly runCount: number;
  readonly profiles: readonly ProfileAggregate[];
  readonly transitions: readonly TransitionAggregate[];
}

export interface E05ProductionEvidence {
  readonly schemaVersion: "1.0.0";
  readonly evidenceId: "poparooz-e05-actual-production-evidence";
  readonly evidenceVersion: "1.0.0";
  readonly stage: "P3-A03-E05-PRE";
  readonly productionIdentity: E05ProductionIdentity;
  readonly corpusIdentity: E05CorpusIdentity;
  readonly profiles: readonly Readonly<{
    profileId: string;
    profileSize: E05ProfileSize;
    memberCount: number;
  }>[];
  readonly frozenBaselineCrossCheck: Readonly<{
    baselineVersion: "1.0.0";
    canonicalScorecardSha256: string;
    runCount: number;
    status: "passed";
  }>;
  readonly hardGateSummary: Readonly<{
    passed: number;
    failed: 0;
  }>;
  readonly runs: readonly E05ProductionRunEvidence[];
  readonly aggregates: Readonly<{
    wholeCorpus: EvidenceGroupAggregate;
    categories: readonly Readonly<{
      category: string;
      aggregate: EvidenceGroupAggregate;
    }>[];
    patternSizes: readonly Readonly<{
      patternSize: 40 | 60 | 80 | 104;
      aggregate: EvidenceGroupAggregate;
    }>[];
    trustedPairs: readonly Readonly<{
      caseId: string;
      sourceLogicalId: string;
      referenceLogicalId: string;
      runIds: readonly string[];
      aggregate: EvidenceGroupAggregate;
    }>[];
    requiredBeadSetDistribution: Readonly<Record<E05ProfileSize, number>>;
    profileTransitions: readonly TransitionAggregate[];
  }>;
  readonly canonicalEvidenceSha256: string;
}

export function assertNoCandidateDiagnostics(
  diagnostics: GeneratorQualityCaseResult["diagnostics"],
): void {
  if (
    diagnostics.h03Candidate !== undefined ||
    diagnostics.q02Candidate !== undefined ||
    diagnostics.q02A03Candidate !== undefined
  ) {
    throw new Error("Blocked candidate diagnostics entered E05 evidence.");
  }
}

export function createRequiredBeadSetEvidence(
  usedCodes: readonly string[],
  colorSets: GenerationColorSetSnapshot,
  paletteOrder: ReadonlyMap<string, number>,
): E05RequiredBeadSetEvidence {
  if (usedCodes.length === 0 || new Set(usedCodes).size !== usedCodes.length) {
    throw new Error("Final Pattern codes must be non-empty and unique.");
  }
  const profiles = approvedProfiles(colorSets);
  const coverage = profiles.map((profile) => {
    const members = new Set(profile.memberCodes);
    const missingCodes = usedCodes
      .filter((code) => !members.has(code))
      .sort((left, right) => comparePaletteCodes(left, right, paletteOrder));
    return Object.freeze({
      profileId: profile.profileId,
      profileSize: profile.size,
      coversAllUsedCodes: missingCodes.length === 0,
      missingCodes: Object.freeze(missingCodes),
    });
  });
  const required = coverage.find((item) => item.coversAllUsedCodes);
  if (required === undefined || required.profileSize > 221) {
    throw new Error("The approved 221 profile does not cover the Pattern.");
  }
  if (
    coverage.some(
      (item) =>
        item.profileSize < required.profileSize && item.coversAllUsedCodes,
    )
  ) {
    throw new Error("Required Bead Set is not the smallest complete profile.");
  }
  return Object.freeze({
    profileId: required.profileId,
    profileSize: required.profileSize,
    coverage: Object.freeze(coverage),
  });
}

export function createProfileTransitions(
  input: readonly E05ProfileQuality[],
): readonly E05ProfileTransition[] {
  const bySize = new Map(input.map((item) => [item.profileSize, item]));
  assertSixProfiles(input);
  return Object.freeze(
    E05_TRANSITIONS.map(([fromSize, toSize]) => {
      const from = bySize.get(fromSize)!;
      const to = bySize.get(toSize)!;
      return Object.freeze({
        fromProfileSize: fromSize,
        toProfileSize: toSize,
        weightedMeanPaletteDeltaE00Improvement: normalizeZero(
          from.weightedMeanPaletteDeltaE00 - to.weightedMeanPaletteDeltaE00,
        ),
        weightedP95PaletteDeltaE00Improvement: normalizeZero(
          from.weightedP95PaletteDeltaE00 - to.weightedP95PaletteDeltaE00,
        ),
        maximumPaletteDeltaE00Improvement: normalizeZero(
          from.maximumPaletteDeltaE00 - to.maximumPaletteDeltaE00,
        ),
        usedColorCountChange: to.usedColorCount - from.usedColorCount,
      });
    }),
  );
}

export function createE05ProductionRunEvidence(input: {
  readonly declaration: GeneratorQualityCaseDeclaration;
  readonly replay: GeneratorQualityCaseResult;
  readonly pattern: PublicPatternResult;
  readonly palette: GenerationPaletteSnapshot;
  readonly colorSets: GenerationColorSetSnapshot;
}): E05ProductionRunEvidence {
  assertNoCandidateDiagnostics(input.replay.diagnostics);
  if (input.replay.hardGates.some((gate) => gate.status !== "passed")) {
    throw new Error("Production replay hard gate failed.");
  }
  const paletteOrder = new Map(
    input.palette.colors.map((color) => [color.code, color.sortOrder]),
  );
  if (paletteOrder.size !== input.palette.colors.length) {
    throw new Error("Runtime Palette codes are not unique.");
  }
  const colors = input.pattern.colors
    .map((item) => {
      if (
        !Number.isSafeInteger(item.beadCount) ||
        item.beadCount <= 0 ||
        !paletteOrder.has(item.color.code)
      ) {
        throw new Error("Final Pattern contains an invalid color row.");
      }
      return Object.freeze({
        code: item.color.code,
        beadCount: item.beadCount,
      });
    })
    .sort((left, right) =>
      comparePaletteCodes(left.code, right.code, paletteOrder),
    );
  const codes = colors.map((item) => item.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error("Final Pattern contains duplicate color codes.");
  }
  const totals = input.pattern.totals;
  const beadSum = colors.reduce((sum, item) => sum + item.beadCount, 0);
  if (
    totals.width !== input.pattern.matrix.width ||
    totals.height !== input.pattern.matrix.height ||
    totals.totalPositions !== totals.width * totals.height ||
    totals.totalBeads + totals.transparentPositions !== totals.totalPositions ||
    beadSum !== totals.totalBeads ||
    totals.colorCount !== colors.length ||
    input.replay.metrics.pattern.totalBeads !== totals.totalBeads ||
    input.replay.metrics.pattern.transparentPositions !==
      totals.transparentPositions ||
    input.replay.metrics.pattern.colorCount !== totals.colorCount
  ) {
    throw new Error("Final Pattern reconciliation failed.");
  }
  const profiles = approvedProfiles(input.colorSets);
  const profileQuality = input.replay.metrics.color.map((item, index) => {
    const profile = profiles[index];
    if (profile === undefined || profile.size !== item.profileSize) {
      throw new Error(
        "Replay profile identity does not match Color Set input.",
      );
    }
    return Object.freeze({
      profileId: profile.profileId,
      ...item,
      profileSize: profile.size,
    });
  });
  assertSixProfiles(profileQuality);
  if (
    profileQuality.some(
      (item) => item.totalWeightedPixelCount !== totals.totalBeads,
    )
  ) {
    throw new Error("Profile quality weights do not reconcile to the Pattern.");
  }
  const requiredBeadSet = createRequiredBeadSetEvidence(
    codes,
    input.colorSets,
    paletteOrder,
  );
  const hardGates = Object.freeze([
    ...input.replay.hardGates.map((gate) =>
      Object.freeze({ id: `production:${gate.id}`, status: "passed" as const }),
    ),
    ...[
      "candidate-diagnostic-exclusion",
      "pattern-position-reconciliation",
      "pattern-bead-reconciliation",
      "pattern-code-uniqueness",
      "pattern-code-runtime-palette",
      "pattern-used-color-count",
      "six-profile-identity",
      "profile-weight-reconciliation",
      "required-221-coverage",
    ].map((id) => Object.freeze({ id, status: "passed" as const })),
  ]);
  const reference =
    input.declaration.reference.type === "trusted-alpha-pair"
      ? Object.freeze({
          type: input.declaration.reference.type,
          logicalId: input.declaration.reference.input.logicalId,
          sha256: input.declaration.reference.input.sha256,
          confidence: input.declaration.reference.confidence,
        })
      : null;
  return Object.freeze({
    id: input.replay.id,
    caseId: input.declaration.id,
    category: input.replay.category,
    tags: Object.freeze([...input.replay.tags]),
    source: Object.freeze({
      logicalId: input.declaration.input.logicalId,
      sha256: input.declaration.input.sha256,
      alphaClassification: input.declaration.input.alphaClassification,
    }),
    reference,
    settings: Object.freeze({
      background: input.replay.settings.background,
      patternSize: input.replay.settings.size,
      maxColors: input.replay.settings.maxColors,
    }),
    pattern: Object.freeze({
      width: totals.width,
      height: totals.height,
      occupiedPositionCount: totals.totalBeads,
      transparentPositionCount: totals.transparentPositions,
      totalBeadCount: totals.totalBeads,
      usedPatternColorCount: totals.colorCount,
      quantizedRepresentativeCount:
        input.replay.diagnostics.quantizedColorCount,
      colors: Object.freeze(colors),
    }),
    profileQuality: Object.freeze(profileQuality),
    requiredBeadSet,
    transitions: createProfileTransitions(profileQuality),
    hardGates,
  });
}

export function createE05ProductionEvidence(input: {
  readonly productionIdentity: E05ProductionIdentity;
  readonly corpusIdentity: E05CorpusIdentity;
  readonly colorSets: GenerationColorSetSnapshot;
  readonly frozenBaselineCanonicalSha256: string;
  readonly runs: readonly E05ProductionRunEvidence[];
}): E05ProductionEvidence {
  const profiles = approvedProfiles(input.colorSets).map((profile) =>
    Object.freeze({
      profileId: profile.profileId,
      profileSize: profile.size,
      memberCount: profile.memberCodes.length,
    }),
  );
  const runs = Object.freeze(
    [...input.runs].sort((left, right) => left.id.localeCompare(right.id)),
  );
  if (runs.length !== input.corpusIdentity.runCount) {
    throw new Error("Authoritative run count does not match corpus identity.");
  }
  const requiredBeadSetDistribution = distribution(runs);
  if (
    Object.values(requiredBeadSetDistribution).reduce(
      (sum, count) => sum + count,
      0,
    ) !== runs.length
  ) {
    throw new Error("Required Bead Set distribution does not reconcile.");
  }
  const categories = [...new Set(runs.map((run) => run.category))]
    .sort()
    .map((category) =>
      Object.freeze({
        category,
        aggregate: aggregate(runs.filter((run) => run.category === category)),
      }),
    );
  const patternSizes = [40, 60, 80, 104] as const;
  const trustedCaseIds = [
    ...new Set(
      runs.filter((run) => run.reference !== null).map((run) => run.caseId),
    ),
  ].sort();
  const trustedPairs = trustedCaseIds.map((caseId) => {
    const selected = runs.filter((run) => run.caseId === caseId);
    const first = selected[0];
    if (first === undefined || first.reference === null) {
      throw new Error("Trusted-pair aggregation is invalid.");
    }
    return Object.freeze({
      caseId,
      sourceLogicalId: first.source.logicalId,
      referenceLogicalId: first.reference.logicalId,
      runIds: Object.freeze(selected.map((run) => run.id).sort()),
      aggregate: aggregate(selected),
    });
  });
  const hardGateCount = runs.reduce(
    (sum, run) => sum + run.hardGates.length,
    0,
  );
  const base = Object.freeze({
    schemaVersion: "1.0.0" as const,
    evidenceId: "poparooz-e05-actual-production-evidence" as const,
    evidenceVersion: "1.0.0" as const,
    stage: "P3-A03-E05-PRE" as const,
    productionIdentity: input.productionIdentity,
    corpusIdentity: input.corpusIdentity,
    profiles: Object.freeze(profiles),
    frozenBaselineCrossCheck: Object.freeze({
      baselineVersion: "1.0.0" as const,
      canonicalScorecardSha256: input.frozenBaselineCanonicalSha256,
      runCount: runs.length,
      status: "passed" as const,
    }),
    hardGateSummary: Object.freeze({
      passed: hardGateCount,
      failed: 0 as const,
    }),
    runs,
    aggregates: Object.freeze({
      wholeCorpus: aggregate(runs),
      categories: Object.freeze(categories),
      patternSizes: Object.freeze(
        patternSizes.map((patternSize) =>
          Object.freeze({
            patternSize,
            aggregate: aggregate(
              runs.filter((run) => run.settings.patternSize === patternSize),
            ),
          }),
        ),
      ),
      trustedPairs: Object.freeze(trustedPairs),
      requiredBeadSetDistribution,
      profileTransitions: aggregateTransitions(runs),
    }),
  });
  const canonicalEvidenceSha256 = createHash("sha256")
    .update(serializeCanonicalJson(base))
    .digest("hex");
  return Object.freeze({ ...base, canonicalEvidenceSha256 });
}

export function serializeE05ProductionEvidence(
  evidence: E05ProductionEvidence,
): string {
  return serializeCanonicalJson(evidence);
}

export function createE05ProductionEvidenceSummary(
  evidence: E05ProductionEvidence,
): string {
  const distributionRows = E05_PROFILE_SIZES.map(
    (size) =>
      `| ${size} | ${evidence.aggregates.requiredBeadSetDistribution[size]} |`,
  );
  const profileRows = evidence.aggregates.wholeCorpus.profiles.map(
    (profile) =>
      `| ${profile.profileSize} | ${profile.runCount} | ${profile.meanRunWeightedMeanPaletteDeltaE00} | ${profile.medianRunWeightedMeanPaletteDeltaE00} | ${profile.p95OfRunWeightedMeanPaletteDeltaE00} | ${profile.meanRunWeightedP95PaletteDeltaE00} | ${profile.worstRunWeightedP95PaletteDeltaE00} | ${profile.worstRunMaximumPaletteDeltaE00} | ${profile.meanUsedColorCount} | ${profile.minimumUsedColorCount} | ${profile.maximumUsedColorCount} |`,
  );
  const transitionRows = evidence.aggregates.profileTransitions.map(
    (item) =>
      `| ${item.fromProfileSize} -> ${item.toProfileSize} | ${item.runCount} | ${item.weightedMeanPaletteDeltaE00Improvement} | ${item.weightedP95PaletteDeltaE00Improvement} | ${item.maximumPaletteDeltaE00Improvement} | ${item.usedColorCountChange} |`,
  );
  return [
    "# Poparooz E05 Actual-Production Evidence Summary",
    "",
    `- Stage: ${evidence.stage}`,
    `- Production HEAD: ${evidence.productionIdentity.gitCommit}`,
    `- Corpus manifest SHA-256: ${evidence.corpusIdentity.manifestSha256}`,
    `- Production runs: ${evidence.corpusIdentity.runCount}`,
    `- Profiles: ${E05_PROFILE_SIZES.join(" / ")}`,
    `- Hard gates: ${evidence.hardGateSummary.passed} passed / 0 failed`,
    `- Canonical evidence SHA-256: ${evidence.canonicalEvidenceSha256}`,
    "",
    "This summary contains deterministic measurements only. It defines no Recommendation Policy.",
    "",
    "## Required Bead Set Distribution",
    "",
    "| Required profile | Runs |",
    "|---:|---:|",
    ...distributionRows,
    "",
    "## Whole-Corpus Profile Measurements",
    "",
    "| Profile | Runs | Mean run mean dE00 | Median run mean dE00 | P95 of run mean dE00 | Mean run P95 dE00 | Worst run P95 dE00 | Worst maximum dE00 | Mean used colors | Min used | Max used |",
    "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...profileRows,
    "",
    "## Whole-Corpus Adjacent Profile Transitions",
    "",
    "Positive dE00 improvement means the larger profile reduced error. Used-color change is larger minus smaller.",
    "",
    "| Transition | Runs | Mean dE00 improvement | P95 dE00 improvement | Maximum dE00 improvement | Used-color change |",
    "|---|---:|---:|---:|---:|---:|",
    ...transitionRows,
    "",
    "## Trusted Pairs",
    "",
    ...evidence.aggregates.trustedPairs.map(
      (pair) =>
        `- ${pair.caseId}: ${pair.runIds.length} production runs; source ${pair.sourceLogicalId}; trusted reference ${pair.referenceLogicalId}.`,
    ),
    "",
    "Trusted references remain occupancy references and are not additional production runs.",
    "",
  ].join("\n");
}

function approvedProfiles(colorSets: GenerationColorSetSnapshot) {
  if (
    colorSets.profiles.length !== E05_PROFILE_SIZES.length ||
    colorSets.profiles.some(
      (profile, index) =>
        profile.size !== E05_PROFILE_SIZES[index] ||
        profile.memberCodes.length !== profile.size ||
        new Set(profile.memberCodes).size !== profile.size,
    )
  ) {
    throw new Error("Exactly six approved Color Set profiles are required.");
  }
  return colorSets.profiles.map((profile) =>
    Object.freeze({ ...profile, size: asProfileSize(profile.size) }),
  );
}

function assertSixProfiles(input: readonly E05ProfileQuality[]): void {
  if (
    input.length !== E05_PROFILE_SIZES.length ||
    input.some(
      (profile, index) => profile.profileSize !== E05_PROFILE_SIZES[index],
    )
  ) {
    throw new Error("Exactly six ordered profile results are required.");
  }
}

function asProfileSize(value: number): E05ProfileSize {
  if (!E05_PROFILE_SIZES.some((size) => size === value)) {
    throw new Error("Unknown Color Set profile size.");
  }
  return value as E05ProfileSize;
}

function comparePaletteCodes(
  left: string,
  right: string,
  paletteOrder: ReadonlyMap<string, number>,
): number {
  const leftOrder = paletteOrder.get(left);
  const rightOrder = paletteOrder.get(right);
  if (leftOrder === undefined || rightOrder === undefined) {
    throw new Error("Pattern code is outside the Runtime Palette.");
  }
  return leftOrder - rightOrder || (left < right ? -1 : left > right ? 1 : 0);
}

function aggregate(
  runs: readonly E05ProductionRunEvidence[],
): EvidenceGroupAggregate {
  if (runs.length === 0)
    throw new Error("Cannot aggregate an empty run group.");
  return Object.freeze({
    runCount: runs.length,
    profiles: Object.freeze(
      E05_PROFILE_SIZES.map((size) => {
        const selected = runs.map((run) =>
          run.profileQuality.find((profile) => profile.profileSize === size),
        );
        if (selected.some((profile) => profile === undefined)) {
          throw new Error("Profile aggregate is incomplete.");
        }
        const values = selected as E05ProfileQuality[];
        return Object.freeze({
          profileId: values[0]!.profileId,
          profileSize: size,
          runCount: values.length,
          meanRunWeightedMeanPaletteDeltaE00: mean(
            values.map((item) => item.weightedMeanPaletteDeltaE00),
          ),
          medianRunWeightedMeanPaletteDeltaE00: median(
            values.map((item) => item.weightedMeanPaletteDeltaE00),
          ),
          p95OfRunWeightedMeanPaletteDeltaE00: percentile(
            values.map((item) => item.weightedMeanPaletteDeltaE00),
            0.95,
          ),
          meanRunWeightedP95PaletteDeltaE00: mean(
            values.map((item) => item.weightedP95PaletteDeltaE00),
          ),
          worstRunWeightedP95PaletteDeltaE00: Math.max(
            ...values.map((item) => item.weightedP95PaletteDeltaE00),
          ),
          worstRunMaximumPaletteDeltaE00: Math.max(
            ...values.map((item) => item.maximumPaletteDeltaE00),
          ),
          meanUsedColorCount: mean(values.map((item) => item.usedColorCount)),
          minimumUsedColorCount: Math.min(
            ...values.map((item) => item.usedColorCount),
          ),
          maximumUsedColorCount: Math.max(
            ...values.map((item) => item.usedColorCount),
          ),
          meanRunMeanDeltaVs221: mean(
            values.map((item) => item.meanDeltaVs221),
          ),
          meanRunP95DeltaVs221: mean(values.map((item) => item.p95DeltaVs221)),
        });
      }),
    ),
    transitions: aggregateTransitions(runs),
  });
}

function aggregateTransitions(
  runs: readonly E05ProductionRunEvidence[],
): readonly TransitionAggregate[] {
  if (runs.length === 0) throw new Error("Cannot aggregate empty transitions.");
  return Object.freeze(
    E05_TRANSITIONS.map(([fromSize, toSize]) => {
      const selected = runs.map((run) =>
        run.transitions.find(
          (item) =>
            item.fromProfileSize === fromSize && item.toProfileSize === toSize,
        ),
      );
      if (selected.some((item) => item === undefined)) {
        throw new Error("Transition aggregate is incomplete.");
      }
      const values = selected as E05ProfileTransition[];
      return Object.freeze({
        fromProfileSize: fromSize,
        toProfileSize: toSize,
        runCount: values.length,
        weightedMeanPaletteDeltaE00Improvement: mean(
          values.map((item) => item.weightedMeanPaletteDeltaE00Improvement),
        ),
        weightedP95PaletteDeltaE00Improvement: mean(
          values.map((item) => item.weightedP95PaletteDeltaE00Improvement),
        ),
        maximumPaletteDeltaE00Improvement: mean(
          values.map((item) => item.maximumPaletteDeltaE00Improvement),
        ),
        usedColorCountChange: mean(
          values.map((item) => item.usedColorCountChange),
        ),
      });
    }),
  );
}

function distribution(
  runs: readonly E05ProductionRunEvidence[],
): Readonly<Record<E05ProfileSize, number>> {
  const result: Record<E05ProfileSize, number> = {
    24: 0,
    48: 0,
    72: 0,
    120: 0,
    168: 0,
    221: 0,
  };
  for (const run of runs) result[run.requiredBeadSet.profileSize] += 1;
  return Object.freeze(result);
}

function mean(values: readonly number[]): number {
  return normalizeZero(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? normalizeZero((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
}

function percentile(
  values: readonly number[],
  percentileValue: number,
): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * percentileValue) - 1]!;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}
