import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  broadDirection,
  consensusStatus,
  isHumanReviewChoice,
  linearWeightedCohensKappa,
  revealDirection,
  type HumanReviewChoice,
  type RevealedDirection,
} from "./generator-quality-d04-human-analysis.ts";
import {
  assertExactEvidenceIdentity,
  verifyProductionBaselineLifecycle,
} from "./generator-quality-evidence-verifier.ts";
import { serializeCanonicalJson } from "./generator-quality-scorecard.ts";

const EXPECTED_PACKET_SET_SHA =
  "1feeedeb9b04cd407526f40dd25c04a351c1389a20df6538eb8789b4027f15d7";
const EXPECTED_A01_SHA =
  "1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89";
const EXPECTED_A02_STRUCTURAL_SHA =
  "e47533d6a96fe244c188d71f173afae57617b2e1ada0a3ea6358c60e74a35a5c";
const EXPECTED_RESULTS = Object.freeze([
  Object.freeze({
    fileName:
      "poparooz-a02-reviewer-1-c208effc-8783-4880-94e4-9557d952d181.json",
    reviewerId: "reviewer-1",
    sessionId: "c208effc-8783-4880-94e4-9557d952d181",
    resultSha256:
      "55d6b4654a849cb6ba5e69e1017bef80e3bb09eb986ee36126294c824755fe17",
    byteSha256:
      "acd480f29ee368c6803a2790a9364fd55904764a117973295378b54899cbbbff",
    environmentVariable: "POPAROOZ_A02_REVIEWER_1_PATH",
  }),
  Object.freeze({
    fileName:
      "poparooz-a02-reviewer-2-83933aaf-f791-46ca-815e-d0ecbb6bbe22.json",
    reviewerId: "reviewer-2",
    sessionId: "83933aaf-f791-46ca-815e-d0ecbb6bbe22",
    resultSha256:
      "801e0ae45a4c46d85122d6e83d78e6bfda6c897af878c6e65b178b7a85b21a26",
    byteSha256:
      "4f1fee335660f26a303b0c5f6ef0d837286a3436f40271f5462705ab71c332e2",
    environmentVariable: "POPAROOZ_A02_REVIEWER_2_PATH",
  }),
]);

const repositoryRoot = process.cwd();
const a01Directory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-evidence/1.0.0",
);
const a02Directory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-a02/1.0.0",
);
const privateDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a02/private",
);
const analysisPath = path.join(
  a02Directory,
  "e05-d04-a02-human-structural-analysis.json",
);
const privateAnalysisPath = path.join(
  privateDirectory,
  "e05-d04-a02-private-reveal-analysis.json",
);
const operation = process.argv[2];
if (operation !== "--write" && operation !== "--verify") {
  throw new Error("Expected --write or --verify.");
}

const a01EvidenceText = await readFile(
  path.join(a01Directory, "e05-d04-six-profile-pattern-evidence.json"),
  "utf8",
);
const a01Evidence = JSON.parse(a01EvidenceText) as A01Evidence;
verifyCanonicalEvidence(
  a01EvidenceText,
  "canonicalEvidenceSha256",
  EXPECTED_A01_SHA,
  "A01 evidence",
);
verifyProductionBaselineLifecycle(repositoryRoot, a01Evidence.productionHead);
const structuralText = await readFile(
  path.join(a02Directory, "e05-d04-a02-structural-evidence.json"),
  "utf8",
);
const structuralEvidence = JSON.parse(structuralText) as StructuralEvidence;
verifyCanonicalEvidence(
  structuralText,
  "canonicalStructuralEvidenceSha256",
  EXPECTED_A02_STRUCTURAL_SHA,
  "A02 structural evidence",
);
const packetManifest = JSON.parse(
  await readFile(
    path.join(a02Directory, "e05-d04-a02-review-packet-manifest.json"),
    "utf8",
  ),
) as PacketManifest;
const revealKey = JSON.parse(
  await readFile(
    path.join(privateDirectory, "e05-d04-a02-review-reveal-key.json"),
    "utf8",
  ),
) as RevealKey;
if (
  packetManifest.packetSetSha256 !== EXPECTED_PACKET_SET_SHA ||
  revealKey.packetSetSha256 !== EXPECTED_PACKET_SET_SHA ||
  packetManifest.packets.length !== 60 ||
  revealKey.packets.length !== 60
) {
  throw new Error("A02 packet/reveal identity differs.");
}

