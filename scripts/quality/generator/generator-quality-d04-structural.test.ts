import { describe, expect, it } from "vitest";

import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";
import {
  comparePatternStructure,
  measurePatternStructure,
} from "./generator-quality-d04-structural.ts";

describe("D04-A02 structural Pattern metrics", () => {
  it("measures components, boundaries, switching, thin continuity, and dominance", () => {
    const metrics = measurePatternStructure(
      pattern([0, 0, 1, 0, 1, 1, 2, 1, 2]),
    );

    expect(metrics.occupiedCellCount).toBe(9);
    expect(metrics.usedColorCount).toBe(3);
    expect(metrics.totalColorComponents).toBe(4);
    expect(metrics.singletonComponentCount).toBe(2);
    expect(metrics.colorBoundaryEdgeCount).toBeGreaterThan(0);
    expect(metrics.normalizedBoundaryLength).toBeGreaterThan(0);
    expect(metrics.meanLocalColorSwitches).toBeGreaterThan(0);
    expect(metrics.dominantColorComponentCount).toBe(1);
  });

  it("reports deterministic transition deltas and color efficiency", () => {
    const smaller = measurePatternStructure(pattern([0, 0, 0, 0]));
    const larger = measurePatternStructure(pattern([0, 1, 0, 1]));
    const transition = comparePatternStructure(smaller, larger, 2.5);

    expect(transition.totalColorComponentsDelta).toBeGreaterThan(0);
    expect(transition.normalizedBoundaryLengthDelta).toBeGreaterThan(0);
    expect(transition.additionalUsedColors).toBe(1);
    expect(transition.meanDeltaE00GainPerAdditionalColor).toBe(2.5);
  });

  it("rejects occupancy drift", () => {
    const smaller = measurePatternStructure(pattern([0, 0, 0, 0]));
    const larger = measurePatternStructure(pattern([0, 0, 0, 65535]));
    expect(() => comparePatternStructure(smaller, larger, 1)).toThrow(
      "Structural comparison occupancy differs.",
    );
  });
});

function pattern(indices: readonly number[]): PublicPatternResult {
  const width = Math.sqrt(indices.length);
  const counts = [0, 1, 2].map(
    (index) => indices.filter((value) => value === index).length,
  );
  const colors = counts
    .map((beadCount, index) => ({ beadCount, index }))
    .filter((item) => item.beadCount > 0)
    .map(({ beadCount, index }) => ({
      index,
      beadCount,
      color: {
        brand: "Poparooz" as const,
        code: `H${index + 1}` as `H${number}`,
        hex: ["#111111", "#777777", "#eeeeee"][index]!,
      },
    }));
  const occupied = indices.filter((value) => value !== 65535).length;
  return {
    matrix: {
      width,
      height: width,
      colorIndices: new Uint16Array(indices),
      transparentIndex: 65535,
    },
    colors,
    materials: [],
    totals: {
      totalBeads: occupied,
      transparentPositions: indices.length - occupied,
      colorCount: colors.length,
    },
    boardLayout: {
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
      boardWidthInBeads: width,
      boardHeightInBeads: width,
      totalPegCapacity: indices.length,
      usedBeadCount: occupied,
      transparentPatternPositions: indices.length - occupied,
      outsidePatternPegCount: 0,
      unusedPegCount: indices.length - occupied,
      tiles: [],
    },
  };
}
