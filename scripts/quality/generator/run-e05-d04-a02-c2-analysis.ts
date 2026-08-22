import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isHumanReviewChoice,
  revealDirection,
  threeReviewerConsensus,
  type HumanReviewChoice,
  type RevealedDirection,
  type ThreeReviewerConsensusLabel,
} from "./generator-quality-d04-human-analysis.ts";
import {
  A02_C2_FROZEN_POLICY,
  evaluateA02C2FrozenPolicy,
  type A02C2PolicyDecision,
} from "./generator-quality-d04-c2-policy.ts";
import { verifyProductionBaselineLifecycle } from "./generator-quality-evidence-verifier.ts";
import { serializeCanonicalJson } from "./generator-quality-scorecard.ts";

const EXPECTED_SOURCE_GIT_HEAD = "4d60dae351d8839daf0a6a971807b4aed23d7597";
const EXPECTED_A01_SHA =
  "1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89";
const EXPECTED_A02_STRUCTURAL_SHA =
  "e47533d6a96fe244c188d71f173afae57617b2e1ada0a3ea6358c60e74a35a5c";
const EXPECTED_A02_HUMAN_SHA =
  "367b1458bf39f66fcaa41690ef63921a24a7076724de4c8b5da5448dd77ea6a4";
const EXPECTED_SOURCE_PACKET_SHA =
  "1feeedeb9b04cd407526f40dd25c04a351c1389a20df6538eb8789b4027f15d7";
const EXPECTED_PRIVATE_ANALYSIS_SHA =
  "5fc1e0d13f84712d3cc3b170ee3444066873e85da698cb5cf9d5d13b5a8e494e";
const EXPECTED_SOURCE_REVEAL_SHA =
  "92596bff8f2219098bad50268263b2dea935b71b4af3131a3239ed6a1b28494e";
const EXPECTED_REVIEWER_1_FILE_SHA =
  "acd480f29ee368c6803a2790a9364fd55904764a117973295378b54899cbbbff";
const EXPECTED_REVIEWER_2_FILE_SHA =
  "4f1fee335660f26a303b0c5f6ef0d837286a3436f40271f5462705ab71c332e2";
const EXPECTED_TARGET_PACKET_SHA =
  "e058fe70996ec37805c8610a5bb8e2cbf7bfc9fdfc84644ff737ce42986a842f";
const EXPECTED_C1_MANIFEST_FILE_SHA =
  "f1fd92d68a41794bfd048ef176e717cac09296b93a409773772131426f8a1f22";
const EXPECTED_C1_REVEAL_FILE_SHA =
  "4515e4939eb5782c050242b7e4ce9eb365d2e3df3bcf9fd74af08faa2b8068f1";
const EXPECTED_C1_AUDIT_FILE_SHA =
  "ba386d117f3efaa91bb8ada17dacc3d037903cf546f053e4873521a9b3fde8d0";
const EXPECTED_C1_HTML_FILE_SHA =
  "58efa96ba16c8219752a8faa785836d6b548381402b7ddff8a84c793ef71434a";
const EXPECTED_REVIEWER_3_FILE_SHA =
  "ce8696a14c446c25baf0af8214659d45d097ca6296ea28bfcee8182a09a2ddd8";
const EXPECTED_REVIEWER_3_RESULT_SHA =
  "61c72bfdce5fc5fbf497f225b012099d1a906888d58312545cf6c863ffbc05d5";
const EXPECTED_REVIEWER_3_SESSION_ID = "cb755fb2-de89-4789-a33c-691c0ff149be";
const REVIEWER_3_FILE_NAME =
  "poparooz-a02-c1-reviewer-3-cb755fb2-de89-4789-a33c-691c0ff149be.json";

