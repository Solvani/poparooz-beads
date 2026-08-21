import { describe, expect, it } from "vitest";

import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";
import type { GenerationPaletteColor } from "../../../src/runtime/generation-palette/generation-palette.types.ts";
import {
  analyzePatternColorPurity,
  comparePatternMatrices,
} from "./generator-quality-color-purity.ts";

const palette = [
  color("A1", "#000000", [0, 0, 0], [0, 0, 0], 1),
  color("A2", "#111111", [17, 17, 17], [5, 0, 0], 2),
  color("A3", "#FFFFFF", [255, 255, 255], [100, 0, 0], 3),
];

describe("Q02-A02 Pattern color-purity diagnostics", () => {
  it("reports color-connected components and adjacent codes", () => {
    const pattern = createPattern(
      new Uint16Array([0, 0, 0, 0, 1, 0, 2, 2, 65535]),
      ["A1", "A2", "A3"],
    );
    const result = analyzePatternColorPurity(pattern, palette);

    expect(result.componentBuckets).toEqual({
      size1: 1,
      size2: 1,
      size3To4: 0,
      size5Plus: 1,
    });
    expect(result.totalComponentCount).toBe(3);
    expect(result.tinyComponents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "A2",
          size: 1,
          dominantNeighborCode: "A1",
        }),
        expect.objectContaining({ code: "A3", size: 2 }),
      ]),
    );
  });

  it("compares Pattern codes independently from palette indices", () => {
    const baseline = createPattern(new Uint16Array([0, 1, 2]), [
      "A1",
      "A2",
      "A3",
    ]);
    const reordered = createPattern(new Uint16Array([1, 0, 2]), [
      "A2",
      "A1",
      "A3",
    ]);
    const changed = createPattern(new Uint16Array([1, 2, 2]), [
      "A2",
      "A1",
      "A3",
    ]);

    expect(comparePatternMatrices(baseline, reordered)).toMatchObject({
      occupancyIdentical: true,
      changedCodePositions: 0,
    });
    expect(comparePatternMatrices(baseline, changed)).toMatchObject({
      occupancyIdentical: true,
      changedCodePositions: 1,
    });
  });
});

function createPattern(
  colorIndices: Uint16Array,
  codes: readonly string[],
): PublicPatternResult {
  const width = colorIndices.length === 9 ? 3 : colorIndices.length;
  const height = colorIndices.length === 9 ? 3 : 1;
  const colors = codes.map((code, index) => ({
    index,
    color: { brand: "Poparooz" as const, code, hex: palette[index]!.hex },
    beadCount: Array.from(colorIndices).filter((value) => value === index)
      .length,
  }));
  const totalBeads = colors.reduce((sum, item) => sum + item.beadCount, 0);
  return {
    matrix: { width, height, colorIndices, transparentIndex: 65535 },
    colors,
    materials: colors.map((item) => ({
      patternColorIndex: item.index,
      color: item.color,
      beadCount: item.beadCount,
    })),
    totals: {
      width,
      height,
      totalPositions: width * height,
      totalBeads,
      transparentPositions: width * height - totalBeads,
      colorCount: colors.length,
    },
    boardLayout: {
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
      boardWidthInBeads: width,
      boardHeightInBeads: height,
      totalPegCapacity: width * height,
      usedBeadCount: totalBeads,
      transparentPatternPositions: width * height - totalBeads,
      outsidePatternPegCount: 0,
      unusedPegCount: width * height - totalBeads,
      tiles: [],
    },
  };
}

function color(
  code: string,
  hex: string,
  rgb: readonly [number, number, number],
  lab: readonly [number, number, number],
  sortOrder: number,
): GenerationPaletteColor {
  return {
    code,
    hex,
    rgb,
    lab,
    sortOrder,
    active: true,
    autoMatchEligible: true,
  };
}
