import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";

import {
  createBenchmarkRgbaFixture,
  type BenchmarkFixtureDefinition,
  type BenchmarkPattern,
} from "../benchmarks/benchmark-fixtures";
import { quantizeImage } from "../../src/domain/quantization/quantize-image";
import { evaluateBeadSetCandidateQuality } from "../../src/features/bead-set-recommendation/bead-set-quality-evaluator";
import { createColorSetProvider } from "../../src/runtime/color-set/color-set.provider";
import { adaptColorSetToGeneration } from "../../src/runtime/generation-color-set/color-set-to-generation.adapter";
import { adaptRuntimePaletteToGeneration } from "../../src/runtime/generation-palette/runtime-to-generation-palette.adapter";
import { createRuntimePaletteProvider } from "../../src/runtime/palette/runtime-palette.provider";

const WARMUP_ITERATIONS = 2;
const MEASUREMENT_ITERATIONS = 5;
const PROFILE_CANDIDATE_TOTAL = 24 + 48 + 72 + 120 + 168 + 221;
const APPROVED_ALPHA_THRESHOLD_BYTE = 16;

interface EvidenceCase {
  readonly label: string;
  readonly size: 40 | 60 | 80 | 104;
  readonly uniqueColors: number;
  readonly pattern: BenchmarkPattern;
}

const CASES: readonly EvidenceCase[] = Object.freeze([
  Object.freeze({
    label: "synthetic-low-color",
    size: 40,
    uniqueColors: 8,
    pattern: "solid-blocks",
  }),
  Object.freeze({
    label: "synthetic-tonal-gradient",
    size: 60,
    uniqueColors: 96,
    pattern: "horizontal-gradient",
  }),
  Object.freeze({
    label: "synthetic-saturated-accents",
    size: 80,
    uniqueColors: 128,
    pattern: "accented",
  }),
  Object.freeze({
    label: "synthetic-transparent-edge",
    size: 104,
    uniqueColors: 192,
    pattern: "transparent-edge",
  }),
]);

function readApprovedJson(relativeUrl: string): unknown {
  return JSON.parse(
    readFileSync(new URL(relativeUrl, import.meta.url), "utf8"),
  );
}

const palette = adaptRuntimePaletteToGeneration(
  createRuntimePaletteProvider(
    readApprovedJson(
      "../../src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json",
    ),
  ).getSnapshot(),
);
const colorSets = adaptColorSetToGeneration(
  createColorSetProvider(
    readApprovedJson(
      "../../src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json",
    ),
  ).getSnapshot(),
);

function median(measurements: readonly number[]): number {
  const sorted = [...measurements].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function measure(operation: () => void): number {
  for (let iteration = 0; iteration < WARMUP_ITERATIONS; iteration += 1) {
    operation();
  }
  const measurements: number[] = [];
  for (let iteration = 0; iteration < MEASUREMENT_ITERATIONS; iteration += 1) {
    const startedAt = performance.now();
    operation();
    measurements.push(performance.now() - startedAt);
  }
  return median(measurements);
}

for (const evidenceCase of CASES) {
  const fixture: BenchmarkFixtureDefinition = Object.freeze({
    name: "Small",
    width: evidenceCase.size,
    height: evidenceCase.size,
    uniqueColors: evidenceCase.uniqueColors,
    maxColors: 32,
    paletteCandidates: 221,
    pattern: evidenceCase.pattern,
  });
  const image = createBenchmarkRgbaFixture(fixture);
  const quantizationOptions = Object.freeze({
    maxColors: 32,
    alphaThreshold: APPROVED_ALPHA_THRESHOLD_BYTE,
  });
  const quantized = quantizeImage(image, quantizationOptions);
  const evaluation = evaluateBeadSetCandidateQuality(
    quantized,
    palette,
    colorSets,
  );
  const quantizationMs = measure(() => {
    quantizeImage(image, quantizationOptions);
  });
  const evaluationMs = measure(() => {
    evaluateBeadSetCandidateQuality(quantized, palette, colorSets);
  });

  console.log(
    `\n${evidenceCase.label} (${evidenceCase.size}x${evidenceCase.size})`,
  );
  console.log(
    `Preprocessing: not measured (synthetic normalized RGBA fixture); quantization median: ${quantizationMs.toFixed(3)} ms; six-profile evaluation median: ${evaluationMs.toFixed(3)} ms; pure-compute sum: ${(quantizationMs + evaluationMs).toFixed(3)} ms`,
  );
  console.log(
    `Deterministic distance evaluations: ${evaluation.quantizedColorCount} quantized colors x ${PROFILE_CANDIDATE_TOTAL} profile candidates = ${evaluation.quantizedColorCount * PROFILE_CANDIDATE_TOTAL}`,
  );
  console.table(
    evaluation.candidates.map((candidate) => ({
      Profile: candidate.profileSize,
      Used: candidate.usedColorCount,
      "Mean dE00": candidate.weightedMeanPaletteDeltaE00,
      "P95 dE00": candidate.weightedP95PaletteDeltaE00,
      "Max dE00": candidate.maximumPaletteDeltaE00,
      "Mean d vs 221": candidate.meanDeltaVs221,
      "P95 d vs 221": candidate.p95DeltaVs221,
    })),
  );
}

console.log(
  "\nEvidence scope: deterministic synthetic fixtures and Node pure-compute timing only; no browser decode, Worker scheduling, rendering, customer images, network requests, recommendation threshold, or customer-facing accuracy claim.",
);