const repositoryRoot = process.cwd();
const a01Directory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-evidence/1.0.0",
);
const a02Directory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-a02/1.0.0",
);
const a02PrivateDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a02/private",
);
const c1PrivateDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a02-c1/private",
);
const c2PrivateDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a02-c2/private",
);
const permanentDirectory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-a02-c2/1.0.0",
);
const reviewer3PrivatePath = path.join(
  c2PrivateDirectory,
  REVIEWER_3_FILE_NAME,
);
const privateAnalysisOutputPath = path.join(
  c2PrivateDirectory,
  "e05-d04-a02-c2-private-analysis.json",
);
const permanentEvidencePath = path.join(
  permanentDirectory,
  "e05-d04-a02-c2-three-reviewer-analysis.json",
);
const operation = process.argv[2];
if (operation !== "--write" && operation !== "--verify") {
  throw new Error("Expected --write or --verify.");
}

const a01Text = await readFile(
  path.join(a01Directory, "e05-d04-six-profile-pattern-evidence.json"),
  "utf8",
);
const a01 = JSON.parse(a01Text) as A01Evidence;
verifyCanonicalEvidence(
  a01Text,
  "canonicalEvidenceSha256",
  EXPECTED_A01_SHA,
  "A01",
);
verifyProductionBaselineLifecycle(repositoryRoot, a01.productionHead);
const structuralText = await readFile(
  path.join(a02Directory, "e05-d04-a02-structural-evidence.json"),
  "utf8",
);
verifyCanonicalEvidence(
  structuralText,
  "canonicalStructuralEvidenceSha256",
  EXPECTED_A02_STRUCTURAL_SHA,
  "A02 structural",
);
const humanText = await readFile(
  path.join(a02Directory, "e05-d04-a02-human-structural-analysis.json"),
  "utf8",
);
verifyCanonicalEvidence(
  humanText,
  "canonicalHumanAnalysisSha256",
  EXPECTED_A02_HUMAN_SHA,
  "A02 human",
);

const privateAnalysisBytes = await readExpectedFile(
  path.join(a02PrivateDirectory, "e05-d04-a02-private-reveal-analysis.json"),
  EXPECTED_PRIVATE_ANALYSIS_SHA,
  "A02 private analysis",
);
await readExpectedFile(
  path.join(a02PrivateDirectory, "e05-d04-a02-review-reveal-key.json"),
  EXPECTED_SOURCE_REVEAL_SHA,
  "A02 reveal key",
);
await readExpectedFile(
  path.join(
    a02PrivateDirectory,
    "poparooz-a02-reviewer-1-c208effc-8783-4880-94e4-9557d952d181.json",
  ),
  EXPECTED_REVIEWER_1_FILE_SHA,
  "Reviewer 1 original",
);
await readExpectedFile(
  path.join(
    a02PrivateDirectory,
    "poparooz-a02-reviewer-2-83933aaf-f791-46ca-815e-d0ecbb6bbe22.json",
  ),
  EXPECTED_REVIEWER_2_FILE_SHA,
  "Reviewer 2 original",
);
const c1ManifestBytes = await readExpectedFile(
  path.join(c1PrivateDirectory, "e05-d04-a02-c1-targeted-packet-manifest.json"),
  EXPECTED_C1_MANIFEST_FILE_SHA,
  "C1 targeted manifest",
);
const c1RevealBytes = await readExpectedFile(
  path.join(c1PrivateDirectory, "e05-d04-a02-c1-targeted-reveal-key.json"),
  EXPECTED_C1_REVEAL_FILE_SHA,
  "C1 targeted reveal",
);
await readExpectedFile(
  path.join(c1PrivateDirectory, "e05-d04-a02-c1-preparation-audit.json"),
  EXPECTED_C1_AUDIT_FILE_SHA,
  "C1 preparation audit",
);
await readExpectedFile(
  path.join(c1PrivateDirectory, "poparooz-a02-c1-reviewer-3.html"),
  EXPECTED_C1_HTML_FILE_SHA,
  "C1 review HTML",
);

