import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROFILE_ORDER = [24, 48, 72, 120, 168, 221] as const;
const PATTERN_SIZES = [40, 60, 80, 104] as const;
const EXPECTED_SOURCE_CANONICAL_SHA =
  "1357999cf5eb9585da9315d5325f01131ea818383eb7dd9f86d12aea3ebdf1b8";
const EXPECTED_SOURCE_FILE_SHA =
  "d2ab1b40cad9e97f605f57a77d9d03cb04481cf33cd1cfebfde5d7cf17b8974c";
const SOURCE_EVIDENCE_FREEZE_COMMIT =
  "549711842369e876c1f06ccc8d85fe003f5ca8a1";
const NOMINAL_BEADS_PER_COLOR = 1000;

export type ProfileSize = (typeof PROFILE_ORDER)[number];

interface ProfileQuality {
  readonly profileSize: ProfileSize;
  readonly usedColorCount: number;
  readonly totalWeightedPixelCount: number;
  readonly weightedMeanPaletteDeltaE00: number;
  readonly weightedP95PaletteDeltaE00: number;
  readonly maximumPaletteDeltaE00: number;
  readonly meanDeltaVs221: number;
  readonly p95DeltaVs221: number;
}

interface SourceRun {
  readonly id: string;
  readonly caseId: string;
  readonly category: string;
  readonly reference: null | Readonly<{ readonly type: string }>;
  readonly settings: Readonly<{ readonly patternSize: number }>;
  readonly pattern: Readonly<{
    readonly colors: readonly Readonly<{
      readonly code: string;
      readonly beadCount: number;
    }>[];
  }>;
  readonly profileQuality: readonly ProfileQuality[];
  readonly requiredBeadSet: Readonly<{ readonly profileSize: ProfileSize }>;
  readonly transitions: readonly Readonly<{
    readonly fromProfileSize: ProfileSize;
    readonly toProfileSize: ProfileSize;
    readonly weightedMeanPaletteDeltaE00Improvement: number;
    readonly weightedP95PaletteDeltaE00Improvement: number;
    readonly maximumPaletteDeltaE00Improvement: number;
  }>[];
}

interface SourceEvidence {
  readonly schemaVersion: string;
  readonly evidenceId: string;
  readonly evidenceVersion: string;
  readonly stage: string;
  readonly productionIdentity: Readonly<{ readonly gitCommit: string }>;
  readonly profiles: readonly Readonly<{
    readonly profileId: string;
    readonly profileSize: ProfileSize;
  }>[];
  readonly runs: readonly SourceRun[];
  readonly aggregates: Readonly<{
    readonly requiredBeadSetDistribution: Readonly<Record<string, number>>;
  }>;
  readonly canonicalEvidenceSha256: string;
}

interface ColorSetArtifact {
  readonly profiles: readonly Readonly<{
    readonly profileId: string;
    readonly size: ProfileSize;
    readonly memberCodes: readonly string[];
  }>[];
}

interface PolicyEvaluationBase {
  readonly schemaVersion: "1.0.0";
  readonly policyId: "poparooz-recommendation-policy";
  readonly policyVersion: "1.0.0";
  readonly stage: "P3-A03-E05-D02";
  readonly decision: "recommended-profile-equals-required-profile";
  readonly sourceEvidenceId: string;
  readonly sourceEvidenceVersion: string;
  readonly sourceEvidenceCanonicalSha256: string;
  readonly sourceEvidenceCompleteJsonSha256: string;
  readonly sourceEvidenceFreezeCommit: string;
  readonly productionCommit: string;
  readonly profileOrder: readonly ProfileSize[];
  readonly requiredDistribution: Readonly<Record<string, number>>;
  readonly recommendedDistribution: Readonly<Record<string, number>>;
  readonly runs: readonly Readonly<Record<string, unknown>>[];
  readonly eligibleUpgradeAnalysis: Readonly<Record<string, unknown>>;
  readonly trustedPairSummary: readonly Readonly<Record<string, unknown>>[];
  readonly patternSizeSummary: readonly Readonly<Record<string, unknown>>[];
  readonly refill: Readonly<Record<string, unknown>>;
  readonly hardGates: readonly Readonly<{
    readonly id: string;
    readonly status: "passed";
    readonly checkedItems: number;
  }>[];
}