await mkdir(privateDirectory, { recursive: true });
const reviewers: ValidatedReviewer[] = [];
for (const expected of EXPECTED_RESULTS) {
  const privatePath = path.join(privateDirectory, expected.fileName);
  const suppliedPath = process.env[expected.environmentVariable];
  const sourcePath =
    operation === "--write" && suppliedPath !== undefined
      ? requiredEnvironmentPath(expected.environmentVariable)
      : privatePath;
  const bytes = await readFile(sourcePath);
  const reviewer = validateReviewer(bytes, expected, packetManifest);
  reviewers.push(reviewer);
  if (operation === "--write" && sourcePath !== privatePath) {
    await writeFile(privatePath, bytes);
  }
}

const reviewerMaps = reviewers.map(
  (reviewer) =>
    new Map(
      reviewer.result.responses.map((item) => [item.packetId, item.choice]),
    ),
);
const revealByPacket = new Map(
  revealKey.packets.map((packet) => [packet.packetId, packet]),
);
const structuralByCandidate = new Map(
  structuralEvidence.runs.flatMap((run) =>
    run.transitions.map((transition) => [transition.id, transition] as const),
  ),
);
const a01ByRun = new Map(a01Evidence.runs.map((run) => [run.id, run]));
const records: AnalysisRecord[] = [];

for (const packet of packetManifest.packets) {
  const reveal = revealByPacket.get(packet.packetId);
  if (reveal === undefined) throw new Error("Reveal packet is missing.");
  const first = reviewerMaps[0]!.get(packet.packetId);
  const second = reviewerMaps[1]!.get(packet.packetId);
  if (first === undefined || second === undefined) {
    throw new Error("Reviewer response is missing.");
  }
  const leftIsLarger = reveal.leftProfileSize > reveal.rightProfileSize;
  const firstRevealed = revealDirection(first, leftIsLarger);
  const secondRevealed = revealDirection(second, leftIsLarger);
  const status = consensusStatus(first, second);
  const consensus = usableConsensus(status, firstRevealed, secondRevealed);
  const structural = structuralByCandidate.get(reveal.candidateId);
  const a01Run = a01ByRun.get(reveal.runId);
  if (structural === undefined || a01Run === undefined) {
    throw new Error("Revealed evidence join failed.");
  }
  const fromProfile = a01Run.profiles.find(
    (item) => item.profileSize === structural.fromProfileSize,
  );
  const toProfile = a01Run.profiles.find(
    (item) => item.profileSize === structural.toProfileSize,
  );
  const adjacent = a01Run.adjacentComparisons.find(
    (item) =>
      item.fromProfileSize === structural.fromProfileSize &&
      item.toProfileSize === structural.toProfileSize,
  );
  if (
    fromProfile === undefined ||
    toProfile === undefined ||
    adjacent === undefined
  ) {
    throw new Error("A01 transition evidence is missing.");
  }
  records.push(
    Object.freeze({
      packetId: packet.packetId,
      candidateId: reveal.candidateId,
      logicalCaseId: reveal.logicalCaseId,
      category: reveal.category,
      split: reveal.split,
      settings: reveal.settings,
      transition: reveal.transition,
      leftProfileSize: reveal.leftProfileSize,
      rightProfileSize: reveal.rightProfileSize,
      reviewer1: Object.freeze({
        choice: first,
        blindDirection: broadDirection(first),
        revealedDirection: firstRevealed,
      }),
      reviewer2: Object.freeze({
        choice: second,
        blindDirection: broadDirection(second),
        revealedDirection: secondRevealed,
      }),
      consensusStatus: status,
      usableConsensus: consensus,
      features: Object.freeze({
        weightedMeanDeltaE00Gain:
          fromProfile.weightedMeanPaletteDeltaE00 -
          toProfile.weightedMeanPaletteDeltaE00,
        weightedP95DeltaE00Gain:
          fromProfile.weightedP95PaletteDeltaE00 -
          toProfile.weightedP95PaletteDeltaE00,
        maximumDeltaE00Gain:
          fromProfile.maximumPaletteDeltaE00 - toProfile.maximumPaletteDeltaE00,
        changedCellPercentage: adjacent.changedCellPercentage,
        changedRegionCount: adjacent.changedRegionCount,
        usedColorDelta: toProfile.usedColorCount - fromProfile.usedColorCount,
        ...structural.structural,
      }),
    }),
  );
}