await mkdir(c2PrivateDirectory, { recursive: true });
if (operation === "--write") {
  const suppliedPath = process.env.POPAROOZ_A02_REVIEWER_3_PATH;
  if (suppliedPath === undefined || suppliedPath.trim() === "") {
    throw new Error("POPAROOZ_A02_REVIEWER_3_PATH is required for --write.");
  }
  const suppliedBytes = await readFile(suppliedPath);
  validateReviewer3(
    suppliedBytes,
    JSON.parse(c1ManifestBytes.toString("utf8")),
  );
  await copyFile(suppliedPath, reviewer3PrivatePath);
}
const reviewer3Bytes = await readFile(reviewer3PrivatePath);
const c1Manifest = JSON.parse(c1ManifestBytes.toString("utf8")) as C1Manifest;
const reviewer3 = validateReviewer3(reviewer3Bytes, c1Manifest);
const privateAnalysis = JSON.parse(
  privateAnalysisBytes.toString("utf8"),
) as PrivateAnalysis;
const c1Reveal = JSON.parse(c1RevealBytes.toString("utf8")) as C1Reveal;
validatePrivateInputs(privateAnalysis, c1Reveal, c1Manifest);

const reviewer3ByPacket = new Map(
  reviewer3.responses.map((response) => [response.packetId, response]),
);
const records: FinalRecord[] = privateAnalysis.records.map((record) => {
  if (record.usableConsensus !== null) {
    return Object.freeze({
      ...record,
      targetedForReviewer3: false,
      reviewer3: null,
      finalConsensusStatus:
        record.usableConsensus === "neutral"
          ? "preserved_neutral_consensus"
          : "preserved_directional_consensus",
      finalConsensusLabel: record.usableConsensus,
      policyDecision: evaluateA02C2FrozenPolicy(record.features),
    });
  }
  const response = reviewer3ByPacket.get(record.packetId);
  if (response === undefined)
    throw new Error("Reviewer 3 response is missing.");
  const reviewer3Direction = revealDirection(
    response.choice,
    record.leftProfileSize > record.rightProfileSize,
  );
  const consensus = threeReviewerConsensus([
    record.reviewer1.revealedDirection,
    record.reviewer2.revealedDirection,
    reviewer3Direction,
  ]);
  return Object.freeze({
    ...record,
    targetedForReviewer3: true,
    reviewer3: Object.freeze({
      choice: response.choice,
      revealedDirection: reviewer3Direction,
    }),
    finalConsensusStatus: consensus.status,
    finalConsensusLabel: consensus.label,
    policyDecision: evaluateA02C2FrozenPolicy(record.features),
  });
});

if (
  records.length !== 60 ||
  records.filter((record) => record.targetedForReviewer3).length !== 35 ||
  records.filter((record) => !record.targetedForReviewer3).length !== 25
) {
  throw new Error("Three-reviewer record coverage differs.");
}

