import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { GeneratorQualityBaselineIdentity } from "./generator-quality.types.ts";
import type { GeneratorQualityCorpusManifest } from "./generator-quality.types.ts";

export const FROZEN_GENERATOR_QUALITY_FILES = Object.freeze({
  runtimePaletteArtifact: Object.freeze({
    path: "src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
    sha256: "86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70",
  }),
  runtimePaletteLock: Object.freeze({
    path: "data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.lock.json",
    sha256: "36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648",
  }),
  colorSetArtifact: Object.freeze({
    path: "src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
    sha256: "d3198bfd9a9507236946f5417354c7278b151d572bef7cd376fed5bbfa54b4d7",
  }),
  colorSetLock: Object.freeze({
    path: "data-source/runtime-locks/poparooz-fixed-color-sets/1.0.0/color-set-profiles.lock.json",
    sha256: "fbad3ba0e2efcea0f1ac07e42b946e097778ca98904dc9e6433be55e4b3c1d79",
  }),
});

export function verifyFrozenGeneratorQualityFiles(
  repositoryRoot: string,
): Readonly<Record<keyof typeof FROZEN_GENERATOR_QUALITY_FILES, string>> {
  const result = {} as Record<
    keyof typeof FROZEN_GENERATOR_QUALITY_FILES,
    string
  >;
  for (const key of Object.keys(FROZEN_GENERATOR_QUALITY_FILES) as Array<
    keyof typeof FROZEN_GENERATOR_QUALITY_FILES
  >) {
    const declaration = FROZEN_GENERATOR_QUALITY_FILES[key];
    const actual = createHash("sha256")
      .update(readFileSync(path.join(repositoryRoot, declaration.path)))
      .digest("hex");
    if (actual !== declaration.sha256) {
      throw new Error(`Frozen generator-quality input mismatch: ${key}.`);
    }
    result[key] = actual;
  }
  return Object.freeze(result);
}

export function createGeneratorQualityBaselineIdentity(
  repositoryRoot: string,
  corpusManifestVersion: string,
  corpusManifestSha256: string,
  baselineVersion = "development",
): GeneratorQualityBaselineIdentity {
  const hashes = verifyFrozenGeneratorQualityFiles(repositoryRoot);
  return Object.freeze({
    baselineId: "poparooz-generation-quality-baseline",
    baselineVersion,
    gitCommit: gitHead(repositoryRoot),
    processingPolicy: Object.freeze({
      id: "poparooz-processing-policy",
      version: "1.1.0",
    }),
    runtimePaletteArtifactSha256: hashes.runtimePaletteArtifact,
    runtimePaletteLockSha256: hashes.runtimePaletteLock,
    colorSetArtifactSha256: hashes.colorSetArtifact,
    colorSetLockSha256: hashes.colorSetLock,
    corpusManifestVersion,
    corpusManifestSha256,
    metricImplementationVersion: "1.1.0",
    scorecardSchemaVersion: "1.0.0",
  });
}

export function assertAuthoritativeBaselineWriteAllowed(
  manifest: GeneratorQualityCorpusManifest,
  corpusMode: "synthetic" | "external",
  version: string,
): void {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("Authoritative baseline version is invalid.");
  }
  if (corpusMode !== "external" || manifest.corpusStatus !== "complete") {
    throw new Error(
      "Authoritative baseline writing requires a complete external corpus manifest.",
    );
  }
}

function gitHead(repositoryRoot: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}