records.sort((left, right) => left.packetId.localeCompare(right.packetId));
const agreement = agreementSummary(records);
const byTransition = groupedAgreement(records, (record) => record.transition);
const byMaximumColors = groupedAgreement(records, (record) =>
  String(record.settings.maxColors),
);
const bySplit = groupedAgreement(records, (record) => record.split);
const byCategory = groupedAgreement(records, (record) => record.category);
const featureDistributions = buildFeatureDistributions(records);
const informativeFeatures = rankExploratoryFeatures(records);
const ambiguousPacketIds = records
  .filter((record) => record.usableConsensus === null)
  .map((record) => record.packetId);
const validationUsable = records.filter(
  (record) => record.split === "validation" && record.usableConsensus !== null,
);
const baseAnalysis = Object.freeze({
  schemaVersion: "1.0.0",
  evidenceId: "poparooz-e05-d04-a02-human-structural-analysis",
  stage: "P3-A03-E05-D04-A02-B",
  productionActivation: false,
  sourceGitHead: structuralEvidence.sourceGitHead,
  productionHead: a01Evidence.productionHead,
  identities: Object.freeze({
    packetSetSha256: EXPECTED_PACKET_SET_SHA,
    a01CanonicalEvidenceSha256: EXPECTED_A01_SHA,
    a02StructuralCanonicalEvidenceSha256: EXPECTED_A02_STRUCTURAL_SHA,
    reviewers: Object.freeze(
      reviewers.map((reviewer) =>
        Object.freeze({
          reviewerId: reviewer.result.reviewerId,
          sessionId: reviewer.result.sessionId,
          resultSha256: reviewer.result.resultSha256,
          originalFileByteSha256: reviewer.byteSha256,
        }),
      ),
    ),
  }),
  integrity: Object.freeze({
    reviewerFilesValidated: 2,
    eachLocked: true,
    responsesPerReviewer: 60,
    exactPacketSetCoverage: true,
    originalFilesAvailableOnlyInIgnoredPrivateArtifacts: true,
    revealAfterIntegrityValidation: true,
  }),
  agreement,
  groupedAgreement: Object.freeze({
    byTransition,
    byMaximumColors,
    bySplit,
    byCategory,
  }),
  consensus: Object.freeze({
    rule: Object.freeze({
      exactDirectionAgreement:
        "same broad direction and same six-choice strength",
      softDirectionAgreement:
        "same non-neutral broad direction with different strength",
      neutralAgreement: "both no-meaningful-difference",
      directOpposite:
        "one reviewer prefers each side; retained as disagreement",
      directionNeutral:
        "one reviewer prefers a side and the other reports no meaningful difference",
      cannotJudge: "any cannot-judge response remains uncertain",
      usableForExploratoryPredictor:
        "exact/soft same direction or both neutral only",
    }),
    distribution: countBy(records, (record) => record.consensusStatus),
    usableDirectionDistribution: countBy(
      records.filter((record) => record.usableConsensus !== null),
      (record) => record.usableConsensus!,
    ),
  }),
  featureDistributions,
  exploratoryFeatureRanking: informativeFeatures,
  calibration: Object.freeze({
    splitFrozenBeforeHumanAnalysis: true,
    logicalCaseCounts: Object.freeze({ calibration: 15, validation: 9 }),
    sampledComparisonCounts: countBy(records, (record) => record.split),
    usableConsensusCounts: countBy(
      records.filter((record) => record.usableConsensus !== null),
      (record) => record.split,
    ),
    conclusion:
      "Calibration labels are too sparse and inter-reviewer stability too weak to select defensible feature thresholds without overfitting.",
  }),
  frozenCandidatePredictor: Object.freeze({
    id: "a02-abstain-only-v1",
    status: "evaluation-only",
    rule: "Always abstain; do not recommend a profile change.",
    rationale:
      "No nontrivial deterministic rule was frozen because calibration human ground truth was not stable enough.",
  }),
  heldOutValidation: Object.freeze({
    usableConsensusComparisons: validationUsable.length,
    decisionCoverageCount: 0,
    decisionCoveragePercentage: 0,
    abstentionCount: records.filter((record) => record.split === "validation")
      .length,
    falseSmallCount: 0,
    falseLargeCount: 0,
    visualRegressionRecommendationCount: 0,
    interpretation:
      "Zero errors are vacuous because the abstain-only candidate makes no recommendations; it does not demonstrate a useful recommendation predictor.",
  }),
  thirdReviewer: Object.freeze({
    recommended: true,
    scope: "targeted ambiguous packets only",
    packetCount: ambiguousPacketIds.length,
    limitation:
      "A third vote may resolve some packets but cannot remove underlying subjectivity; results still require case-level held-out evaluation.",
  }),
  finalDecision:
    "EVIDENCE IMPROVED BUT INSUFFICIENT — THIRD REVIEW / MORE EVALUATION REQUIRED",
});
const canonicalHumanAnalysisSha256 = sha256(
  serializeCanonicalJson(baseAnalysis),
);
const analysis = Object.freeze({
  ...baseAnalysis,
  canonicalHumanAnalysisSha256,
});
const serialized = serializeCanonicalJson(analysis);
const serializedPrivateAnalysis = serializeCanonicalJson({
  scope:
    "Local private reproduction input/output; excluded from Git and remote history",
  packetSetSha256: EXPECTED_PACKET_SET_SHA,
  reviewerFiles: reviewers.map((reviewer) => ({
    fileName: reviewer.fileName,
    reviewerId: reviewer.result.reviewerId,
    sessionId: reviewer.result.sessionId,
    startedAt: reviewer.result.startedAt,
    completedAt: reviewer.result.completedAt,
    resultSha256: reviewer.result.resultSha256,
    originalFileByteSha256: reviewer.byteSha256,
  })),
  ambiguousPacketIds,
  records,
});
if (operation === "--write") await writeFile(analysisPath, serialized, "utf8");
else {
  const checkedIn = await readFile(analysisPath, "utf8");
  assertExactEvidenceIdentity(checkedIn, serialized, "A02-B human analysis");
}
if (operation === "--write") {
  await writeFile(privateAnalysisPath, serializedPrivateAnalysis, "utf8");
} else {
  const privateAnalysis = await readFile(privateAnalysisPath, "utf8");
  assertExactEvidenceIdentity(
    privateAnalysis,
    serializedPrivateAnalysis,
    "Local private A02-B reveal analysis",
  );
}
process.stdout.write(
  [
    `Reviewer files: ${reviewers.length}/2 valid`,
    `Exact agreement: ${agreement.exactAgreementCount}/60`,
    `Broad agreement: ${agreement.broadAgreementCount}/60`,
    `Direct opposite: ${agreement.directOppositeCount}/60`,
    `Usable consensus: ${records.filter((record) => record.usableConsensus !== null).length}/60`,
    `Weighted kappa: ${agreement.linearWeightedKappa.kappa}`,
    `Canonical human analysis SHA-256: ${canonicalHumanAnalysisSha256}`,
  ].join("\n") + "\n",
);

