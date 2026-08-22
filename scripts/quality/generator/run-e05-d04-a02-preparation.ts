/// <reference lib="dom" />

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import {
  D04_PROFILE_SIZES,
  evaluateSixProfilePatterns,
  type D04ProfileSize,
} from "./generator-quality-d04-recommendation.ts";
import {
  comparePatternStructure,
  measurePatternStructureWithTiming,
} from "./generator-quality-d04-structural.ts";
import {
  deterministicPairOrder,
  selectStratifiedReviewSample,
  type ModelReviewDirection,
} from "./generator-quality-d04-review-sampling.ts";
import { renderBlindReviewHtml } from "./generator-quality-d04-review-tool.ts";
import {
  assertExactEvidenceIdentity,
  verifyProductionBaselineLifecycle,
} from "./generator-quality-evidence-verifier.ts";
import { readGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import { renderPatternGridPng } from "./generator-quality-pattern-preview.ts";
import { decodeGeneratorQualityPng } from "./generator-quality-png.ts";
import {
  loadGeneratorQualityDependencies,
  prepareProductionQualityIntermediate,
} from "./generator-quality-replay.ts";
import { resolveExternalCorpus } from "./generator-quality-resolver.ts";
import { serializeCanonicalJson } from "./generator-quality-scorecard.ts";
import type {
  GeneratorQualityBackground,
  GeneratorQualityCaseDeclaration,
  GeneratorQualitySize,
} from "./generator-quality.types.ts";

const A01_CANONICAL_SHA =
  "1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89";
const EXPECTED_MANIFEST_SHA =
  "94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e";
const SOURCE_GIT_HEAD = "4566c73c30f5b700e580004c2d4a1580fd0eacef";
type MaximumColors = 16 | 32 | 64;
const repositoryRoot = process.cwd();
const permanentDirectory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-a02/1.0.0",
);
const outputDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a02",
);
const privateDirectory = path.join(outputDirectory, "private");
const a01Directory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-evidence/1.0.0",
);
const operation = process.argv[2];
if (operation !== "--write" && operation !== "--verify") {
  throw new Error("Expected --write or --verify.");
}

const a01EvidenceText = await readFile(
  path.join(a01Directory, "e05-d04-six-profile-pattern-evidence.json"),
  "utf8",
);
const a01Evidence = parseA01Evidence(a01EvidenceText);
verifyA01Identity(a01Evidence, a01EvidenceText);
verifyProductionBaselineLifecycle(repositoryRoot, a01Evidence.productionHead);

const manifestResult = await readGeneratorQualityManifest(
  path.join(
    repositoryRoot,
    "data-source/quality/generator-corpus/1.0.0/manifest.json",
  ),
);
if (
  manifestResult.sha256 !== EXPECTED_MANIFEST_SHA ||
  manifestResult.manifest.cases.length !== 24
) {
  throw new Error("Authoritative corpus identity differs.");
}
const corpusRoot = process.env.POPAROOZ_QUALITY_CORPUS_DIR;
if (corpusRoot === undefined || corpusRoot.trim() === "") {
  throw new Error("POPAROOZ_QUALITY_CORPUS_DIR is required.");
}
const resolved = await resolveExternalCorpus(
  manifestResult.manifest,
  corpusRoot,
);
if (resolved.length !== 29) throw new Error("Physical corpus count differs.");
const byLogicalId = new Map(resolved.map((item) => [item.logicalId, item]));
const dependencies = loadGeneratorQualityDependencies(repositoryRoot);
const matrix = buildSettingsMatrix(manifestResult.manifest.cases);
const modelReview = await readModelReviewDirections(a01Directory);
const a01Runs = new Map(a01Evidence.runs.map((run) => [run.id, run]));
const structuralRuns: StructuralRun[] = [];
const candidates: Candidate[] = [];
const patternsByCandidate = new Map<
  string,
  Readonly<{ smaller: PatternValue; larger: PatternValue }>