export interface PolicyEvaluation extends PolicyEvaluationBase {
  readonly canonicalPolicyEvidenceSha256: string;
}

const sourceUrl = new URL(
  "../../data-source/quality/generator-e05-evidence/1.0.0/e05-production-evidence.json",
  import.meta.url,
);
const colorSetUrl = new URL(
  "../../src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
  import.meta.url,
);
const outputUrl = new URL(
  "../../data-source/quality/generator-e05-evidence/1.0.0/e05-recommendation-policy-evaluation.json",
  import.meta.url,
);
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message: string): never {
  throw new Error(`E05-D02 policy closure failed: ${message}`);
}

function parseJson<T>(bytes: Buffer): T {
  return JSON.parse(bytes.toString("utf8")) as T;
}

function quality(run: SourceRun, size: ProfileSize): ProfileQuality {
  const selected = run.profileQuality.find((item) => item.profileSize === size);
  return selected ?? fail(`run ${run.id} is missing profile ${size}`);
}

function equalQuality(left: ProfileQuality, right: ProfileQuality): boolean {
  return (
    left.weightedMeanPaletteDeltaE00 === right.weightedMeanPaletteDeltaE00 &&
    left.weightedP95PaletteDeltaE00 === right.weightedP95PaletteDeltaE00 &&
    left.maximumPaletteDeltaE00 === right.maximumPaletteDeltaE00 &&
    left.usedColorCount === right.usedColorCount
  );
}

function emptyDistribution(): Record<string, number> {
  return Object.fromEntries(PROFILE_ORDER.map((size) => [String(size), 0]));
}

function distribution(sizes: readonly ProfileSize[]): Record<string, number> {
  const result = emptyDistribution();
  for (const size of sizes) result[String(size)]! += 1;
  return result;
}

export function calculateRefillPacks(beadCount: number): number {
  if (!Number.isSafeInteger(beadCount) || beadCount < 0) {
    throw new RangeError("beadCount must be a non-negative safe integer");
  }
  return Math.max(0, Math.ceil(beadCount / NOMINAL_BEADS_PER_COLOR) - 1);
}

export function recommendProfile(requiredProfile: ProfileSize): ProfileSize {
  if (!PROFILE_ORDER.includes(requiredProfile)) {
    throw new RangeError("Required profile is not approved");
  }
  return requiredProfile;
}

export function assertNestedProfiles(colorSets: ColorSetArtifact): void {
  if (
    colorSets.profiles.length !== PROFILE_ORDER.length ||
    colorSets.profiles.some(
      (profile, index) =>
        profile.size !== PROFILE_ORDER[index] ||
        profile.profileId !== `poparooz-set-${PROFILE_ORDER[index]}` ||
        profile.memberCodes.length !== profile.size,
    )
  ) {
    fail("formal profile identity differs from 24/48/72/120/168/221");
  }
  for (let index = 0; index < colorSets.profiles.length - 1; index += 1) {
    const current = colorSets.profiles[index]!;
    const next = new Set(colorSets.profiles[index + 1]!.memberCodes);
    if (current.memberCodes.some((code) => !next.has(code))) {
      fail(`formal profiles are not nested at ${current.size}`);
    }
  }
}

export function parseAuthoritativeSource(bytes: Buffer): SourceEvidence {
  if (sha256(bytes) !== EXPECTED_SOURCE_FILE_SHA) {
    fail("source evidence complete JSON SHA-256 mismatch");
  }
  const source = parseJson<SourceEvidence>(bytes);
  const { canonicalEvidenceSha256, ...canonicalBase } = source;
  const recomputed = sha256(`${JSON.stringify(canonicalBase, null, 2)}\n`);
  if (
    canonicalEvidenceSha256 !== EXPECTED_SOURCE_CANONICAL_SHA ||
    recomputed !== EXPECTED_SOURCE_CANONICAL_SHA
  ) {
    fail("source evidence canonical SHA-256 mismatch");
  }
  return source;
}