interface ReviewerResponse {
  readonly packetId: string;
  readonly choice: HumanReviewChoice;
  readonly answeredAt: string;
}

interface ReviewerResult {
  readonly schemaVersion: number;
  readonly stage: string;
  readonly packetSetId: string;
  readonly packetSetSha256: string;
  readonly reviewerId: string;
  readonly sessionId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly locked: boolean;
  readonly responses: readonly ReviewerResponse[];
  readonly resultSha256: string;
}

interface ValidatedReviewer {
  readonly fileName: string;
  readonly byteSha256: string;
  readonly result: ReviewerResult;
}

interface PacketManifest {
  readonly packetSetId: string;
  readonly packetSetSha256: string;
  readonly packets: readonly { readonly packetId: string }[];
}

interface RevealPacket {
  readonly packetId: string;
  readonly candidateId: string;
  readonly runId: string;
  readonly logicalCaseId: string;
  readonly category: string;
  readonly split: "calibration" | "validation";
  readonly settings: Readonly<{
    background: string;
    patternSize: number;
    maxColors: number;
  }>;
  readonly transition: string;
  readonly leftProfileSize: number;
  readonly rightProfileSize: number;
}

interface RevealKey {
  readonly packetSetSha256: string;
  readonly packets: readonly RevealPacket[];
}