>();
const performanceRecords: Readonly<{
  runId: string;
  structuralMs: number;
  componentTraversalMs: number;
  boundaryAndLocalSwitchingMs: number;
  thinContinuityMs: number;
  aggregationMs: number;
}>[] = [];
let profileIdentityChecks = 0;

for (const settings of matrix) {
  const declaration = settings.declaration;
  const resolvedInput = byLogicalId.get(declaration.input.logicalId);
  if (resolvedInput === undefined) throw new Error("Corpus input is missing.");
  const source = decodeGeneratorQualityPng(
    resolvedInput.bytes,
    declaration.input,
  );
  const prepared = prepareProductionQualityIntermediate(
    source,
    settings.background,
    settings.patternSize,
    settings.maxColors,
    dependencies,
  );
  const evaluated = evaluateSixProfilePatterns(
    prepared.quantized,
    dependencies,
  );
  const runId = `${declaration.id}:${settings.background}:${settings.patternSize}:max-${settings.maxColors}`;
  const a01Run = a01Runs.get(runId);
  if (a01Run === undefined) throw new Error(`A01 run missing: ${runId}`);
  const started = performance.now();
  let componentTraversalMs = 0;
  let boundaryAndLocalSwitchingMs = 0;
  let thinContinuityMs = 0;
  let aggregationMs = 0;
  const profiles = D04_PROFILE_SIZES.map((profileSize) => {
    const pattern = evaluated.patterns.get(profileSize);
    const a01Profile = a01Run.profiles.find(
      (item) => item.profileSize === profileSize,
    );
    const regenerated = evaluated.profiles.find(
      (item) => item.profileSize === profileSize,
    );
    if (
      pattern === undefined ||
      a01Profile === undefined ||
      regenerated === undefined
    ) {
      throw new Error("Profile evidence is incomplete.");
    }
    if (regenerated.matrixSha256 !== a01Profile.matrixSha256) {
      throw new Error(`A01 matrix identity differs: ${runId}:${profileSize}`);
    }
    profileIdentityChecks += 1;
    const measured = measurePatternStructureWithTiming(pattern);
    componentTraversalMs += measured.timing.componentTraversalMs;
    boundaryAndLocalSwitchingMs += measured.timing.boundaryAndLocalSwitchingMs;
    thinContinuityMs += measured.timing.thinContinuityMs;
    aggregationMs += measured.timing.aggregationMs;
    return Object.freeze({ profileSize, metrics: measured.metrics });
  });
  performanceRecords.push(
    Object.freeze({
      runId,
      structuralMs: performance.now() - started,
      componentTraversalMs,
      boundaryAndLocalSwitchingMs,
      thinContinuityMs,
      aggregationMs,
    }),
  );
  const transitions = [];
  for (let index = 0; index < D04_PROFILE_SIZES.length - 1; index += 1) {
    const from = D04_PROFILE_SIZES[index]!;
    const to = D04_PROFILE_SIZES[index + 1]!;
    const smallerProfile = evaluated.profiles.find(
      (item) => item.profileSize === from,
    )!;
    const largerProfile = evaluated.profiles.find(
      (item) => item.profileSize === to,
    )!;
    const gain =
      smallerProfile.weightedMeanPaletteDeltaE00 -
      largerProfile.weightedMeanPaletteDeltaE00;
    const id = `${runId}:${from}->${to}`;
    const structural = comparePatternStructure(
      profiles[index]!.metrics,
      profiles[index + 1]!.metrics,
      gain,
    );
    const candidate = Object.freeze({
      id,
      runId,
      logicalCaseId: declaration.id,
      category: declaration.primaryCategory,
      tags: Object.freeze([...declaration.tags].sort()),
      split: a01Run.split,
      background: settings.background,
      patternSize: settings.patternSize,
      maxColors: settings.maxColors,
      fromProfileSize: from,
      toProfileSize: to,
      meanDeltaE00Gain: gain,
      modelReviewDirection: modelReview.get(id) ?? null,
      structural,
    });
    candidates.push(candidate);
    transitions.push(candidate);
    patternsByCandidate.set(
      id,
      Object.freeze({
        smaller: evaluated.patterns.get(from)!,
        larger: evaluated.patterns.get(to)!,
      }),
    );
  }
  structuralRuns.push(
    Object.freeze({
      runId,
      logicalCaseId: declaration.id,
      category: declaration.primaryCategory,
      tags: Object.freeze([...declaration.tags].sort()),
      split: a01Run.split,
      settings: Object.freeze({
        background: settings.background,
        patternSize: settings.patternSize,
        maxColors: settings.maxColors,
      }),
      profiles: Object.freeze(profiles),
      transitions: Object.freeze(transitions),
    }),
  );
}

