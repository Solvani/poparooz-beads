/// <reference lib="dom" />

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { createGenerationService } from "../../../src/features/generator/generation-service.ts";
import { assemblePattern } from "../../../src/domain/pattern/pattern-assembler.ts";
import { toPublicPatternResult } from "../../../src/domain/pattern/public-pattern.mapper.ts";
import { quantizeImage } from "../../../src/domain/quantization/quantize-image.ts";
import type { PublishedColorSetProfileId } from "../../../src/runtime/color-set/color-set.types.ts";
import {
  calibrationSplit,
  D04_PROFILE_SIZES,
  evaluateSixProfilePatterns,
  patternsExactlyEquivalent,
  type D04ProfileSize,
} from "./generator-quality-d04-recommendation.ts";
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

const AUTHORIZED_HEAD = "9b411803afb26d618abe94f411b1bb342099fb14";
const EXPECTED_MANIFEST_SHA =
  "94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e";
const MAXIMUM_COLORS = Object.freeze([16, 32, 64] as const);
const CRITICAL_CASES = new Set([
  "poparooz-logo-pair",
  "flat-dinosaur-illustration",
  "green-leaf-graphic",
  "thin-botanical-line-art",
  "pink-floral-illustration",
  "golden-retriever-pair",
  "pale-teddy-bear-pair",
  "portrait-sweater-pair",
  "saturated-lake-landscape",
  "white-pump-bottle-pair",
  "dark-watch-product",
  "white-sneaker-product",
]);
const SENSITIVITY_REVIEW_CASES = new Set([
  "poparooz-logo-pair",
  "thin-botanical-line-art",
  "golden-retriever-pair",
  "portrait-sweater-pair",
  "saturated-lake-landscape",
  "white-pump-bottle-pair",
]);

const repositoryRoot = process.cwd();
const outputDirectory = path.join(
  repositoryRoot,
  ".quality-output/e05-d04-a01",
);
const visualDirectory = path.join(outputDirectory, "six-profile-visuals");
const blindDirectory = path.join(outputDirectory, "blind-review");
const permanentDirectory = path.join(
  repositoryRoot,
  "data-source/quality/generator-e05-d04-evidence/1.0.0",
);
const permanentEvidencePath = path.join(
  permanentDirectory,
  "e05-d04-six-profile-pattern-evidence.json",
);
const permanentBlindReviewKeyPath = path.join(
  permanentDirectory,
  "e05-d04-blind-review-key.json",
);
const operation = process.argv[2];
if (operation !== "--write" && operation !== "--verify") {
  throw new Error("Expected --write or --verify.");
}
if (gitHead() !== AUTHORIZED_HEAD) {
  throw new Error("D04-A01 production baseline differs from authorization.");
}