interface StructuralTransition {
  readonly id: string;
  readonly fromProfileSize: number;
  readonly toProfileSize: number;
  readonly structural: Readonly<Record<string, number | null>>;
}

interface StructuralEvidence {
  readonly sourceGitHead: string;
  readonly runs: readonly {
    readonly transitions: readonly StructuralTransition[];
  }[];
}

interface A01Profile {
  readonly profileSize: number;
  readonly usedColorCount: number;
  readonly weightedMeanPaletteDeltaE00: number;
  readonly weightedP95PaletteDeltaE00: number;
  readonly maximumPaletteDeltaE00: number;
}

interface A01Adjacent {
  readonly fromProfileSize: number;
  readonly toProfileSize: number;
  readonly changedCellPercentage: number;
  readonly changedRegionCount: number;
}

interface A01Evidence {
  readonly productionHead: string;
  readonly runs: readonly {
    readonly id: string;
    readonly profiles: readonly A01Profile[];
    readonly adjacentComparisons: readonly A01Adjacent[];
  }[];
}

interface AnalysisRecord {
  readonly packetId: string;
  readonly candidateId: string;
  readonly logicalCaseId: string;
  readonly category: string;
  readonly split: "calibration" | "validation";
  readonly settings: RevealPacket["settings"];
  readonly transition: string;
  readonly leftProfileSize: number;
  readonly rightProfileSize: number;
  readonly reviewer1: Readonly<{
    choice: HumanReviewChoice;
    blindDirection: string;
    revealedDirection: RevealedDirection;
  }>;
  readonly reviewer2: Readonly<{
    choice: HumanReviewChoice;
    blindDirection: string;
    revealedDirection: RevealedDirection;
  }>;
  readonly consensusStatus: string;
  readonly usableConsensus: Exclude<RevealedDirection, "cannot"> | null;
  readonly features: Readonly<Record<string, number | null>>;
}