const policyHash = sha256(serializeCanonicalJson(A02_C2_FROZEN_POLICY));
const targeted = records.filter((record) => record.targetedForReviewer3);
const calibration = records.filter((record) => record.split === "calibration");
const validation = records.filter((record) => record.split === "validation");
const privateOutput = Object.freeze({
  warning:
    "Local private response-level reveal analysis. Never commit, upload, or publish.",
  stage: "P3-A03-E05-D04-A02-C2",
  identities: Object.freeze({
    sourcePacketSetSha256: EXPECTED_SOURCE_PACKET_SHA,
    targetPacketSetSha256: EXPECTED_TARGET_PACKET_SHA,
    reviewer3OriginalFileSha256: EXPECTED_REVIEWER_3_FILE_SHA,
    reviewer3ResultSha256: EXPECTED_REVIEWER_3_RESULT_SHA,
    frozenPolicySha256: policyHash,
  }),
  records: Object.freeze(records),
  validationRiskRecords: Object.freeze(
    validation.filter(
      (record) =>
        record.policyDecision === "recommend_larger" &&
        record.finalConsensusLabel !== "larger",
    ),
  ),
});
const permanentBase = Object.freeze({
  schemaVersion: "1.0.0",
  evidenceId: "poparooz-e05-d04-a02-c2-three-reviewer-analysis-1.0.0",
  stage: "P3-A03-E05-D04-A02-C2",
  phase: "evaluation-only",
  productionActivation: "NOT ACTIVATED",
  sourceGitHead: EXPECTED_SOURCE_GIT_HEAD,
  productionHead: a01.productionHead,
  identities: Object.freeze({
    a01CanonicalEvidenceSha256: EXPECTED_A01_SHA,
    a02StructuralCanonicalEvidenceSha256: EXPECTED_A02_STRUCTURAL_SHA,
    a02HumanCanonicalEvidenceSha256: EXPECTED_A02_HUMAN_SHA,
    sourcePacketSetSha256: EXPECTED_SOURCE_PACKET_SHA,
    targetPacketSetSha256: EXPECTED_TARGET_PACKET_SHA,
    privateAnalysisSha256: EXPECTED_PRIVATE_ANALYSIS_SHA,
    sourceRevealKeySha256: EXPECTED_SOURCE_REVEAL_SHA,
    c1TargetedManifestFileSha256: EXPECTED_C1_MANIFEST_FILE_SHA,
    c1TargetedRevealFileSha256: EXPECTED_C1_REVEAL_FILE_SHA,
    c1PreparationAuditFileSha256: EXPECTED_C1_AUDIT_FILE_SHA,
    c1ReviewHtmlFileSha256: EXPECTED_C1_HTML_FILE_SHA,
    reviewers: Object.freeze([
      Object.freeze({
        reviewerId: "reviewer-1",
        sessionId: "c208effc-8783-4880-94e4-9557d952d181",
        resultSha256:
          "55d6b4654a849cb6ba5e69e1017bef80e3bb09eb986ee36126294c824755fe17",
        originalFileSha256: EXPECTED_REVIEWER_1_FILE_SHA,
      }),
      Object.freeze({
        reviewerId: "reviewer-2",
        sessionId: "83933aaf-f791-46ca-815e-d0ecbb6bbe22",
        resultSha256:
          "801e0ae45a4c46d85122d6e83d78e6bfda6c897af878c6e65b178b7a85b21a26",
        originalFileSha256: EXPECTED_REVIEWER_2_FILE_SHA,
      }),
      Object.freeze({
        reviewerId: "reviewer-3",
        sessionId: EXPECTED_REVIEWER_3_SESSION_ID,
        resultSha256: EXPECTED_REVIEWER_3_RESULT_SHA,
        originalFileSha256: EXPECTED_REVIEWER_3_FILE_SHA,
      }),
    ]),
  }),
  integrity: Object.freeze({
    reviewer3SchemaAndIdentity: "PASS",
    reviewer3ResponseCoverage: "35/35 exact",
    reviewer3OriginalBytesPreserved: true,
    a01IdentityGate: "PASS",
    a02IdentityGate: "PASS",
    c1IdentityGate: "PASS",
    responseLevelDataCommitted: false,
  }),
  consensus: Object.freeze({
    originalTwoReviewerConsensusPreserved: 25,
    targetedResolution: consensusSummary(targeted),
    allComparisons: consensusSummary(records),
    reviewer3CoverageImprovement: Object.freeze({
      beforeUsableConsensusCount: 25,
      afterUsableConsensusCount: usable(records).length,
      usableConsensusGain: usable(records).length - 25,
      beforeUsablePercentage: (25 / 60) * 100,
      afterUsablePercentage: (usable(records).length / 60) * 100,
    }),
  }),
  groupedConsensus: Object.freeze({
    transition: groupedConsensus(records, (record) => record.transition),
    maximumColors: groupedConsensus(records, (record) =>
      String(record.settings.maxColors),
    ),
    split: groupedConsensus(records, (record) => record.split),
    evaluationOnlyCategory: groupedConsensus(
      records,
      (record) => record.category,
    ),
  }),
  featureDistributions: Object.freeze({
    allComparisons: featureDistributions(records),
    calibrationOnly: featureDistributions(calibration),
  }),
  structuralConclusion: Object.freeze({
    stableDirectionalSeparation: false,
    finding:
      "Boundary, switching, dominance, micro-component, and fragmentation distributions overlap across larger, smaller, and neutral consensus.",
    productionUse: "unsupported",
  }),
  calibration: Object.freeze({
    logicalCaseCount: 15,
    comparisonCount: calibration.length,
    consensus: consensusSummary(calibration),
    frozenPolicyResult: policyEvaluation(calibration),
    validationLabelsInspectedDuringFreeze: false,
    selectionFinding:
      "The two-guard rule was the only frozen nontrivial candidate; calibration recommendations were 4/4 larger consensus with no smaller, neutral, ambiguous, or uncertain hits.",
  }),
  frozenCandidatePolicy: Object.freeze({
    ...A02_C2_FROZEN_POLICY,
    policySha256: policyHash,
  }),
  heldOutValidation: Object.freeze({
    logicalCaseCount: 9,
    comparisonCount: validation.length,
    consensus: consensusSummary(validation),
    ...policyEvaluation(validation),
    policyChangedAfterValidation: false,
  }),
  globalSixProfileApplicability: Object.freeze({
    supported: false,
    reason:
      "The evidence covers sampled adjacent transitions and does not establish monotonic or globally optimal selection across 24/48/72/120/168/221.",
  }),
  productOptions: Object.freeze({
    fullAutomatic: "not supported",
    conservativeWithAbstention:
      "evaluated candidate failed held-out safety because it produced a visual-regression recommendation",
    manualWithExplanatoryUx: "supported current direction",
  }),
  recommendedProductDirection:
    "Keep manual Generation Color Set selection; do not activate automatic Recommendation.",
  semantics: Object.freeze({
    currentGeneration: "profile actually used for the displayed Pattern",
    recommendedForYourImage: "advisory only; not activated",
    minimumRequiredForCurrentPattern: "material coverage only",
    recommendationDoesNotAlter:
      "Required, Refill, Materials, or Purchase without successful regeneration",
  }),
  finalDecision: "DETERMINISTIC GENERATION RECOMMENDATION NOT RELIABLE ENOUGH",
});
const permanentOutput = Object.freeze({
  ...permanentBase,
  canonicalC2EvidenceSha256: sha256(serializeCanonicalJson(permanentBase)),
});