if (
  matrix.length !== 102 ||
  structuralRuns.length !== 102 ||
  profileIdentityChecks !== 612 ||
  candidates.length !== 510
) {
  throw new Error("A02 structural coverage gate failed.");
}
const selected = selectStratifiedReviewSample(candidates, 60);
verifySample(selected, manifestResult.manifest.cases);
const packetRecords = selected.map((candidate, index) => {
  const patterns = patternsByCandidate.get(candidate.id);
  if (patterns === undefined)
    throw new Error("Selected Pattern pair is missing.");
  const reverse = deterministicPairOrder(candidate.id) === "reverse";
  const left = reverse ? patterns.larger : patterns.smaller;
  const right = reverse ? patterns.smaller : patterns.larger;
  const leftBytes = renderPatternGridPng([left], 1, 4, 0);
  const rightBytes = renderPatternGridPng([right], 1, 4, 0);
  const packetId = `a02-review-${String(index + 1).padStart(3, "0")}`;
  return Object.freeze({
    packetId,
    candidate,
    leftProfileSize: reverse
      ? candidate.toProfileSize
      : candidate.fromProfileSize,
    rightProfileSize: reverse
      ? candidate.fromProfileSize
      : candidate.toProfileSize,
    leftBytes,
    rightBytes,
    leftSha256: sha256(leftBytes),
    rightSha256: sha256(rightBytes),
  });
});
const anonymousPackets = packetRecords.map((packet) =>
  Object.freeze({
    packetId: packet.packetId,
    leftImageSha256: packet.leftSha256,
    rightImageSha256: packet.rightSha256,
  }),
);
const packetSetBase = Object.freeze({
  schemaVersion: "1.0.0",
  packetSetId: "poparooz-e05-d04-a02-blind-review-1.0.0",
  stage: "P3-A03-E05-D04-A02",
  reviewerCountRequired: 2,
  independentReviewRequired: true,
  packetCount: packetRecords.length,
  packets: Object.freeze(anonymousPackets),
});
const packetSetSha256 = sha256(serializeCanonicalJson(packetSetBase));
const packetManifest = Object.freeze({ ...packetSetBase, packetSetSha256 });
const revealKey = Object.freeze({
  warning:
    "Do not reveal until each independent reviewer has locked and exported a result.",
  packetSetId: packetSetBase.packetSetId,
  packetSetSha256,
  packets: Object.freeze(
    packetRecords.map((packet) =>
      Object.freeze({
        packetId: packet.packetId,
        candidateId: packet.candidate.id,
        runId: packet.candidate.runId,
        logicalCaseId: packet.candidate.logicalCaseId,
        category: packet.candidate.category,
        tags: packet.candidate.tags,
        split: packet.candidate.split,
        settings: Object.freeze({
          background: packet.candidate.background,
          patternSize: packet.candidate.patternSize,
          maxColors: packet.candidate.maxColors,
        }),
        transition: `${packet.candidate.fromProfileSize}->${packet.candidate.toProfileSize}`,
        leftProfileSize: packet.leftProfileSize,
        rightProfileSize: packet.rightProfileSize,
        leftImageSha256: packet.leftSha256,
        rightImageSha256: packet.rightSha256,
      }),
    ),
  ),
});
const structuralBase = Object.freeze({
  schemaVersion: "1.0.0",
  evidenceId: "poparooz-e05-d04-a02-structural-evidence",
  stage: "P3-A03-E05-D04-A02",
  phase: "A02-A-review-preparation",
  productionActivation: false,
  sourceGitHead: SOURCE_GIT_HEAD,
  productionHead: a01Evidence.productionHead,
  corpus: Object.freeze({
    manifestSha256: manifestResult.sha256,
    physicalInputCount: resolved.length,
    logicalCaseCount: manifestResult.manifest.cases.length,
    trustedPairCount: manifestResult.manifest.cases.filter(
      (item) => item.reference.type === "trusted-alpha-pair",
    ).length,
  }),
  a01: Object.freeze({
    canonicalEvidenceSha256: A01_CANONICAL_SHA,
    exactRegeneratedMatrixChecks: profileIdentityChecks,
  }),
  featureDefinitions: Object.freeze([
    "connected components per color and component-size distribution",
    "small-region occupied-cell percentage for components of four cells or fewer",
    "normalized color-boundary length over occupied cardinal adjacencies",
    "3x3 local distinct-color switches and high-switch cell percentage",
    "thin-cell same-color cardinal continuity",
    "dominant-color area, component count, and largest-component coverage",
    "mean DeltaE00 gain per additional used color",
  ]),
  coverage: Object.freeze({
    runs: structuralRuns.length,
    profileEvaluations: profileIdentityChecks,
    adjacentTransitions: candidates.length,
    reviewPackets: packetRecords.length,
  }),
  reviewSampling: Object.freeze({
    packetSetId: packetSetBase.packetSetId,
    packetSetSha256,
    modelLargerWorseIncluded: selected.filter(
      (item) => item.modelReviewDirection === "larger_worse",
    ).length,
    modelLargerBetterIncluded: selected.filter(
      (item) => item.modelReviewDirection === "larger_better",
    ).length,
    modelNotMeaningfulIncluded: selected.filter(
      (item) => item.modelReviewDirection === "not_meaningful",
    ).length,
    allLogicalCasesCovered: new Set(selected.map((item) => item.logicalCaseId))
      .size,
    splits: Object.freeze(
      [...new Set(selected.map((item) => item.split))].sort(),
    ),
    maximumColors: Object.freeze(
      [...new Set(selected.map((item) => item.maxColors))].sort(
        (left, right) => left - right,
      ),
    ),
  }),
  runs: Object.freeze(
    structuralRuns.sort((a, b) => a.runId.localeCompare(b.runId)),
  ),
});
const canonicalStructuralEvidenceSha256 = sha256(
  serializeCanonicalJson(structuralBase),
);
const structuralEvidence = Object.freeze({
  ...structuralBase,
  canonicalStructuralEvidenceSha256,
});
const html = renderBlindReviewHtml({
  packetSetId: packetSetBase.packetSetId,
  packetSetSha256,
  packets: packetRecords.map((packet) =>
    Object.freeze({
      packetId: packet.packetId,
      leftImageDataUrl: `data:image/png;base64,${packet.leftBytes.toString("base64")}`,
      rightImageDataUrl: `data:image/png;base64,${packet.rightBytes.toString("base64")}`,
    }),
  ),
});
const outputs = new Map<string, string>([
  [
    "e05-d04-a02-structural-evidence.json",
    serializeCanonicalJson(structuralEvidence),
  ],
  [
    "e05-d04-a02-review-packet-manifest.json",
    serializeCanonicalJson(packetManifest),
  ],
  ["poparooz-d04-a02-blind-review.html", html],
]);
await mkdir(permanentDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });
await mkdir(privateDirectory, { recursive: true });
for (const [fileName, content] of outputs) {
  const filePath = path.join(permanentDirectory, fileName);
  if (operation === "--write") await writeFile(filePath, content, "utf8");
  else {
    const checkedIn = await readFile(filePath, "utf8");
    assertExactEvidenceIdentity(checkedIn, content, fileName);
  }
}
const privateRevealKeyPath = path.join(
  privateDirectory,
  "e05-d04-a02-review-reveal-key.json",
);
const serializedRevealKey = serializeCanonicalJson(revealKey);
if (operation === "--write") {
  await writeFile(privateRevealKeyPath, serializedRevealKey, "utf8");
} else {
  const privateRevealKey = await readFile(privateRevealKeyPath, "utf8");
  assertExactEvidenceIdentity(
    privateRevealKey,
    serializedRevealKey,
    "Local private A02 reveal key",
  );
}
await writeFile(
  path.join(outputDirectory, "runtime-performance.json"),
  serializeCanonicalJson({
    scope:
      "Node-only offline structural evaluation timing; excluded from canonical evidence",
    records: performanceRecords,
  }),
  "utf8",
);
process.stdout.write(
  [
    `Runs: ${structuralRuns.length}`,
    `Profile identities: ${profileIdentityChecks}/612`,
    `Structural transitions: ${candidates.length}`,
    `Blind review packets: ${packetRecords.length}`,
    `A01 canonical SHA-256: ${A01_CANONICAL_SHA}`,
    `A02 structural canonical SHA-256: ${canonicalStructuralEvidenceSha256}`,
    `Packet set SHA-256: ${packetSetSha256}`,
  ].join("\n") + "\n",
);

