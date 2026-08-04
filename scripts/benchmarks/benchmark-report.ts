import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { rgb8ToLab } from "../../src/domain/color/color-conversion";
import {
  matchNearestPaletteColor,
  preparePaletteCandidates,
} from "../../src/domain/color/color-matching";
import { assemblePattern } from "../../src/domain/pattern/pattern-assembler";
import { toPublicPatternResult } from "../../src/domain/pattern/public-pattern.mapper";
import type { GenerationPaletteColor } from "../../src/runtime/generation-palette/generation-palette.types";
import { quantizeImage } from "../../src/domain/quantization/quantize-image";
import {
  BENCHMARK_BOARD_PROFILE,
  BENCHMARK_FIXTURES,
  createBenchmarkPalette,
  createBenchmarkRgbSet,
  createBenchmarkRgbaFixture,
  type BenchmarkFixtureDefinition,
} from "./benchmark-fixtures";

const WARM_UP_ITERATIONS = 3;
const MEASUREMENT_ITERATIONS = 10;

interface Measurement {
  readonly stage: string;
  readonly scenario: string;
  readonly parameters: string;
  readonly minMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly heapBeforeBytes: number;
  readonly heapAfterBytes: number;
  readonly approximatePeakDeltaBytes: number;
}

interface BufferObservation {
  readonly scenario: string;
  readonly rgbaBytes: number;
  readonly quantizedIndexBytes: number;
  readonly patternMatrixBytes: number;
  readonly publicMatrixBytes: number;
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.ceil(sorted.length * fraction) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]!;
}

function measure(
  stage: string,
  scenario: string,
  parameters: string,
  operation: () => number,
): Measurement {
  let checksum = 0;
  for (let iteration = 0; iteration < WARM_UP_ITERATIONS; iteration += 1) {
    checksum += operation();
  }

  const heapBeforeBytes = process.memoryUsage().heapUsed;
  let approximatePeakBytes = heapBeforeBytes;
  const samples: number[] = [];
  for (let iteration = 0; iteration < MEASUREMENT_ITERATIONS; iteration += 1) {
    const started = performance.now();
    checksum += operation();
    samples.push(performance.now() - started);
    approximatePeakBytes = Math.max(
      approximatePeakBytes,
      process.memoryUsage().heapUsed,
    );
  }
  if (!Number.isFinite(checksum)) {
    throw new Error("Benchmark checksum is invalid.");
  }
  const heapAfterBytes = process.memoryUsage().heapUsed;
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    stage,
    scenario,
    parameters,
    minMs: sorted[0]!,
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1)!,
    heapBeforeBytes,
    heapAfterBytes,
    approximatePeakDeltaBytes: Math.max(
      0,
      approximatePeakBytes - heapBeforeBytes,
    ),
  };
}

function formatMs(value: number): string {
  return value < 0.01 ? "<0.01" : value.toFixed(2);
}

function formatMiB(value: number): string {
  return (value / (1024 * 1024)).toFixed(2);
}

function baseCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "Unavailable";
  }
}

function fixtureParameters(definition: BenchmarkFixtureDefinition): string {
  return `${definition.width}x${definition.height}; U=${definition.uniqueColors}; K=${definition.maxColors}; P=${definition.paletteCandidates}; ${definition.pattern}`;
}

function runMeasurements(): {
  readonly measurements: readonly Measurement[];
  readonly buffers: readonly BufferObservation[];
} {
  const measurements: Measurement[] = [];
  const buffers: BufferObservation[] = [];

  for (const uniqueColorCount of [8, 16, 32, 64, 128, 256]) {
    const rgbSet = createBenchmarkRgbSet(uniqueColorCount);
    measurements.push(
      measure(
        "RGB to Lab",
        `${uniqueColorCount} unique colors`,
        `U=${uniqueColorCount}`,
        () => rgbSet.reduce((sum, rgb) => sum + rgb8ToLab(rgb).l, 0),
      ),
    );
  }

  for (const definition of BENCHMARK_FIXTURES) {
    const image = createBenchmarkRgbaFixture(definition);
    const palette = createBenchmarkPalette(definition.paletteCandidates);
    const generationColors: readonly GenerationPaletteColor[] = Object.freeze(
      palette.colors.map((color, index) =>
        Object.freeze({
          code: `A${index + 1}`,
          hex: color.hex,
          rgb: color.rgb,
          lab: color.lab,
          sortOrder: color.sortOrder,
          active: color.isActive,
          autoMatchEligible: color.isAutoMatchEnabled,
        }),
      ),
    );
    const parameters = fixtureParameters(definition);
    measurements.push(
      measure("Quantization", definition.name, parameters, () => {
        const result = quantizeImage(image, {
          maxColors: definition.maxColors,
          alphaThreshold: 0,
        });
        return result.opaquePixelCount + result.colors.length;
      }),
    );

    const quantized = quantizeImage(image, {
      maxColors: definition.maxColors,
      alphaThreshold: 0,
    });
    const candidates = preparePaletteCandidates(palette);
    measurements.push(
      measure("Palette matching", definition.name, parameters, () =>
        quantized.colors.reduce(
          (sum, item) =>
            sum + matchNearestPaletteColor(item.lab, candidates).distance,
          0,
        ),
      ),
    );

    measurements.push(
      measure("Pattern assembly", definition.name, parameters, () => {
        const result = assemblePattern({
          quantizedImage: quantized,
          paletteColors: generationColors,
          boardProfile: BENCHMARK_BOARD_PROFILE,
        });
        return result.totals.totalBeads + result.boardLayout.boardCount;
      }),
    );

    const internal = assemblePattern({
      quantizedImage: quantized,
      paletteColors: generationColors,
      boardProfile: BENCHMARK_BOARD_PROFILE,
    });
    measurements.push(
      measure("Public mapping", definition.name, parameters, () => {
        const result = toPublicPatternResult(internal);
        return result.totals.totalBeads + result.matrix.colorIndices.length;
      }),
    );

    measurements.push(
      measure(
        "Pure computation end-to-end",
        definition.name,
        parameters,
        () => {
          const endQuantized = quantizeImage(image, {
            maxColors: definition.maxColors,
            alphaThreshold: 0,
          });
          const endInternal = assemblePattern({
            quantizedImage: endQuantized,
            paletteColors: generationColors,
            boardProfile: BENCHMARK_BOARD_PROFILE,
          });
          const result = toPublicPatternResult(endInternal);
          return result.totals.totalBeads + result.colors.length;
        },
      ),
    );

    const publicResult = toPublicPatternResult(internal);
    buffers.push({
      scenario: definition.name,
      rgbaBytes: image.data.byteLength,
      quantizedIndexBytes: quantized.colorIndices.byteLength,
      patternMatrixBytes: internal.matrix.colorIndices.byteLength,
      publicMatrixBytes: publicResult.matrix.colorIndices.byteLength,
    });
  }

  return { measurements, buffers };
}