await mkdir(permanentDirectory, { recursive: true });
await writeOrVerify(
  privateAnalysisOutputPath,
  serializeCanonicalJson(privateOutput),
);
await writeOrVerify(
  permanentEvidencePath,
  serializeCanonicalJson(permanentOutput),
);

process.stdout.write(
  [
    `Reviewer 3 original-file SHA-256: ${EXPECTED_REVIEWER_3_FILE_SHA}`,
    `Targeted resolved usable: ${usable(targeted).length}/35`,
    `All usable consensus: ${usable(records).length}/60`,
    `Frozen policy SHA-256: ${policyHash}`,
    `Validation decisions: ${policyEvaluation(validation).decisionCount}/25`,
    `Validation visual-regression recommendations: ${policyEvaluation(validation).visualRegressionRecommendationCount}`,
    `C2 canonical evidence SHA-256: ${permanentOutput.canonicalC2EvidenceSha256}`,
  ].join("\n") + "\n",
);

async function writeOrVerify(filePath: string, content: string): Promise<void> {
  if (operation === "--write") await writeFile(filePath, content, "utf8");
  else if ((await readFile(filePath, "utf8")) !== content) {
    throw new Error(`${path.basename(filePath)} is not deterministic.`);
  }
}

async function readExpectedFile(
  filePath: string,
  expectedSha: string,
  label: string,
): Promise<Buffer> {
  const bytes = await readFile(filePath);
  if (sha256(bytes) !== expectedSha) throw new Error(`${label} SHA differs.`);
  return bytes;
}

