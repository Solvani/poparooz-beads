import { rgb8ToLab } from "../../src/domain/color/color-conversion";
import type { Rgb8 } from "../../src/domain/color/color.types";
import type { RgbaImage } from "../../src/domain/image/image.types";
import type {
  PaletteColor,
  PaletteDefinition,
} from "../../src/domain/palette/palette.types";
import type { GenerationBoardProfileSnapshot } from "../../src/runtime/generation-board-profile/generation-board-profile.types";

export type BenchmarkPattern =
  | "solid-blocks"
  | "horizontal-gradient"
  | "vertical-gradient"
  | "checker"
  | "accented"
  | "transparent-edge"
  | "semi-transparent"
  | "rearranged";

export interface BenchmarkFixtureDefinition {
  readonly name: "Small" | "Medium" | "Large" | "Stress";
  readonly width: number;
  readonly height: number;
  readonly uniqueColors: number;
  readonly maxColors: number;
  readonly paletteCandidates: number;
  readonly pattern: BenchmarkPattern;
}

export const BENCHMARK_FIXTURES: readonly BenchmarkFixtureDefinition[] =
  Object.freeze([
    Object.freeze({
      name: "Small",
      width: 29,
      height: 29,
      uniqueColors: 8,
      maxColors: 8,
      paletteCandidates: 32,
      pattern: "solid-blocks",
    }),
    Object.freeze({
      name: "Medium",
      width: 58,
      height: 58,
      uniqueColors: 64,
      maxColors: 16,
      paletteCandidates: 64,
      pattern: "horizontal-gradient",
    }),
    Object.freeze({
      name: "Large",
      width: 116,
      height: 116,
      uniqueColors: 128,
      maxColors: 32,
      paletteCandidates: 128,
      pattern: "checker",
    }),
    Object.freeze({
      name: "Stress",
      width: 232,
      height: 232,
      uniqueColors: 256,
      maxColors: 64,
      paletteCandidates: 256,
      pattern: "transparent-edge",
    }),
  ]);

export const BENCHMARK_BOARD_PROFILE: GenerationBoardProfileSnapshot =
  Object.freeze({
    id: "poparooz-board-104",
    version: "1.0.0",
    shape: "square",
    pegGrid: Object.freeze({ columns: 104, rows: 104 }),
    tiling: Object.freeze({ supported: true, sharedEdgePegs: false }),
  });

function rgbForIndex(index: number): Rgb8 {
  return {
    r: index % 256,
    g: (index * 73 + 17) % 256,
    b: (index * 151 + 31) % 256,
  };
}

function colorIndexAt(
  x: number,
  y: number,
  definition: BenchmarkFixtureDefinition,
  pattern: BenchmarkPattern,
): number {
  const { width, height, uniqueColors } = definition;
  switch (pattern) {
    case "solid-blocks":
      return Math.floor((x * uniqueColors) / width) % uniqueColors;
    case "horizontal-gradient":
      return Math.floor((x * uniqueColors) / width) % uniqueColors;
    case "vertical-gradient":
      return Math.floor((y * uniqueColors) / height) % uniqueColors;
    case "checker":
      return (x * 17 + y * 31) % uniqueColors;
    case "accented":
      return (x + y) % 23 === 0 ? (x * 11 + y * 7) % uniqueColors : 0;
    case "transparent-edge":
      return (x * 13 + y * 29) % uniqueColors;
    case "semi-transparent":
      return (x * 19 + y * 5) % uniqueColors;
    case "rearranged":
      return ((width - 1 - x) * 17 + (height - 1 - y) * 31) % uniqueColors;
  }
}

export function createBenchmarkRgbaFixture(
  definition: BenchmarkFixtureDefinition,
  pattern: BenchmarkPattern = definition.pattern,
): RgbaImage {
  const data = new Uint8ClampedArray(definition.width * definition.height * 4);
  for (let y = 0; y < definition.height; y += 1) {
    for (let x = 0; x < definition.width; x += 1) {
      const offset = (y * definition.width + x) * 4;
      const rgb = rgbForIndex(colorIndexAt(x, y, definition, pattern));
      data[offset] = rgb.r;
      data[offset + 1] = rgb.g;
      data[offset + 2] = rgb.b;
      const isTransparentEdge =
        pattern === "transparent-edge" &&
        (x === 0 ||
          y === 0 ||
          x === definition.width - 1 ||
          y === definition.height - 1);
      data[offset + 3] = isTransparentEdge
        ? 0
        : pattern === "semi-transparent"
          ? 128
          : 255;
    }
  }
  return { width: definition.width, height: definition.height, data };
}

function hex(rgb: Rgb8): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function createBenchmarkPalette(colorCount: number): PaletteDefinition {
  const version = "benchmark-v1-not-production";
  const colors: PaletteColor[] = Array.from(
    { length: colorCount },
    (_, index) => {
      const rgb = rgbForIndex(index);
      const lab = rgb8ToLab(rgb);
      const suffix = index.toString().padStart(3, "0");
      return Object.freeze({
        referenceSystem: "MARD" as const,
        referenceCode: `TEST-REF-BENCH-${suffix}`,
        referenceName: `Synthetic Internal Benchmark ${suffix}`,
        referenceSeries: "Synthetic Benchmark - Not Production",
        displayCode: `POP-TEST-BENCH-${suffix}`,
        displayName: `Synthetic Benchmark Color ${suffix}`,
        hex: hex(rgb),
        rgb: [rgb.r, rgb.g, rgb.b] as [number, number, number],
        lab: [lab.l, lab.a, lab.b] as [number, number, number],
        isActive: true,
        isSellable: true,
        isSpecialFinish: false,
        isAutoMatchEnabled: true,
        sortOrder: index,
        sourceVersion: version,
      });
    },
  );
  return {
    id: `benchmark-palette-${colorCount}-not-production`,
    referenceSystem: "MARD",
    displayBrand: "Poparooz",
    name: `Synthetic ${colorCount} Color Benchmark Palette - Not Production`,
    version,
    colorCount,
    sourceType: "reference",
    colors,
  };
}

export function createBenchmarkRgbSet(count: number): readonly Rgb8[] {
  return Object.freeze(
    Array.from({ length: count }, (_, index) =>
      Object.freeze(rgbForIndex(index)),
    ),
  );
}
