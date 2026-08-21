import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { format } from "prettier";

import {
  createE05ProductionEvidence,
  createE05ProductionEvidenceSummary,
  createE05ProductionRunEvidence,
  serializeE05ProductionEvidence,
  type E05ProductionRunEvidence,
} from "./generator-quality-e05-evidence.ts";
import { readGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import { decodeGeneratorQualityPng } from "./generator-quality-png.ts";
import {
  loadGeneratorQualityDependencies,
  replayExternalQualityCase,
} from "./generator-quality-replay.ts";
import { resolveExternalCorpus } from "./generator-quality-resolver.ts";
import { serializeCanonicalJson } from "./generator-quality-scorecard.ts";
import type {
  GeneratorQualityCaseResult,
  GeneratorQualityScorecard,
} from "./generator-quality.types.ts";

const repositoryRoot = process.cwd();
const options = parseArguments(process.argv.slice(2));
const actualHead = gitHead();
if (actualHead !== options.productionHead) {
  throw new Error(
    "Production HEAD does not match the authorized evidence baseline.",
  );
}

const manifestPath = path.join(
  repositoryRoot,
  "data-source/quality/generator-corpus/1.0.0/manifest.json",
);
const manifestResult = await readGeneratorQualityManifest(manifestPath);
if (
  manifestResult.manifest.corpusStatus !== "complete" ||
  manifestResult.manifest.corpusVersion !== "1.0.0"
) {
  throw new Error("Authoritative corpus manifest identity is invalid.");
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
const frozenScorecard = await readFrozenScorecard();
const frozenById = new Map(
  frozenScorecard.cases.map((item) => [item.id, item]),
);
const runs: E05ProductionRunEvidence[] = [];

for (const declaration of [...manifestResult.manifest.cases].sort(
  (left, right) => left.id.localeCompare(right.id),
)) {
  if (declaration.sourceKind !== "external-curated") {
    throw new Error("Authoritative E05 evidence contains a non-external case.");
  }
  const input = byLogicalId.get(declaration.input.logicalId);
  if (input === undefined) throw new Error("Resolved source input is missing.");
  const source = decodeGeneratorQualityPng(input.bytes, declaration.input);
  const reference =
    declaration.reference.type === "trusted-alpha-pair"
      ? decodeGeneratorQualityPng(
          byLogicalId.get(declaration.reference.input.logicalId)?.bytes ??
            missingReference(),
          declaration.reference.input,
        )
      : undefined;
  for (const background of declaration.supportedBackgrounds) {
    for (const size of declaration.supportedPatternSizes) {
      const replay = replayExternalQualityCase(
        declaration,
        source,
        reference,
        background,
        size,
        dependencies,
      );
      const frozen = frozenById.get(replay.result.id);
      if (frozen === undefined) {
        throw new Error(`Frozen baseline run is missing: ${replay.result.id}.`);
      }
      assertFrozenOverlap(frozen, replay.result);
      frozenById.delete(replay.result.id);
      runs.push(
        createE05ProductionRunEvidence({
          declaration,
          replay: replay.result,
          pattern: replay.artifacts.pattern,
          palette: dependencies.palette,
          colorSets: dependencies.colorSets,
        }),
      );
    }
  }
}

if (frozenById.size !== 0) {
  throw new Error("Frozen baseline contains unmatched production runs.");
}
const trustedPairCount = manifestResult.manifest.cases.filter(
  (item) => item.reference.type === "trusted-alpha-pair",
).length;
const evidence = createE05ProductionEvidence({
  productionIdentity: Object.freeze({
    gitCommit: actualHead,
    pipeline: "production-baseline",
    sampling: "area-average",
    backgroundRemoval: "Background Removal v1 — Conservative",
    processingPolicy: Object.freeze({
      id: dependencies.processingPolicy.policyId,
      version: dependencies.processingPolicy.policyVersion,
    }),
    runtimePaletteArtifactSha256: await hashFile(
      "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
    ),
    runtimePaletteLockSha256: await hashFile(
      "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.lock.json",
    ),
    colorSetArtifactSha256: await hashFile(
      "src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
    ),
    colorSetLockSha256: await hashFile(
      "data-source/runtime-locks/poparooz-fixed-color-sets/1.0.0/color-set-profiles.lock.json",
    ),
    boardProfile: Object.freeze({
      id: dependencies.boardProfile.id,
      version: dependencies.boardProfile.version,
      artifactSha256: await hashFile(
        "src/runtime/board-profile/artifacts/poparooz-board-104/1.0.0/board-profile.json",
      ),
    }),
  }),
  corpusIdentity: Object.freeze({
    version: manifestResult.manifest.corpusVersion,
    manifestSha256: manifestResult.sha256,
    logicalCaseCount: manifestResult.manifest.cases.length,
    physicalInputCount: resolved.length,
    trustedPairCount,
    runCount: frozenScorecard.cases.length,
  }),
  colorSets: dependencies.colorSets,
  frozenBaselineCanonicalSha256: frozenScorecard.canonicalScorecardSha256,
  runs,
});

const outputDirectory = path.resolve(repositoryRoot, options.output);
await assertOutputDoesNotExist(outputDirectory);
await mkdir(outputDirectory, { recursive: true });
const evidenceBytes = serializeE05ProductionEvidence(evidence);
const summaryBytes = await format(
  createE05ProductionEvidenceSummary(evidence),
  {
    parser: "markdown",
  },
);
await writeFile(
  path.join(outputDirectory, "e05-production-evidence.json"),
  evidenceBytes,
  "utf8",
);
await writeFile(
  path.join(outputDirectory, "e05-production-evidence-summary.md"),
  summaryBytes,
  "utf8",
);

console.log(`Stage: ${evidence.stage}`);
console.log(`Production HEAD: ${actualHead}`);
console.log(`Physical inputs: ${resolved.length}`);
console.log(`Logical cases: ${manifestResult.manifest.cases.length}`);
console.log(`Trusted pairs: ${trustedPairCount}`);
console.log(`Production runs: ${runs.length}`);
console.log(
  `Hard gates: ${evidence.hardGateSummary.passed} passed / ${evidence.hardGateSummary.failed} failed`,
);
console.log(`Canonical evidence SHA-256: ${evidence.canonicalEvidenceSha256}`);
console.log(`Output: ${path.relative(repositoryRoot, outputDirectory)}`);

interface CliOptions {
  readonly productionHead: string;
  readonly output: string;
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  let productionHead: string | undefined;
  let output = "data-source/quality/generator-e05-evidence/1.0.0";
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const value = arguments_[index + 1];
    if (argument === "--production-head" && value !== undefined) {
      productionHead = value;
      index += 1;
    } else if (argument === "--output" && value !== undefined) {
      output = value;
      index += 1;
    } else {
      throw new Error("E05 production evidence CLI arguments are invalid.");
    }
  }
  if (productionHead === undefined || !/^[0-9a-f]{40}$/.test(productionHead)) {
    throw new Error("An exact --production-head SHA is required.");
  }
  return { productionHead, output };
}

function assertFrozenOverlap(
  frozen: GeneratorQualityCaseResult,
  actual: GeneratorQualityCaseResult,
): void {
  const select = (item: GeneratorQualityCaseResult) =>
    Object.freeze({
      id: item.id,
      category: item.category,
      tags: item.tags,
      sourceKind: item.sourceKind,
      referenceType: item.referenceType,
      settings: item.settings,
      metrics: item.metrics,
      hardGates: item.hardGates,
      diagnostics: Object.freeze({
        normalizedDrawWidth: item.diagnostics.normalizedDrawWidth,
        normalizedDrawHeight: item.diagnostics.normalizedDrawHeight,
        quantizedColorCount: item.diagnostics.quantizedColorCount,
      }),
    });
  if (
    serializeCanonicalJson(select(frozen)) !==
    serializeCanonicalJson(select(actual))
  ) {
    throw new Error(`Frozen baseline overlap changed: ${actual.id}.`);
  }
}

async function readFrozenScorecard(): Promise<GeneratorQualityScorecard> {
  const bytes = await readFile(
    path.join(
      repositoryRoot,
      "data-source/quality/generator-baselines/1.0.0/generator-quality-scorecard.json",
    ),
    "utf8",
  );
  const parsed = JSON.parse(bytes) as GeneratorQualityScorecard;
  if (
    parsed.schemaVersion !== "1.0.0" ||
    parsed.baselineIdentity.baselineVersion !== "1.0.0" ||
    parsed.authoritativeBaseline !== true ||
    parsed.cases.length !== 54 ||
    parsed.canonicalScorecardSha256 !==
      "925161a4d6298f03d4007089ce8bb2bbca261fc1cdd0a3a8cef21942ad0b6982"
  ) {
    throw new Error("Frozen generator scorecard identity is invalid.");
  }
  return parsed;
}

async function hashFile(relativePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(path.join(repositoryRoot, relativePath)))
    .digest("hex");
}

async function assertOutputDoesNotExist(
  outputDirectory: string,
): Promise<void> {
  try {
    await access(outputDirectory);
  } catch {
    return;
  }
  throw new Error("E05 evidence output directory already exists.");
}

function gitHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function missingReference(): never {
  throw new Error("Resolved trusted reference is missing.");
}
