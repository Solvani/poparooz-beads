import { describe, expect, it } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import { toPatternResultView } from "./pattern-result-view";
import { createManyColors, createResultFixture } from "./test/result-fixture";

function viewOf(pattern: PublicPatternResult) {
  const result = toPatternResultView(pattern);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected a valid result view.");
  return result.view;
}

describe("pattern result view", () => {
  it("uses authoritative public totals and deterministic en-US formatting", () => {
    const view = viewOf(
      createResultFixture({
        width: 1000,
        height: 1,
        transparentPositions: 1,
        colors: [{ index: 0, beadCount: 999 }],
      }),
    );
    expect(view.summary).toMatchObject({
      patternSize: "1,000 × 1",
      actualColorsLabel: "1",
      totalBeadsLabel: "999",
      transparentPositionsLabel: "1 transparent position",
    });
  });

  it("does not count transparent positions as beads or invent a color row", () => {
    const view = viewOf(createResultFixture());
    expect(view.summary.totalBeads).toBe(7);
    expect(view.summary.transparentPositions).toBe(1);
    expect(view.colors).toHaveLength(2);
    expect(view.colors.some((row) => row.name === "Transparent")).toBe(false);
  });

  it("omits the transparent note when the count is zero", () => {
    const view = viewOf(
      createResultFixture({
        transparentPositions: 0,
        colors: [{ index: 0, beadCount: 8 }],
      }),
    );
    expect(view.summary.transparentPositionsLabel).toBeNull();
  });

  it("sorts colors by bead count descending then public index", () => {
    const view = viewOf(
      createResultFixture({
        width: 6,
        height: 1,
        transparentPositions: 0,
        colors: [
          { index: 8, beadCount: 1, code: "P08" },
          { index: 3, beadCount: 2, code: "P03" },
          { index: 1, beadCount: 2, code: "P01" },
          { index: 5, beadCount: 1, code: "P05" },
        ],
      }),
    );
    expect(view.colors.map((row) => row.index)).toEqual([1, 3, 5, 8]);
  });

  it("formats singular and plural bead labels", () => {
    const view = viewOf(
      createResultFixture({
        width: 3,
        height: 1,
        transparentPositions: 0,
        colors: [
          { index: 0, beadCount: 1 },
          { index: 1, beadCount: 2 },
        ],
      }),
    );
    expect(view.colors.map((row) => row.beadCountLabel)).toEqual([
      "2 beads",
      "1 bead",
    ]);
  });

  it.each([
    [
      "negative total",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        totals: { ...pattern.totals, totalBeads: -1 },
      }),
    ],
    [
      "mismatched color count",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        totals: { ...pattern.totals, colorCount: 99 },
      }),
    ],
    [
      "mismatched color sum",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        colors: pattern.colors.map((entry, index) =>
          index === 0 ? { ...entry, beadCount: entry.beadCount + 1 } : entry,
        ),
      }),
    ],
    [
      "duplicate color index",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        colors: [
          { ...pattern.colors[0]! },
          { ...pattern.colors[1]!, index: pattern.colors[0]!.index },
        ],
      }),
    ],
    [
      "unsafe brand",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        colors: [
          {
            ...pattern.colors[0]!,
            color: { ...pattern.colors[0]!.color, brand: "Third Party" },
          },
          pattern.colors[1]!,
        ],
      }),
    ],
    [
      "invalid hex",
      (pattern: PublicPatternResult) => ({
        ...pattern,
        colors: [
          {
            ...pattern.colors[0]!,
            color: { ...pattern.colors[0]!.color, hex: "white" },
          },
          pattern.colors[1]!,
        ],
      }),
    ],
  ])("safely rejects %s", (_, change) => {
    expect(
      toPatternResultView(change(createResultFixture()) as PublicPatternResult)
        .ok,
    ).toBe(false);
  });

  it("detects an unknown matrix color only in the controlled development assertion", () => {
    const pattern = createResultFixture();
    const indexes = pattern.matrix.colorIndices.slice();
    indexes[0] = 99;
    expect(
      toPatternResultView({
        ...pattern,
        matrix: { ...pattern.matrix, colorIndices: indexes },
      }).ok,
    ).toBe(false);
  });

  it("accepts the maximum 512 public color rows without reading materials", () => {
    const colors = createManyColors(512);
    const pattern = createResultFixture({
      width: 512,
      height: 1,
      transparentPositions: 0,
      colors,
    });
    const result = toPatternResultView({
      ...pattern,
      materials: Object.freeze(
        pattern.materials.map((entry) => ({
          ...entry,
          packSize: 1000,
          packsRequired: 1,
        })),
      ),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.view.colors).toHaveLength(512);
  });

  it("does not mutate the public result, colors, or matrix", () => {
    const pattern = createResultFixture();
    const matrixBefore = pattern.matrix.colorIndices.slice();
    const colorsBefore = [...pattern.colors];
    toPatternResultView(pattern);
    expect(pattern.matrix.colorIndices).toEqual(matrixBefore);
    expect(pattern.colors).toEqual(colorsBefore);
  });
});