function requiredEnvironmentPath(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required for --write.`);
  }
  return value;
}

function validateReviewer(
  bytes: Buffer,
  expected: (typeof EXPECTED_RESULTS)[number],
  manifest: PacketManifest,
): ValidatedReviewer {
  const byteSha256 = sha256(bytes);
  const parsed: unknown = JSON.parse(bytes.toString("utf8"));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${expected.fileName} schema differs.`);
  }
  const result = parsed as ReviewerResult;
  if (
    byteSha256 !== expected.byteSha256 ||
    result.schemaVersion !== 1 ||
    result.stage !== "P3-A03-E05-D04-A02" ||
    result.packetSetId !== manifest.packetSetId ||
    result.packetSetSha256 !== EXPECTED_PACKET_SET_SHA ||
    result.reviewerId !== expected.reviewerId ||
    result.sessionId !== expected.sessionId ||
    result.locked !== true ||
    result.responses.length !== 60 ||
    result.resultSha256 !== expected.resultSha256
  ) {
    throw new Error(`${expected.fileName} identity differs.`);
  }
  const packetIds = [
    ...new Set(result.responses.map((item) => item.packetId)),
  ].sort();
  const expectedPacketIds = manifest.packets
    .map((item) => item.packetId)
    .sort();
  if (
    JSON.stringify(packetIds) !== JSON.stringify(expectedPacketIds) ||
    result.responses.some((item) => !isHumanReviewChoice(item.choice))
  ) {
    throw new Error(`${expected.fileName} response coverage differs.`);
  }
  const hashInput = { ...(result as unknown as Record<string, unknown>) };
  delete hashInput.resultSha256;
  if (sha256(serializeSortedJson(hashInput)) !== result.resultSha256) {
    throw new Error(`${expected.fileName} result SHA differs.`);
  }
  return Object.freeze({ fileName: expected.fileName, byteSha256, result });
}

function usableConsensus(
  status: string,
  first: RevealedDirection,
  second: RevealedDirection,
): Exclude<RevealedDirection, "cannot"> | null {
  if (status === "neutral_agreement") return "neutral";
  if (
    status === "exact_direction_agreement" ||
    status === "soft_direction_agreement"
  ) {
    if (first !== second || first === "cannot") {
      throw new Error("Consensus direction is inconsistent.");
    }
    return first;
  }
  return null;
}

function agreementSummary(records: readonly AnalysisRecord[]) {
  const pairs = records.map(
    (record) => [record.reviewer1.choice, record.reviewer2.choice] as const,
  );
  const withoutCannot = records.filter(
    (record) =>
      record.reviewer1.blindDirection !== "cannot" &&
      record.reviewer2.blindDirection !== "cannot",
  );
  return Object.freeze({
    comparisonCount: records.length,
    exactAgreementCount: records.filter(
      (record) => record.reviewer1.choice === record.reviewer2.choice,
    ).length,
    exactAgreementPercentage:
      (records.filter(
        (record) => record.reviewer1.choice === record.reviewer2.choice,
      ).length /
        records.length) *
      100,
    broadAgreementCount: records.filter(
      (record) =>
        record.reviewer1.blindDirection === record.reviewer2.blindDirection,
    ).length,
    broadAgreementPercentage:
      (records.filter(
        (record) =>
          record.reviewer1.blindDirection === record.reviewer2.blindDirection,
      ).length /
        records.length) *
      100,
    excludingCannotJudge: Object.freeze({
      comparisonCount: withoutCannot.length,
      exactAgreementCount: withoutCannot.filter(
        (record) => record.reviewer1.choice === record.reviewer2.choice,
      ).length,
      broadAgreementCount: withoutCannot.filter(
        (record) =>
          record.reviewer1.blindDirection === record.reviewer2.blindDirection,
      ).length,
    }),
    directOppositeCount: records.filter(
      (record) => record.consensusStatus === "direct_opposite_disagreement",
    ).length,
    directOppositePercentage:
      (records.filter(
        (record) => record.consensusStatus === "direct_opposite_disagreement",
      ).length /
        records.length) *
      100,
    linearWeightedKappa: linearWeightedCohensKappa(pairs),
    blindCrossTab: countBy(
      records,
      (record) =>
        `${record.reviewer1.blindDirection}|${record.reviewer2.blindDirection}`,
    ),
  });
}