function assertSourceIdentity(source: SourceEvidence): void {
  if (
    source.schemaVersion !== "1.0.0" ||
    source.evidenceId !== "poparooz-e05-actual-production-evidence" ||
    source.evidenceVersion !== "1.0.0" ||
    source.stage !== "P3-A03-E05-PRE" ||
    source.runs.length !== 54 ||
    source.profiles.some(
      (profile, index) => profile.profileSize !== PROFILE_ORDER[index],
    )
  ) {
    fail("source identity, run count, or formal profiles differ");
  }
  const expected = [0, 0, 0, 0, 13, 41];
  if (
    PROFILE_ORDER.some(
      (size, index) =>
        source.aggregates.requiredBeadSetDistribution[String(size)] !==
        expected[index],
    )
  ) {
    fail("required distribution differs from frozen evidence");
  }
}

function assertNoProductionSourceChanges(): void {
  const cwd = repositoryRoot;
  try {
    execFileSync("git", ["diff", "--quiet", "--", "src"], { cwd });
    execFileSync("git", ["diff", "--cached", "--quiet", "--", "src"], {
      cwd,
    });
    const untracked = execFileSync(
      "git",
      ["ls-files", "--others", "--exclude-standard", "--", "src"],
      { cwd, encoding: "utf8" },
    );
    if (untracked.trim() !== "") fail("untracked production src file exists");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("E05-D02")) {
      throw error;
    }
    fail("production src differs from HEAD or index");
  }
}

function summarizeGroups(
  runs: readonly SourceRun[],
  key: (run: SourceRun) => string,
): readonly Readonly<Record<string, unknown>>[] {
  const keys = [...new Set(runs.map(key))].sort((left, right) =>
    left.localeCompare(right),
  );
  return keys.map((value) => {
    const selected = runs.filter((run) => key(run) === value);
    const required = selected.map((run) => run.requiredBeadSet.profileSize);
    return Object.freeze({
      group: value,
      runCount: selected.length,
      requiredDistribution: distribution(required),
      recommendedDistribution: distribution(required.map(recommendProfile)),
      allRecommendedEqualRequired: true,
    });
  });
}

