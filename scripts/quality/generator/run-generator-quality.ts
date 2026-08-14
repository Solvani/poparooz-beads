import { mkdir, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import path from "node:path";

import {
  assertAuthoritativeBaselineWriteAllowed,
  createGeneratorQualityBaselineIdentity,
  verifyFrozenGeneratorQualityFiles,
} from "./generator-quality-baseline.ts";
import { readGeneratorQualityManifest } from "./generator-quality-manifest.ts";
import { resolveExternalCorpus } from "./generator-quality-resolver.ts";
import {
  loadGeneratorQualityDependencies,
  replaySyntheticQualityCase,
  type GeneratorQualityPerformanceSample,
} from "./generator-quality-replay.ts";
import {
  createGeneratorQualityMarkdown,
  createGeneratorQualityScorecard,
  generatorQualityExitCode,
  serializeCanonicalJson,
  serializeGeneratorQualityScorecard,
} from "./generator-quality-scorecard.ts";
import {
  createSyntheticGeneratorQualityFixture,
  hashSyntheticGeneratorQualityFixture,
} from "./generator-quality-synthetic.ts";
import type {
  GeneratorQualityCaseResult,
  GeneratorQualityCorpusManifest,
} from "./generator-quality.types.ts";

const repositoryRoot = process.cwd();
const options = parseArguments(process.argv.slice(2));
const manifestPath = path.resolve(
  repositoryRoot,
  options.manifest ??
    "data-source/quality/generator-corpus/0.1.0/manifest.json",
);
const manifestResult = await readGeneratorQualityManifest(manifestPath);
verifyFrozenGeneratorQualityFiles(repositoryRoot);

if (options.writeBaselineVersion !== undefined) {
  assertAuthoritativeBaselineWriteAllowed(
    manifestResult.manifest,
    options.corpus,
    options.writeBaselineVersion,
  );
}

const outputDirectory = path.resolve(
  repositoryRoot,
  options.output ?? ".quality-output",
);
const { cases, performanceSamples } = await runCorpus(
  manifestResult.manifest,
  options.corpus,
);
const identity = createGeneratorQualityBaselineIdentity(
  repositoryRoot,
  manifestResult.manifest.corpusVersion,
  manifestResult.sha256,
  options.writeBaselineVersion ?? "development",
);
const scorecard = createGeneratorQualityScorecard(
  options.corpus,
  identity,
  cases,
  options.writeBaselineVersion !== undefined,
);
const scorecardBytes = serializeGeneratorQualityScorecard(scorecard);
const summary = createGeneratorQualityMarkdown(scorecard);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(
    path.join(outputDirectory, "generator-quality-scorecard.json"),
    scorecardBytes,
    "utf8",
  ),
  writeFile(
    path.join(outputDirectory, "generator-quality-summary.md"),
    summary,
    "utf8",
  ),
  writeFile(
    path.join(outputDirectory, "generator-quality-performance.json"),
    performanceAnnex(performanceSamples),
    "utf8",
  ),
]);

if (options.writeBaselineVersion !== undefined) {
  await writeAuthoritativeBaseline(
    options.writeBaselineVersion,
    scorecardBytes,
    summary,
  );
}

process.stdout.write(
  [
    `Generator quality corpus mode: ${options.corpus}`,
    `Cases: ${scorecard.overallSummary.caseCount}`,
    `Passed hard gates: ${scorecard.overallSummary.passedGateCount}`,
    `Failed hard gates: ${scorecard.overallSummary.failedGateCount}`,
    `Canonical SHA-256: ${scorecard.canonicalScorecardSha256}`,
    `Output: ${path.relative(repositoryRoot, outputDirectory) || "."}`,
  ].join("\n") + "\n",
);
process.exitCode = generatorQualityExitCode(scorecard);