const manifestResult = await readGeneratorQualityManifest(
  path.join(
    repositoryRoot,
    "data-source/quality/generator-corpus/1.0.0/manifest.json",
  ),
);
if (
  manifestResult.sha256 !== EXPECTED_MANIFEST_SHA ||
  manifestResult.manifest.corpusVersion !== "1.0.0" ||
  manifestResult.manifest.corpusStatus !== "complete"
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
const byLogicalId = new Map(resolved.map((item) => [item.logicalId, item]));
const dependencies = loadGeneratorQualityDependencies(repositoryRoot);
const matrix = buildSettingsMatrix(manifestResult.manifest.cases);
const runs: EvaluationRun[] = [];
const performanceRecords: PerformanceRecord[] = [];
const visuals: VisualRecord[] = [];
const blindPackets: BlindPacket["record"][] = [];
let parityChecks = 0;
let parityFailures = 0;
let preparationCount = 0;

await mkdir(visualDirectory, { recursive: true });
await mkdir(blindDirectory, { recursive: true });

for (const settings of matrix) {
  const declaration = settings.declaration;
  const source = decodeInput(declaration.input.logicalId, declaration.input);
  const prepared = prepareProductionQualityIntermediate(
    source,
    settings.background,
    settings.patternSize,
    settings.maxColors,
    dependencies,
  );
  preparationCount += 1;
  const evaluationStarted = performance.now();
  const evaluated = evaluateSixProfilePatterns(
    prepared.quantized,
    dependencies,
  );
  const sixProfileEvaluationMs = performance.now() - evaluationStarted;
  const runId = `${declaration.id}:${settings.background}:${settings.patternSize}:max-${settings.maxColors}`;
  const parity = [];
  for (const profileSize of D04_PROFILE_SIZES) {
    const oracle = await productionOracle(
      prepared.normalized,
      settings.background,
      settings.patternSize,
      settings.maxColors,
      profileSize,
    );
    const reconstructed = evaluated.patterns.get(profileSize);
    if (reconstructed === undefined)
      throw new Error("Profile Pattern missing.");
    const passed = patternsExactlyEquivalent(oracle, reconstructed);
    parityChecks += 1;
    if (!passed) parityFailures += 1;
    parity.push(Object.freeze({ profileSize, passed }));
  }
  runs.push(
    Object.freeze({
      id: runId,
      logicalCaseId: declaration.id,
      category: declaration.primaryCategory,
      tags: Object.freeze([...declaration.tags].sort()),
      split: calibrationSplit(declaration.id),
      settings: Object.freeze({
        background: settings.background,
        patternSize: settings.patternSize,
        maxColors: settings.maxColors,
      }),
      quantizedRepresentativeCount: prepared.quantized.colors.length,
      profiles: evaluated.profiles,
      adjacentComparisons: evaluated.adjacentComparisons,
      relativeTo221: evaluated.relativeTo221,
      parity: Object.freeze(parity),
    }),
  );
  performanceRecords.push(
    Object.freeze({
      runId,
      heavyPathMs: prepared.performance.totalMs,
      sourcePreprocessingMs: prepared.performance.sourcePreprocessingMs,
      normalizationAndResizeMs: prepared.performance.normalizationAndResizeMs,
      postResizeCleanupMs: prepared.performance.postResizeCleanupMs,
      occupancyMs: prepared.performance.occupancyMs,
      quantizationMs: prepared.performance.quantizationMs,
      sixProfileEvaluationMs,
      integratedTotalMs: prepared.performance.totalMs + sixProfileEvaluationMs,
    }),
  );
  if (isVisualSettings(settings)) {
    const orderedPatterns = D04_PROFILE_SIZES.map((size) => {
      const pattern = evaluated.patterns.get(size);
      if (pattern === undefined) throw new Error("Visual Pattern missing.");
      return pattern;
    });
    const fileName = `${declaration.id}-${settings.background}-${settings.patternSize}-max-${settings.maxColors}.png`;
    const bytes = renderPatternGridPng(orderedPatterns, 3);
    await writeFile(path.join(visualDirectory, fileName), bytes);
    visuals.push(
      Object.freeze({
        runId,
        fileName,
        sha256: sha256(bytes),
        panelOrder: D04_PROFILE_SIZES,
      }),
    );
  }
  if (CRITICAL_CASES.has(declaration.id) && isVisualSettings(settings)) {
    const packetNumber = blindPackets.length + 1;
    const packet = createBlindPacket(packetNumber, runId, evaluated.patterns);
    await writeFile(path.join(blindDirectory, packet.fileName), packet.bytes);
    blindPackets.push(packet.record);
  }
}

if (
  preparationCount !== 102 ||
  runs.length !== 102 ||
  parityChecks !== 612 ||
  parityFailures !== 0
) {
  throw new Error("D04-A01 coverage or parity gate failed.");
}
runs.sort((left, right) => left.id.localeCompare(right.id));
visuals.sort((left, right) => left.fileName.localeCompare(right.fileName));
blindPackets.sort((left, right) => left.packetId.localeCompare(right.packetId));
const baseEvidence = Object.freeze({
  schemaVersion: "1.0.0",
  evidenceId: "poparooz-e05-d04-six-profile-pattern-evidence",
  evidenceVersion: "1.0.0",
  stage: "P3-A03-E05-D04-A01",
  productionActivation: false,
  productionHead: AUTHORIZED_HEAD,
  corpus: Object.freeze({
    version: manifestResult.manifest.corpusVersion,
    manifestSha256: manifestResult.sha256,
    physicalInputCount: resolved.length,
    logicalCaseCount: manifestResult.manifest.cases.length,
    trustedPairCount: manifestResult.manifest.cases.filter(
      (item) => item.reference.type === "trusted-alpha-pair",
    ).length,
  }),
  identities: Object.freeze({
    paletteArtifactSha256: hashFile(
      "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
    ),
    colorSetArtifactSha256: hashFile(
      "src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
    ),
    boardProfileArtifactSha256: hashFile(
      "src/runtime/board-profile/artifacts/poparooz-board-104/1.0.0/board-profile.json",
    ),
    processingPolicyId: dependencies.processingPolicy.policyId,
    processingPolicyVersion: dependencies.processingPolicy.policyVersion,
    evaluatorVersion: "1.0.0",
  }),
  settingsMatrix: Object.freeze({
    maximumColors: MAXIMUM_COLORS,
    default32RunCount: matrix.filter((item) => item.maxColors === 32).length,
    lower16RunCount: matrix.filter((item) => item.maxColors === 16).length,
    upper64RunCount: matrix.filter((item) => item.maxColors === 64).length,
    totalRunCount: matrix.length,
    profileEvaluations: matrix.length * D04_PROFILE_SIZES.length,
  }),
  split: Object.freeze({
    algorithm: "sha256(stage-prefix-plus-case-id)-first-byte-mod-5-less-than-2",
    calibrationCaseIds: caseIds(runs, "calibration"),
    validationCaseIds: caseIds(runs, "validation"),
  }),
  hardGates: Object.freeze({
    singlePreparationPerRun: preparationCount === runs.length,
    exactSixProfiles: runs.every((run) => run.profiles.length === 6),
    productionOracleParity: parityFailures === 0,
    parityChecks,
    corpusIntegrity:
      resolved.length === 29 && manifestResult.manifest.cases.length === 24,
    productionActivation: false,
  }),
  visualArtifacts: Object.freeze(visuals),
  blindReviewPackets: Object.freeze(blindPackets),
  runs: Object.freeze(runs),
});
const canonicalEvidenceSha256 = sha256(serializeCanonicalJson(baseEvidence));
const evidence = Object.freeze({ ...baseEvidence, canonicalEvidenceSha256 });
const serialized = serializeCanonicalJson(evidence);
const serializedBlindReviewKey = serializeCanonicalJson({
  warning: "Reveal only after blind judgments are recorded.",
  packets: blindPackets,
});

if (operation === "--write") {
  await mkdir(permanentDirectory, { recursive: true });
  await writeFile(permanentEvidencePath, serialized, "utf8");
  await writeFile(
    permanentBlindReviewKeyPath,
    serializedBlindReviewKey,
    "utf8",
  );
} else {
  const checkedIn = await readFile(permanentEvidencePath, "utf8");
  if (checkedIn !== serialized) {
    throw new Error("Checked-in D04-A01 evidence is not deterministic.");
  }
  const checkedInBlindReviewKey = await readFile(
    permanentBlindReviewKeyPath,
    "utf8",
  );
  if (checkedInBlindReviewKey !== serializedBlindReviewKey) {
    throw new Error(
      "Checked-in D04-A01 blind-review key is not deterministic.",
    );
  }
}
await writeFile(
  path.join(outputDirectory, "runtime-node-performance.json"),
  serializeCanonicalJson({
    scope: "Node offline replay; not browser evidence",
    records: performanceRecords,
  }),
  "utf8",
);
await writeFile(
  path.join(blindDirectory, "review-key.json"),
  serializedBlindReviewKey,
  "utf8",
);
process.stdout.write(
  [
    `Runs: ${runs.length}`,
    `Profile evaluations: ${runs.length * D04_PROFILE_SIZES.length}`,
    `Parity: ${parityChecks - parityFailures}/${parityChecks}`,
    `Visual artifacts: ${visuals.length}`,
    `Blind review packets: ${blindPackets.length}`,
    `Canonical SHA-256: ${canonicalEvidenceSha256}`,
  ].join("\n") + "\n",
);

interface MatrixItem {
  readonly declaration: GeneratorQualityCaseDeclaration;
  readonly background: GeneratorQualityBackground;
  readonly patternSize: GeneratorQualitySize;
  readonly maxColors: (typeof MAXIMUM_COLORS)[number];
}

interface EvaluationRun {
  readonly id: string;
  readonly logicalCaseId: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly split: "calibration" | "validation";
  readonly settings: Readonly<{
    background: GeneratorQualityBackground;
    patternSize: GeneratorQualitySize;
    maxColors: number;
  }>;
  readonly quantizedRepresentativeCount: number;
  readonly profiles: ReturnType<typeof evaluateSixProfilePatterns>["profiles"];
  readonly adjacentComparisons: ReturnType<
    typeof evaluateSixProfilePatterns
  >["adjacentComparisons"];
  readonly relativeTo221: ReturnType<
    typeof evaluateSixProfilePatterns
  >["relativeTo221"];
  readonly parity: readonly Readonly<{
    profileSize: D04ProfileSize;
    passed: boolean;
  }>[];
}

interface PerformanceRecord {
  readonly runId: string;
  readonly heavyPathMs: number;
  readonly sourcePreprocessingMs: number;
  readonly normalizationAndResizeMs: number;
  readonly postResizeCleanupMs: number;
  readonly occupancyMs: number;
  readonly quantizationMs: number;
  readonly sixProfileEvaluationMs: number;
  readonly integratedTotalMs: number;
}

interface VisualRecord {
  readonly runId: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly panelOrder: typeof D04_PROFILE_SIZES;
}

interface BlindPacket {
  readonly record: Readonly<{
    packetId: string;
    runId: string;
    fileName: string;
    sha256: string;
    rows: readonly Readonly<{
      transition: string;
      leftProfile: D04ProfileSize;
      rightProfile: D04ProfileSize;
    }>[];
  }>;
  readonly fileName: string;
  readonly bytes: Buffer;
}

function buildSettingsMatrix(
  declarations: readonly GeneratorQualityCaseDeclaration[],
): readonly MatrixItem[] {
  const result: MatrixItem[] = [];
  for (const declaration of [...declarations].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    for (const background of declaration.supportedBackgrounds) {
      for (const patternSize of declaration.supportedPatternSizes) {
        result.push({ declaration, background, patternSize, maxColors: 32 });
      }
      const patternSize = maximumSize(declaration);
      result.push({ declaration, background, patternSize, maxColors: 16 });
      result.push({ declaration, background, patternSize, maxColors: 64 });
    }
  }
  return Object.freeze(
    result.sort(
      (left, right) =>
        left.declaration.id.localeCompare(right.declaration.id) ||
        left.background.localeCompare(right.background) ||
        left.patternSize - right.patternSize ||
        left.maxColors - right.maxColors,
    ),
  );
}

async function productionOracle(
  normalized: ReturnType<
    typeof prepareProductionQualityIntermediate
  >["normalized"],
  background: GeneratorQualityBackground,
  patternSize: GeneratorQualitySize,
  maxColors: number,
  profileSize: D04ProfileSize,
) {
  const service = createGenerationService(
    {
      ...dependencies,
      createWorkerClient: () => ({
        quantize: async (image, options) => quantizeImage(image, options),
        dispose: () => undefined,
      }),
    },
    {
      decode: async () => normalized,
      assemble: assemblePattern,
      toPublic: toPublicPatternResult,
    },
  );
  const profileId = `poparooz-set-${profileSize}` as PublishedColorSetProfileId;
  return service.generate(
    {
      file: new File(["evaluation"], "evaluation.png", { type: "image/png" }),
      imageVersion: 1,
      settings: {
        width: patternSize,
        height: patternSize,
        maxColors,
        background,
        selectedColorSetProfileId: profileId,
      },
      inputKey: `evaluation:${patternSize}:${maxColors}:${background}:${profileId}`,
      jobId: 1,
    },
    new AbortController().signal,
  );
}

function createBlindPacket(
  packetNumber: number,
  runId: string,
  patterns: ReadonlyMap<
    D04ProfileSize,
    ReturnType<typeof toPublicPatternResult>
  >,
): BlindPacket {
  const packetId = `review-${String(packetNumber).padStart(3, "0")}`;
  const arranged = [];
  const rows = [];
  for (let index = 0; index < D04_PROFILE_SIZES.length - 1; index += 1) {
    const smaller = D04_PROFILE_SIZES[index]!;
    const larger = D04_PROFILE_SIZES[index + 1]!;
    const reverse =
      createHash("sha256").update(`${packetId}:${index}`).digest()[0]! % 2 ===
      1;
    const leftProfile = reverse ? larger : smaller;
    const rightProfile = reverse ? smaller : larger;
    const left = patterns.get(leftProfile);
    const right = patterns.get(rightProfile);
    if (left === undefined || right === undefined)
      throw new Error("Blind review Pattern is missing.");
    arranged.push(left, right);
    rows.push(
      Object.freeze({
        transition: `${smaller}->${larger}`,
        leftProfile,
        rightProfile,
      }),
    );
  }
  const bytes = renderPatternGridPng(arranged, 2);
  const fileName = `${packetId}.png`;
  return Object.freeze({
    fileName,
    bytes,
    record: Object.freeze({
      packetId,
      runId,
      fileName,
      sha256: sha256(bytes),
      rows: Object.freeze(rows),
    }),
  });
}

function decodeInput(
  logicalId: string,
  declaration: GeneratorQualityCaseDeclaration["input"],
) {
  const resolvedInput = byLogicalId.get(logicalId);
  if (resolvedInput === undefined) throw new Error("Corpus input is missing.");
  return decodeGeneratorQualityPng(resolvedInput.bytes, declaration);
}

function maximumSize(
  declaration: GeneratorQualityCaseDeclaration,
): GeneratorQualitySize {
  return Math.max(...declaration.supportedPatternSizes) as GeneratorQualitySize;
}

function isVisualSettings(settings: MatrixItem): boolean {
  return (
    settings.patternSize === maximumSize(settings.declaration) &&
    (settings.maxColors === 32 ||
      SENSITIVITY_REVIEW_CASES.has(settings.declaration.id))
  );
}

function caseIds(
  runs: readonly EvaluationRun[],
  split: EvaluationRun["split"],
): readonly string[] {
  return Object.freeze(
    [
      ...new Set(
        runs
          .filter((run) => run.split === split)
          .map((run) => run.logicalCaseId),
      ),
    ].sort(),
  );
}

function hashFile(relativePath: string): string {
  return sha256(readFileSync(path.join(repositoryRoot, relativePath)));
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}
