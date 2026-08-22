import { describe, expect, it } from "vitest";

import type { PublicPatternResult } from "../../../src/domain/pattern/public-pattern.types.ts";
import {
  renderPatternComparisonPng,
  renderPatternGridPng,
} from "./generator-quality-pattern-preview.ts";

describe("Q02-A02 local Pattern preview", () => {
  it("emits a deterministic RGBA PNG without dependencies", () => {
    const pattern = fixturePattern();
    const first = renderPatternComparisonPng(pattern, pattern, 2, 2);
    const second = renderPatternComparisonPng(pattern, pattern, 2, 2);

    expect(first).toEqual(second);
    expect(Array.from(first.subarray(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(first.readUInt32BE(16)).toBe(10);
    expect(first.readUInt32BE(20)).toBe(4);
  });

  it("renders a deterministic multi-profile grid", () => {
    const pattern = fixturePattern();
    const first = renderPatternGridPng([pattern, pattern, pattern], 2, 2, 4);
    const second = renderPatternGridPng([pattern, pattern, pattern], 2, 2, 4);

    expect(first).toEqual(second);
    expect(Array.from(first.subarray(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  });
});

function fixturePattern(): PublicPatternResult {
  const color = { brand: "Poparooz" as const, code: "A1", hex: "#112233" };
  return {
    matrix: {
      width: 2,
      height: 2,
      colorIndices: new Uint16Array([0, 65535, 0, 0]),
      transparentIndex: 65535,
    },
    colors: [{ index: 0, color, beadCount: 3 }],
    materials: [{ patternColorIndex: 0, color, beadCount: 3 }],
    totals: {
      width: 2,
      height: 2,
      totalPositions: 4,
      totalBeads: 3,
      transparentPositions: 1,
      colorCount: 1,
    },
    boardLayout: {
      boardColumns: 1,
      boardRows: 1,
      boardCount: 1,
      boardWidthInBeads: 2,
      boardHeightInBeads: 2,
      totalPegCapacity: 4,
      usedBeadCount: 3,
      transparentPatternPositions: 1,
      outsidePatternPegCount: 0,
      unusedPegCount: 1,
      tiles: [],
    },
  };
}
