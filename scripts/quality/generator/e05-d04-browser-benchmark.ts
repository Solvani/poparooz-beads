/// <reference lib="dom" />

import { evaluateBeadSetCandidateQuality } from "../../../src/features/bead-set-recommendation/bead-set-quality-evaluator.ts";
import { assemblePattern } from "../../../src/domain/pattern/pattern-assembler.ts";
import { quantizeImage } from "../../../src/domain/quantization/quantize-image.ts";
import type { RgbaImage } from "../../../src/domain/image/image.types.ts";
import { createApprovedBoardProfileProviderFromArtifact } from "../../../src/runtime/board-profile/board-profile.provider.ts";
import boardArtifact from "../../../src/runtime/board-profile/artifacts/poparooz-board-104/1.0.0/board-profile.json";
import { createColorSetProvider } from "../../../src/runtime/color-set/color-set.provider.ts";
import colorSetArtifact from "../../../src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json";
import { adaptBoardProfileToGeneration } from "../../../src/runtime/generation-board-profile/board-profile-to-generation.adapter.ts";
import { adaptColorSetToGeneration } from "../../../src/runtime/generation-color-set/color-set-to-generation.adapter.ts";
import { projectGenerationPaletteForColorSet } from "../../../src/runtime/generation-color-set/generation-palette-projection.ts";
import { adaptRuntimePaletteToGeneration } from "../../../src/runtime/generation-palette/runtime-to-generation-palette.adapter.ts";
import { createRuntimePaletteProvider } from "../../../src/runtime/palette/runtime-palette.provider.ts";
import paletteArtifact from "../../../src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json";

const profileSizes = [24, 48, 72, 120, 168, 221] as const;
const iterations = 12;
const warmups = 3;
const image = deterministicImage(104, 104);
const palette = adaptRuntimePaletteToGeneration(
  createRuntimePaletteProvider(paletteArtifact).getSnapshot(),
);
const colorSets = adaptColorSetToGeneration(
  createColorSetProvider(colorSetArtifact).getSnapshot(),
);
const boardProfile = adaptBoardProfileToGeneration(
  createApprovedBoardProfileProviderFromArtifact(boardArtifact).getSnapshot(),
);

for (let iteration = 0; iteration < warmups; iteration += 1) {
  measureOnce();
}

const samples = Array.from({ length: iterations }, measureOnce);
const result = Object.freeze({
  schemaVersion: 1,
  stage: "P3-A03-E05-D04-A01",
  userAgent: navigator.userAgent,
  viewport: Object.freeze({ width: innerWidth, height: innerHeight }),
  fixture: Object.freeze({
    kind: "deterministic-synthetic-104-square",
    width: image.width,
    height: image.height,
    maxColors: 32,
  }),
  scope:
    "Browser main-thread compute from an already decoded 104x104 RGBA image; file decode, background removal, Worker scheduling, rendering, and device I/O are excluded.",
  iterations,
  mediansMs: Object.freeze({
    baselineQuantizeAnd221Assembly: median(
      samples.map((sample) => sample.baselineMs),
    ),
    additionalSixProfileEvaluationAndAssembly: median(
      samples.map((sample) => sample.additionalMappingMs),
    ),
    integratedQuantizeAndSixProfileEvaluation: median(
      samples.map((sample) => sample.integratedMs),
    ),
  }),
  samples,
});

const output = document.querySelector<HTMLPreElement>("#result");
if (output === null) {
  throw new Error("Benchmark output element is missing.");
}
output.textContent = JSON.stringify(result, null, 2);
document.documentElement.dataset.benchmarkStatus = "complete";

function measureOnce(): Readonly<{
  baselineMs: number;
  additionalMappingMs: number;
  integratedMs: number;
}> {
  const baselineStarted = performance.now();
  const baselineQuantized = quantizeImage(image, {
    maxColors: 32,
    alphaThreshold: 0,
  });
  assembleForProfile(baselineQuantized, 221);
  const baselineMs = performance.now() - baselineStarted;

  const prepared = quantizeImage(image, { maxColors: 32, alphaThreshold: 0 });
  const mappingStarted = performance.now();
  evaluateBeadSetCandidateQuality(prepared, palette, colorSets);
  for (const profileSize of profileSizes) {
    assembleForProfile(prepared, profileSize);
  }
  const additionalMappingMs = performance.now() - mappingStarted;

  const integratedStarted = performance.now();
  const integratedQuantized = quantizeImage(image, {
    maxColors: 32,
    alphaThreshold: 0,
  });
  evaluateBeadSetCandidateQuality(integratedQuantized, palette, colorSets);
  for (const profileSize of profileSizes) {
    assembleForProfile(integratedQuantized, profileSize);
  }
  const integratedMs = performance.now() - integratedStarted;

  return Object.freeze({ baselineMs, additionalMappingMs, integratedMs });
}

function assembleForProfile(
  quantized: ReturnType<typeof quantizeImage>,
  profileSize: (typeof profileSizes)[number],
): void {
  const profile = colorSets.profiles.find((item) => item.size === profileSize);
  if (profile === undefined) {
    throw new Error(`Profile ${profileSize} is missing.`);
  }
  assemblePattern({
    quantizedImage: quantized,
    paletteColors: projectGenerationPaletteForColorSet(palette, profile),
    boardProfile,
  });
}

function deterministicImage(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = (x * 17 + y * 3) % 256;
      data[offset + 1] = (x * 5 + y * 19) % 256;
      data[offset + 2] = (x * 11 + y * 7) % 256;
      data[offset + 3] = 255;
    }
  }
  return Object.freeze({ width, height, data });
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  const lower = sorted[middle - 1];
  if (upper === undefined) {
    throw new Error("Cannot calculate a median without samples.");
  }
  return sorted.length % 2 === 0 && lower !== undefined
    ? (lower + upper) / 2
    : upper;
}