interface CliOptions {
  readonly corpus: "synthetic" | "external";
  readonly manifest?: string;
  readonly output?: string;
  readonly writeBaselineVersion?: string;
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  let corpus: CliOptions["corpus"] | undefined;
  let manifest: string | undefined;
  let output: string | undefined;
  let writeBaselineVersion: string | undefined;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const value = arguments_[index + 1];
    if (
      argument === "--corpus" &&
      (value === "synthetic" || value === "external")
    ) {
      corpus = value;
      index += 1;
    } else if (argument === "--manifest" && value !== undefined) {
      manifest = value;
      index += 1;
    } else if (argument === "--output" && value !== undefined) {
      output = value;
      index += 1;
    } else if (
      (argument === "--write-baseline" || argument === "--baseline-version") &&
      value !== undefined
    ) {
      writeBaselineVersion = value;
      index += 1;
    } else {
      throw new Error("Generator quality CLI arguments are invalid.");
    }
  }
  if (corpus === undefined) {
    throw new Error(
      "An explicit --corpus synthetic|external mode is required.",
    );
  }
  return { corpus, manifest, output, writeBaselineVersion };
}

async function runCorpus(
  manifest: GeneratorQualityCorpusManifest,
  corpus: CliOptions["corpus"],
): Promise<
  Readonly<{
    cases: readonly GeneratorQualityCaseResult[];
    performanceSamples: readonly GeneratorQualityPerformanceSample[];
  }>
> {
  if (corpus === "external") {
    const root = process.env.POPAROOZ_QUALITY_CORPUS_DIR;
    if (root === undefined || root.trim() === "") {
      throw new Error(
        "POPAROOZ_QUALITY_CORPUS_DIR is required for external corpus mode.",
      );
    }
    await resolveExternalCorpus(manifest, root);
    throw new Error(
      "External corpus files validated; curated image decoding belongs to Q01-A02 and is not installed yet.",
    );
  }

  const declarations = manifest.cases
    .filter((item) => item.sourceKind === "synthetic")
    .sort((left, right) => left.id.localeCompare(right.id));
  if (declarations.length === 0) {
    throw new Error("The manifest has no synthetic quality cases.");
  }
  const dependencies = loadGeneratorQualityDependencies(repositoryRoot);
  const cases: GeneratorQualityCaseResult[] = [];
  const performanceSamples: GeneratorQualityPerformanceSample[] = [];
  for (const declaration of declarations) {
    const fixture = createSyntheticGeneratorQualityFixture(
      declaration.input.logicalId,
    );
    if (
      hashSyntheticGeneratorQualityFixture(fixture) !== declaration.input.sha256
    ) {
      throw new Error(
        "Synthetic corpus fixture SHA-256 does not match its manifest.",
      );
    }
    for (const background of declaration.supportedBackgrounds) {
      for (const size of declaration.supportedPatternSizes) {
        const replay = replaySyntheticQualityCase(
          declaration,
          fixture,
          background,
          size,
          dependencies,
        );
        cases.push(replay.result);
        performanceSamples.push(replay.performance);
      }
    }
  }
  return Object.freeze({
    cases: Object.freeze(cases),
    performanceSamples: Object.freeze(performanceSamples),
  });
}

async function writeAuthoritativeBaseline(
  version: string,
  scorecard: string,
  summary: string,
): Promise<void> {
  const directory = path.join(
    repositoryRoot,
    "data-source/quality/generator-baselines",
    version,
  );
  await mkdir(path.dirname(directory), { recursive: true });
  try {
    await mkdir(directory, { recursive: false });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      throw new Error(
        "The requested authoritative baseline version already exists.",
      );
    }
    throw error;
  }
  await Promise.all([
    writeFile(
      path.join(directory, "generator-quality-scorecard.json"),
      scorecard,
      { encoding: "utf8", flag: "wx" },
    ),
    writeFile(path.join(directory, "generator-quality-summary.md"), summary, {
      encoding: "utf8",
      flag: "wx",
    }),
  ]);
}

function performanceAnnex(
  samples: readonly GeneratorQualityPerformanceSample[],
): string {
  return serializeCanonicalJson({
    canonical: false,
    interpretation: "Node diagnostic only; no browser or mobile SLA.",
    environment: {
      node: process.version,
      platform: platform(),
      release: release(),
      architecture: arch(),
    },
    samples,
  });
}