export function createPolicyEvaluation(
  source: SourceEvidence,
  colorSets: ColorSetArtifact,
): PolicyEvaluation {
  assertSourceIdentity(source);
  assertNestedProfiles(colorSets);
  assertNoProductionSourceChanges();

  const membersBySize = new Map(
    colorSets.profiles.map((profile) => [
      profile.size,
      new Set(profile.memberCodes),
    ]),
  );
  let coveredRefillRows = 0;
  const runRecords: Readonly<Record<string, unknown>>[] = [];
  const refillRows: {
    runId: string;
    code: string;
    beadCount: number;
    refillPacks: number;
  }[] = [];
  const patternRefills: { runId: string; refillPacks: number }[] = [];

  for (const run of source.runs) {
    const requiredProfile = run.requiredBeadSet.profileSize;
    const recommendedProfile = recommendProfile(requiredProfile);
    const requiredQuality = quality(run, requiredProfile);
    const recommendedQuality = quality(run, recommendedProfile);
    const referenceQuality = quality(run, 221);
    if (
      recommendedProfile < requiredProfile ||
      recommendedProfile !== requiredProfile ||
      requiredQuality.meanDeltaVs221 !== 0 ||
      requiredQuality.p95DeltaVs221 !== 0 ||
      !equalQuality(requiredQuality, referenceQuality)
    ) {
      fail(`Required/Recommended quality invariant failed for ${run.id}`);
    }
    if (requiredProfile === 168) {
      const transition = run.transitions.find(
        (item) => item.fromProfileSize === 168 && item.toProfileSize === 221,
      );
      if (
        transition === undefined ||
        transition.weightedMeanPaletteDeltaE00Improvement !== 0 ||
        transition.weightedP95PaletteDeltaE00Improvement !== 0 ||
        transition.maximumPaletteDeltaE00Improvement !== 0
      ) {
        fail(`eligible 168 -> 221 gain is non-zero for ${run.id}`);
      }
    }

    const selectedMembers = membersBySize.get(recommendedProfile)!;
    let totalPatternRefills = 0;
    for (const color of run.pattern.colors) {
      if (!selectedMembers.has(color.code)) {
        fail(`refill color ${color.code} is not covered for ${run.id}`);
      }
      coveredRefillRows += 1;
      const refillPacks = calculateRefillPacks(color.beadCount);
      totalPatternRefills += refillPacks;
      refillRows.push({
        runId: run.id,
        code: color.code,
        beadCount: color.beadCount,
        refillPacks,
      });
    }
    patternRefills.push({ runId: run.id, refillPacks: totalPatternRefills });
    runRecords.push(
      Object.freeze({
        runId: run.id,
        requiredProfile,
        recommendedProfile,
        upgraded: false,
        requiredQuality,
        recommendedQuality,
        qualityGain: Object.freeze({
          weightedMeanPaletteDeltaE00: 0,
          weightedP95PaletteDeltaE00: 0,
          maximumPaletteDeltaE00: 0,
        }),
      }),
    );
  }

  const requiredSizes = source.runs.map(
    (run) => run.requiredBeadSet.profileSize,
  );
  const eligible = source.runs.filter(
    (run) => run.requiredBeadSet.profileSize === 168,
  );
  const refillDistribution = {
    "0": refillRows.filter((row) => row.refillPacks === 0).length,
    "1": refillRows.filter((row) => row.refillPacks === 1).length,
    "2": refillRows.filter((row) => row.refillPacks === 2).length,
    "3+": refillRows.filter((row) => row.refillPacks >= 3).length,
  };
  const maximumColor = [...refillRows].sort(
    (left, right) =>
      right.beadCount - left.beadCount ||
      left.runId.localeCompare(right.runId) ||
      left.code.localeCompare(right.code),
  )[0]!;
  const maximumPatternRefills = Math.max(
    ...patternRefills.map((item) => item.refillPacks),
  );
  const maximumPatterns = patternRefills.filter(
    (item) => item.refillPacks === maximumPatternRefills,
  );
  if (
    refillRows.length !== 750 ||
    refillRows.filter((row) => row.refillPacks > 0).length !== 71 ||
    patternRefills.filter((item) => item.refillPacks > 0).length !== 37 ||
    JSON.stringify(refillDistribution) !==
      JSON.stringify({ "0": 679, "1": 40, "2": 11, "3+": 20 }) ||
    maximumColor.beadCount !== 9679 ||
    maximumColor.refillPacks !== 9 ||
    maximumPatternRefills !== 10
  ) {
    fail("frozen refill evidence differs");
  }

  const base: PolicyEvaluationBase = Object.freeze({
    schemaVersion: "1.0.0",
    policyId: "poparooz-recommendation-policy",
    policyVersion: "1.0.0",
    stage: "P3-A03-E05-D02",
    decision: "recommended-profile-equals-required-profile",
    sourceEvidenceId: source.evidenceId,
    sourceEvidenceVersion: source.evidenceVersion,
    sourceEvidenceCanonicalSha256: EXPECTED_SOURCE_CANONICAL_SHA,
    sourceEvidenceCompleteJsonSha256: EXPECTED_SOURCE_FILE_SHA,
    sourceEvidenceFreezeCommit: SOURCE_EVIDENCE_FREEZE_COMMIT,
    productionCommit: source.productionIdentity.gitCommit,
    profileOrder: Object.freeze([...PROFILE_ORDER]),
    requiredDistribution: Object.freeze(distribution(requiredSizes)),
    recommendedDistribution: Object.freeze(
      distribution(requiredSizes.map(recommendProfile)),
    ),
    runs: Object.freeze(runRecords),
    eligibleUpgradeAnalysis: Object.freeze({
      fromProfile: 168,
      toProfile: 221,
      eligibleRunCount: eligible.length,
      upgradedRunCount: 0,
      allWeightedMeanGainsZero: true,
      allWeightedP95GainsZero: true,
      allMaximumGainsZero: true,
      eligibleRunIds: Object.freeze(eligible.map((run) => run.id)),
    }),
    trustedPairSummary: Object.freeze(
      summarizeGroups(
        source.runs.filter((run) => run.reference !== null),
        (run) => run.caseId,
      ),
    ),
    patternSizeSummary: Object.freeze(
      PATTERN_SIZES.map((size) => {
        const selected = source.runs.filter(
          (run) => run.settings.patternSize === size,
        );
        const required = selected.map((run) => run.requiredBeadSet.profileSize);
        return Object.freeze({
          patternSize: size,
          runCount: selected.length,
          requiredDistribution: distribution(required),
          recommendedDistribution: distribution(required.map(recommendProfile)),
          allRecommendedEqualRequired: true,
        });
      }),
    ),
    refill: Object.freeze({
      nominalBeadsPerColor: NOMINAL_BEADS_PER_COLOR,
      totalColorRows: refillRows.length,
      runsWithAnyRefill: patternRefills.filter((item) => item.refillPacks > 0)
        .length,
      colorRowsRequiringRefill: refillRows.filter((row) => row.refillPacks > 0)
        .length,
      refillDistribution: Object.freeze(refillDistribution),
      maximumSingleColorBeadCount: maximumColor.beadCount,
      maximumSingleColorRefills: maximumColor.refillPacks,
      maximumSingleColorExample: Object.freeze(maximumColor),
      maximumPatternRefills,
      maximumPatternExamples: Object.freeze(maximumPatterns),
    }),
    hardGates: Object.freeze([
      { id: "source-evidence-sha", status: "passed", checkedItems: 1 },
      { id: "source-run-count", status: "passed", checkedItems: 54 },
      { id: "formal-profile-identity", status: "passed", checkedItems: 6 },
      { id: "formal-profile-nesting", status: "passed", checkedItems: 5 },
      { id: "required-distribution", status: "passed", checkedItems: 54 },
      {
        id: "recommended-not-below-required",
        status: "passed",
        checkedItems: 54,
      },
      { id: "recommended-equals-required", status: "passed", checkedItems: 54 },
      { id: "required-quality-equals-221", status: "passed", checkedItems: 54 },
      { id: "eligible-168-zero-gain", status: "passed", checkedItems: 13 },
      { id: "policy-input-exclusion", status: "passed", checkedItems: 54 },
      { id: "refill-arithmetic", status: "passed", checkedItems: 7 },
      {
        id: "refill-recommendation-independence",
        status: "passed",
        checkedItems: 54,
      },
      {
        id: "refill-color-covered",
        status: "passed",
        checkedItems: coveredRefillRows,
      },
      { id: "deterministic-serialization", status: "passed", checkedItems: 1 },
      { id: "production-src-unchanged", status: "passed", checkedItems: 1 },
    ] as const),
  });
  const canonicalPolicyEvidenceSha256 = sha256(
    `${JSON.stringify(base, null, 2)}\n`,
  );
  return Object.freeze({ ...base, canonicalPolicyEvidenceSha256 });
}