function groupedAgreement(
  records: readonly AnalysisRecord[],
  key: (record: AnalysisRecord) => string,
) {
  return Object.freeze(
    [...new Set(records.map(key))].sort().map((value) => {
      const group = records.filter((record) => key(record) === value);
      return Object.freeze({ key: value, ...agreementSummary(group) });
    }),
  );
}

function buildFeatureDistributions(records: readonly AnalysisRecord[]) {
  const usable = records.filter((record) => record.usableConsensus !== null);
  const featureNames = Object.keys(usable[0]?.features ?? {}).sort();
  return Object.freeze(
    ["larger", "smaller", "neutral"].map((direction) => {
      const group = usable.filter(
        (record) => record.usableConsensus === direction,
      );
      return Object.freeze({
        direction,
        comparisonCount: group.length,
        features: Object.freeze(
          featureNames.map((feature) =>
            Object.freeze({
              feature,
              ...distribution(
                group
                  .map((record) => record.features[feature])
                  .filter(
                    (value): value is number => typeof value === "number",
                  ),
              ),
            }),
          ),
        ),
      });
    }),
  );
}

function rankExploratoryFeatures(records: readonly AnalysisRecord[]) {
  const calibration = records.filter(
    (record) =>
      record.split === "calibration" && record.usableConsensus !== null,
  );
  const featureNames = Object.keys(calibration[0]?.features ?? {}).sort();
  return Object.freeze(
    featureNames
      .map((feature) => {
        const all = calibration
          .map((record) => record.features[feature])
          .filter((value): value is number => typeof value === "number")
          .sort((left, right) => left - right);
        const medians = ["larger", "smaller", "neutral"].map((direction) => {
          const values = calibration
            .filter((record) => record.usableConsensus === direction)
            .map((record) => record.features[feature])
            .filter((value): value is number => typeof value === "number")
            .sort((left, right) => left - right);
          return Object.freeze({
            direction,
            count: values.length,
            median: quantile(values, 0.5),
          });
        });
        const finiteMedians = medians
          .map((item) => item.median)
          .filter((value): value is number => value !== null);
        const iqr = (quantile(all, 0.75) ?? 0) - (quantile(all, 0.25) ?? 0);
        const spread =
          finiteMedians.length === 0
            ? 0
            : Math.max(...finiteMedians) - Math.min(...finiteMedians);
        return Object.freeze({
          feature,
          medians: Object.freeze(medians),
          normalizedMedianSpread: iqr === 0 ? null : spread / iqr,
        });
      })
      .sort(
        (left, right) =>
          (right.normalizedMedianSpread ?? -1) -
            (left.normalizedMedianSpread ?? -1) ||
          left.feature.localeCompare(right.feature),
      ),
  );
}

function distribution(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return Object.freeze({
    count: sorted.length,
    minimum: sorted[0] ?? null,
    p25: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    maximum: sorted.at(-1) ?? null,
    mean:
      sorted.length === 0
        ? null
        : sorted.reduce((total, value) => total + value, 0) / sorted.length,
  });
}

function quantile(sorted: readonly number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.floor((sorted.length - 1) * fraction)]!;
}

function countBy<Value>(
  values: readonly Value[],
  key: (value: Value) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const item = key(value);
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(counts).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
}

function verifyCanonicalEvidence(
  text: string,
  field: string,
  expected: string,
  label: string,
): void {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  if (parsed[field] !== expected)
    throw new Error(`${label} SHA field differs.`);
  delete parsed[field];
  if (sha256(serializeCanonicalJson(parsed)) !== expected) {
    throw new Error(`${label} canonical content differs.`);
  }
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function serializeSortedJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeSortedJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${serializeSortedJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
