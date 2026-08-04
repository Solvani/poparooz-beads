import { describe, expect, it } from "vitest";

import {
  BENCHMARK_BOARD_PROFILE,
  BENCHMARK_FIXTURES,
  createBenchmarkPalette,
  createBenchmarkRgbaFixture,
} from "../../../scripts/benchmarks/benchmark-fixtures.ts";
import type { GenerationPaletteColor } from "../../runtime/generation-palette/generation-palette.types";
import type { PaletteDefinition } from "../palette/palette.types";
import { quantizeImage } from "../quantization/quantize-image";
import { assemblePattern } from "./pattern-assembler";
import { toPublicPatternResult } from "./public-pattern.mapper";

function toGenerationColors(
  palette: PaletteDefinition,
): readonly GenerationPaletteColor[] {
  return Object.freeze(
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
}

describe("Phase 1 pure computation chain", () => {
  it("produces a deterministic, exact, Poparooz-only result with isolated buffers", () => {
    const fixture = BENCHMARK_FIXTURES[0]!;
    const image = createBenchmarkRgbaFixture(fixture);
    const originalRgba = image.data.slice();
    const palette = createBenchmarkPalette(fixture.paletteCandidates);
    const paletteColors = toGenerationColors(palette);

    const execute = (colors = paletteColors) => {
      const quantized = quantizeImage(image, {
        maxColors: fixture.maxColors,
        alphaThreshold: 0,
      });
      const internal = assemblePattern({
        quantizedImage: quantized,
        paletteColors: colors,
        boardProfile: BENCHMARK_BOARD_PROFILE,
      });
      const publicResult = toPublicPatternResult(internal);
      return { quantized, internal, publicResult };
    };

    const first = execute();
    const second = execute([...paletteColors].reverse());

    expect(second).toEqual(first);
    expect(image.data).toEqual(originalRgba);
    expect(first.quantized.opaquePixelCount).toBe(
      fixture.width * fixture.height,
    );
    expect(first.internal.totals.totalBeads).toBe(
      first.quantized.opaquePixelCount,
    );
    expect(first.internal.totals.transparentPositions).toBe(0);
    expect(
      first.internal.materials.reduce(
        (sum, material) => sum + material.beadCount,
        0,
      ),
    ).toBe(first.internal.totals.totalBeads);
    expect(first.internal.boardLayout).toMatchObject({
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
    });
    expect(
      first.publicResult.colors.every(
        ({ color }) => color.brand === "Poparooz",
      ),
    ).toBe(true);

    const publicJson = JSON.stringify(first.publicResult);
    for (const forbidden of [
      "MARD",
      "referenceCode",
      "referenceSystem",
      "productHandle",
      "variantId",
    ]) {
      expect(publicJson).not.toContain(forbidden);
    }
    expect(first.quantized.colorIndices.buffer).not.toBe(image.data.buffer);
    expect(first.internal.matrix.colorIndices.buffer).not.toBe(
      first.quantized.colorIndices.buffer,
    );
    expect(first.publicResult.matrix.colorIndices.buffer).not.toBe(
      first.internal.matrix.colorIndices.buffer,
    );
  });

  it("preserves deterministic transparent edges through totals and board layout", () => {
    const base = BENCHMARK_FIXTURES[0]!;
    const fixture = { ...base, pattern: "transparent-edge" as const };
    const image = createBenchmarkRgbaFixture(fixture);
    const quantized = quantizeImage(image, {
      maxColors: fixture.maxColors,
      alphaThreshold: 0,
    });
    const internal = assemblePattern({
      quantizedImage: quantized,
      paletteColors: toGenerationColors(
        createBenchmarkPalette(fixture.paletteCandidates),
      ),
      boardProfile: BENCHMARK_BOARD_PROFILE,
    });
    const expectedTransparent = fixture.width * 2 + (fixture.height - 2) * 2;

    expect(quantized.transparentPixelCount).toBe(expectedTransparent);
    expect(internal.totals.transparentPositions).toBe(expectedTransparent);
    expect(internal.boardLayout.transparentPatternPositions).toBe(
      expectedTransparent,
    );
    expect(internal.totals.totalBeads + expectedTransparent).toBe(
      fixture.width * fixture.height,
    );
  });
});