function createMarkdown(
  measurements: readonly Measurement[],
  buffers: readonly BufferObservation[],
): string {
  const cpu = cpus()[0];
  const lines = [
    "# P1-A10 Performance Benchmark Evidence",
    "",
    `Generated (UTC): **${new Date().toISOString()}**`,
    "",
    `Project base commit: \`${baseCommit()}\``,
    "",
    "Benchmark scope: **P1-A10 working tree; pure computation only**",
    "",
    "## Environment",
    "",
    `- OS: ${platform()} ${release()}`,
    `- Architecture: ${arch()}`,
    `- CPU: ${cpu?.model ?? "Unavailable"}`,
    `- Logical cores: ${cpus().length}`,
    `- Total memory: ${formatMiB(totalmem())} MiB`,
    `- Node: ${process.version}`,
    "- Build mode: Vite SSR benchmark bundle executed in Node",
    `- Warm-up iterations: ${WARM_UP_ITERATIONS}`,
    `- Measurement iterations: ${MEASUREMENT_ITERATIONS}`,
    "",
    "No user name, local path, device serial, IP, file name, or image content is recorded.",
    "",
    "## Method",
    "",
    "Fixtures are generated deterministically in memory and are synthetic/not-production. Each operation is warmed up, then all measurement samples are retained. Median, min, max, and nearest-rank p95 are reported without an SLA threshold. Quantization is measured as a whole; Histogram, Median Cut, Medoid, and remapping are not duplicated or separately instrumented.",
    "",
    "Node measurements exclude browser decoding, Canvas extraction, real Worker scheduling, structured-clone/detachment timing, rendering, and customer interaction. Pure computation end-to-end means only `quantizeImage -> assemblePattern -> toPublicPatternResult`.",
    "",
    "## Timing results",
    "",
    "| Stage | Scenario | Parameters | Median ms | Min ms | P95 ms | Max ms | Approx peak heap delta MiB |",
    "|---|---|---|---:|---:|---:|---:|---:|",
    ...measurements.map(
      (item) =>
        `| ${item.stage} | ${item.scenario} | ${item.parameters} | ${formatMs(item.medianMs)} | ${formatMs(item.minMs)} | ${formatMs(item.p95Ms)} | ${formatMs(item.maxMs)} | ${formatMiB(item.approximatePeakDeltaBytes)} |`,
    ),
    "",
    "## Buffer observations",
    "",
    "| Scenario | Input RGBA bytes | Quantized indices bytes | Internal pattern bytes | Public matrix bytes |",
    "|---|---:|---:|---:|---:|",
    ...buffers.map(
      (item) =>
        `| ${item.scenario} | ${item.rgbaBytes} | ${item.quantizedIndexBytes} | ${item.patternMatrixBytes} | ${item.publicMatrixBytes} |`,
    ),
    "",
    "Each index buffer size is reported independently. Equal sizes do not imply shared ownership; automated integration tests verify distinct buffers.",
    "",
    "## Memory limitations",
    "",
    "Heap readings use `process.memoryUsage().heapUsed` before, during, and after each measurement group. Garbage collection is not forced and the observed delta is only an approximation. It is not a browser peak, leak proof, Safari iOS result, or mobile memory commitment.",
    "",
    "## Interpretation boundary",
    "",
    "These measurements support growth-trend and relative-stage review only. The Phase 1 freeze document records the final Green/Yellow/Red classification and Worker Decision after comparing the measured stages. Real browser and device validation remains separate evidence.",
    "",
  ];
  return lines.join("\n");
}

const { measurements, buffers } = runMeasurements();
const markdown = createMarkdown(measurements, buffers);
if (process.argv.includes("--write")) {
  await writeFile(
    resolve(process.cwd(), "docs/evidence/P1_A10_PERFORMANCE_BENCHMARK.md"),
    markdown,
    "utf8",
  );
}
process.stdout.write(markdown);