type PatternValue = NonNullable<
  ReturnType<typeof evaluateSixProfilePatterns>["patterns"] extends ReadonlyMap<
    D04ProfileSize,
    infer Value
  >
    ? Value
    : never
>;

interface MatrixItem {
  readonly declaration: GeneratorQualityCaseDeclaration;
  readonly background: GeneratorQualityBackground;
  readonly patternSize: GeneratorQualitySize;
  readonly maxColors: MaximumColors;
}

interface A01Profile {
  readonly profileSize: D04ProfileSize;
  readonly matrixSha256: string;
}

interface A01Run {
  readonly id: string;
  readonly split: "calibration" | "validation";
  readonly profiles: readonly A01Profile[];
}

interface A01Evidence {
  readonly productionHead: string;
  readonly runs: readonly A01Run[];
  readonly canonicalEvidenceSha256: string;
  readonly [key: string]: unknown;
}

interface Candidate {
  readonly id: string;
  readonly runId: string;
  readonly logicalCaseId: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly split: "calibration" | "validation";
  readonly background: GeneratorQualityBackground;
  readonly patternSize: number;
  readonly maxColors: number;
  readonly fromProfileSize: D04ProfileSize;
  readonly toProfileSize: D04ProfileSize;
  readonly meanDeltaE00Gain: number;
  readonly modelReviewDirection: ModelReviewDirection | null;
  readonly structural: ReturnType<typeof comparePatternStructure>;
}