function validateReviewer3(
  bytes: Buffer,
  manifest: C1Manifest,
): ReviewerResult {
  if (sha256(bytes) !== EXPECTED_REVIEWER_3_FILE_SHA) {
    throw new Error("Reviewer 3 original-file SHA differs.");
  }
  const result = JSON.parse(bytes.toString("utf8")) as ReviewerResult;
  const responseIds = result.responses.map((response) => response.packetId);
  const targetIds = manifest.packets.map((packet) => packet.packetId);
  if (
    result.schemaVersion !== 1 ||
    result.stage !== "P3-A03-E05-D04-A02-C" ||
    result.packetSetId !== "poparooz-e05-d04-a02-c1-targeted-review-1.0.0" ||
    result.packetSetSha256 !== EXPECTED_TARGET_PACKET_SHA ||
    result.reviewerId !== "reviewer-3" ||
    result.sessionId !== EXPECTED_REVIEWER_3_SESSION_ID ||
    result.locked !== true ||
    result.responses.length !== 35 ||
    new Set(responseIds).size !== 35 ||
    targetIds.length !== 35 ||
    targetIds.some((packetId) => !responseIds.includes(packetId)) ||
    result.responses.some((response) => !isHumanReviewChoice(response.choice))
  ) {
    throw new Error(
      "Reviewer 3 schema, identity, or response coverage differs.",
    );
  }
  const hashInput = { ...(result as unknown as Record<string, unknown>) };
  delete hashInput.resultSha256;
  if (
    result.resultSha256 !== EXPECTED_REVIEWER_3_RESULT_SHA ||
    sha256(serializeSortedJson(hashInput)) !== result.resultSha256
  ) {
    throw new Error("Reviewer 3 result SHA differs.");
  }
  return result;
}

function validatePrivateInputs(
  analysis: PrivateAnalysis,
  reveal: C1Reveal,
  manifest: C1Manifest,
): void {
  const targetedIds = new Set(
    manifest.packets.map((packet) => packet.packetId),
  );
  if (
    analysis.packetSetSha256 !== EXPECTED_SOURCE_PACKET_SHA ||
    analysis.records.length !== 60 ||
    analysis.ambiguousPacketIds.length !== 35 ||
    new Set(analysis.ambiguousPacketIds).size !== 35 ||
    reveal.packetSetSha256 !== EXPECTED_TARGET_PACKET_SHA ||
    manifest.packetSetSha256 !== EXPECTED_TARGET_PACKET_SHA ||
    reveal.packets.length !== 35 ||
    analysis.ambiguousPacketIds.some(
      (packetId) => !targetedIds.has(packetId),
    ) ||
    reveal.packets.some((packet) => !targetedIds.has(packet.packetId))
  ) {
    throw new Error("A02/C1 private reveal coverage differs.");
  }
}

function consensusSummary(recordsToSummarize: readonly FinalRecord[]) {
  const usableRecords = usable(recordsToSummarize);
  return Object.freeze({
    comparisonCount: recordsToSummarize.length,
    usableConsensusCount: usableRecords.length,
    ambiguousCount: recordsToSummarize.length - usableRecords.length,
    labelCounts: countBy(
      recordsToSummarize,
      (record) => record.finalConsensusLabel,
    ),
    statusCounts: countBy(
      recordsToSummarize,
      (record) => record.finalConsensusStatus,
    ),
  });
}

function groupedConsensus(
  recordsToGroup: readonly FinalRecord[],
  key: (record: FinalRecord) => string,
) {
  return Object.freeze(
    [...new Set(recordsToGroup.map(key))].sort().map((value) =>
      Object.freeze({
        key: value,
        ...consensusSummary(
          recordsToGroup.filter((record) => key(record) === value),
        ),
      }),
    ),
  );
}