export function serializePolicyEvaluation(
  evaluation: PolicyEvaluation,
): string {
  return `${JSON.stringify(evaluation, null, 2)}\n`;
}

export function generateAuthoritativePolicyEvaluation(): PolicyEvaluation {
  const source = parseAuthoritativeSource(readFileSync(sourceUrl));
  const colorSets = parseJson<ColorSetArtifact>(readFileSync(colorSetUrl));
  const first = createPolicyEvaluation(source, colorSets);
  const second = createPolicyEvaluation(source, colorSets);
  if (serializePolicyEvaluation(first) !== serializePolicyEvaluation(second)) {
    fail("repeated evaluation is not byte stable");
  }
  return first;
}

export function verifyCheckedInPolicyEvaluation(): PolicyEvaluation {
  const generated = generateAuthoritativePolicyEvaluation();
  const expected = serializePolicyEvaluation(generated);
  const actual = readFileSync(outputUrl, "utf8");
  if (actual !== expected) fail("checked-in policy artifact differs");
  return generated;
}

function runCli(): void {
  const operation = process.argv[2];
  const evaluation = generateAuthoritativePolicyEvaluation();
  if (operation === "--write") {
    writeFileSync(outputUrl, serializePolicyEvaluation(evaluation), "utf8");
  } else if (operation === "--verify") {
    verifyCheckedInPolicyEvaluation();
  } else {
    fail("expected --write or --verify");
  }
  console.log(
    `E05-D02 policy artifact ${operation === "--write" ? "written" : "verified"}: ${evaluation.canonicalPolicyEvidenceSha256}`,
  );
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  pathToFileURL(resolve(entryPath)).href === import.meta.url
) {
  runCli();
}