interface StructuralRun {
  readonly runId: string;
  readonly logicalCaseId: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly split: "calibration" | "validation";
  readonly settings: Readonly<{
    background: GeneratorQualityBackground;
    patternSize: GeneratorQualitySize;
    maxColors: number;
  }>;
  readonly profiles: readonly Readonly<{
    profileSize: D04ProfileSize;
    metrics: ReturnType<typeof measurePatternStructureWithTiming>["metrics"];
  }>[];
  readonly transitions: readonly Candidate[];
}

function buildSettingsMatrix(
  declarations: readonly GeneratorQualityCaseDeclaration[],
): readonly MatrixItem[] {
  const result: MatrixItem[] = [];
  for (const declaration of [...declarations].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    for (const background of declaration.supportedBackgrounds) {
      for (const patternSize of declaration.supportedPatternSizes) {
        result.push({ declaration, background, patternSize, maxColors: 32 });
      }
      const patternSize = Math.max(
        ...declaration.supportedPatternSizes,
      ) as GeneratorQualitySize;
      result.push({ declaration, background, patternSize, maxColors: 16 });
      result.push({ declaration, background, patternSize, maxColors: 64 });
    }
  }
  return Object.freeze(
    result.sort(
      (a, b) =>
        a.declaration.id.localeCompare(b.declaration.id) ||
        a.background.localeCompare(b.background) ||
        a.patternSize - b.patternSize ||
        a.maxColors - b.maxColors,
    ),
  );
}