function usable(
  recordsToFilter: readonly FinalRecord[],
): readonly FinalRecord[] {
  return recordsToFilter.filter((record) =>
    ["larger", "smaller", "neutral"].includes(record.finalConsensusLabel),
  );
}

function policyEvaluation(recordsToEvaluate: readonly FinalRecord[]) {
  const decisions = recordsToEvaluate.filter(
    (record) => record.policyDecision === "recommend_larger",
  );
  const resolvedDecisions = decisions.filter((record) =>
    ["larger", "smaller", "neutral"].includes(record.finalConsensusLabel),
  );
  return Object.freeze({
    decisionCount: decisions.length,
    decisionCoveragePercentage:
      recordsToEvaluate.length === 0
        ? 0
        : (decisions.length / recordsToEvaluate.length) * 100,
    abstentionCount: recordsToEvaluate.length - decisions.length,
    abstentionPercentage:
      recordsToEvaluate.length === 0
        ? 0
        : ((recordsToEvaluate.length - decisions.length) /
            recordsToEvaluate.length) *
          100,
    decisionLabelCounts: countBy(
      decisions,
      (record) => record.finalConsensusLabel,
    ),
    correctLargerRecommendationCount: decisions.filter(
      (record) => record.finalConsensusLabel === "larger",
    ).length,
    correctRetainOrSmallerDecisionCount: 0,
    falseSmallCount: 0,
    falseLargeCount: decisions.filter(
      (record) =>
        record.finalConsensusLabel === "smaller" ||
        record.finalConsensusLabel === "neutral",
    ).length,
    visualRegressionRecommendationCount: decisions.filter(
      (record) => record.finalConsensusLabel === "smaller",
    ).length,
    ambiguousHumanDecisionCount: decisions.filter(
      (record) =>
        record.finalConsensusLabel === "ambiguous" ||
        record.finalConsensusLabel === "uncertain",
    ).length,
    resolvedRecommendationPrecision:
      resolvedDecisions.length === 0
        ? null
        : decisions.filter((record) => record.finalConsensusLabel === "larger")
            .length / resolvedDecisions.length,
  });
}

function featureDistributions(recordsToSummarize: readonly FinalRecord[]) {
  const featureNames = Object.keys(
    recordsToSummarize[0]?.features ?? {},
  ).sort();
  const labels: readonly ThreeReviewerConsensusLabel[] = [
    "larger",
    "smaller",
    "neutral",
    "ambiguous",
    "uncertain",
  ];
  return Object.freeze(
    labels.map((label) => {
      const group = recordsToSummarize.filter(
        (record) => record.finalConsensusLabel === label,
      );
      return Object.freeze({
        label,
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

interface A01Evidence {
  readonly productionHead: string;
}

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
  readonly locked: boolean;
  readonly responses: readonly ReviewerResponse[];
  readonly resultSha256: string;
}

interface C1Manifest {
  readonly packetSetSha256: string;
  readonly packets: readonly { readonly packetId: string }[];
}

interface C1Reveal {
  readonly packetSetSha256: string;
  readonly packets: readonly { readonly packetId: string }[];
}

interface AnalysisRecord {
  readonly packetId: string;
  readonly candidateId: string;
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
  readonly usableConsensus: "larger" | "smaller" | "neutral" | null;
  readonly features: Readonly<Record<string, number | null>> &
    Readonly<{
      weightedMeanDeltaE00Gain: number;
      additionalUsedColors: number;
    }>;
}

interface PrivateAnalysis {
  readonly packetSetSha256: string;
  readonly ambiguousPacketIds: readonly string[];
  readonly records: readonly AnalysisRecord[];
}

interface FinalRecord extends AnalysisRecord {
  readonly targetedForReviewer3: boolean;
  readonly reviewer3: Readonly<{
    choice: HumanReviewChoice;
    revealedDirection: RevealedDirection;
  }> | null;
  readonly finalConsensusStatus: string;
  readonly finalConsensusLabel: ThreeReviewerConsensusLabel;
  readonly policyDecision: A02C2PolicyDecision;
}