function parseA01Evidence(text: string): A01Evidence {
  const value: unknown = JSON.parse(text);
  if (typeof value !== "object" || value === null || !("runs" in value)) {
    throw new Error("A01 evidence schema is invalid.");
  }
  return value as A01Evidence;
}

function verifyA01Identity(evidence: A01Evidence, text: string): void {
  if (evidence.canonicalEvidenceSha256 !== A01_CANONICAL_SHA) {
    throw new Error("A01 canonical SHA field differs.");
  }
  const parsed = JSON.parse(text) as Record<string, unknown>;
  delete parsed.canonicalEvidenceSha256;
  if (sha256(serializeCanonicalJson(parsed)) !== A01_CANONICAL_SHA) {
    throw new Error("A01 canonical evidence content differs.");
  }
  if (evidence.runs.length !== 102) throw new Error("A01 run count differs.");
}

async function readModelReviewDirections(
  directory: string,
): Promise<ReadonlyMap<string, ModelReviewDirection>> {
  const review = JSON.parse(
    await readFile(
      path.join(directory, "e05-d04-controlled-visual-review.json"),
      "utf8",
    ),
  ) as {
    readonly packets: readonly { packetId: string; rows: readonly string[] }[];
  };
  const key = JSON.parse(
    await readFile(
      path.join(directory, "e05-d04-blind-review-key.json"),
      "utf8",
    ),
  ) as {
    readonly packets: readonly {
      packetId: string;
      runId: string;
      rows: readonly {
        transition: string;
        leftProfile: number;
        rightProfile: number;
      }[];
    }[];
  };
  const judgments = new Map(
    review.packets.map((packet) => [packet.packetId, packet.rows]),
  );
  const directions = new Map<string, ModelReviewDirection>();
  for (const packet of key.packets) {
    const rows = judgments.get(packet.packetId);
    if (rows === undefined || rows.length !== packet.rows.length) {
      throw new Error("A01 controlled review identity differs.");
    }
    packet.rows.forEach((row, index) => {
      const judgment = rows[index]!;
      let direction: ModelReviewDirection = "not_meaningful";
      if (judgment === "left_meaningfully_better") {
        direction =
          row.leftProfile > row.rightProfile ? "larger_better" : "larger_worse";
      } else if (judgment === "right_meaningfully_better") {
        direction =
          row.rightProfile > row.leftProfile ? "larger_better" : "larger_worse";
      }
      directions.set(`${packet.runId}:${row.transition}`, direction);
    });
  }
  return directions;
}

function verifySample(
  sample: readonly Candidate[],
  declarations: readonly GeneratorQualityCaseDeclaration[],
): void {
  const requiredCases = new Set(declarations.map((item) => item.id));
  const sampledCases = new Set(sample.map((item) => item.logicalCaseId));
  const maximumColors = new Set(sample.map((item) => item.maxColors));
  const patternSizes = new Set(sample.map((item) => item.patternSize));
  const splits = new Set(sample.map((item) => item.split));
  const allModelRegressions = candidates.filter(
    (item) => item.modelReviewDirection === "larger_worse",
  );
  if (
    sample.length !== 60 ||
    [...requiredCases].some((id) => !sampledCases.has(id)) ||
    ![16, 32, 64].every((value) => maximumColors.has(value)) ||
    ![40, 60, 80, 104].every((value) => patternSizes.has(value)) ||
    !splits.has("calibration") ||
    !splits.has("validation") ||
    allModelRegressions.some(
      (candidate) => !sample.some((item) => item.id === candidate.id),
    )
  ) {
    throw new Error("Blind review stratification gate failed.");
  }
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
