import { describe, expect, it } from "vitest";

import { deltaE2000 } from "../../domain/color/color-distance";
import {
  matchNearestColor,
  prepareColorMatchCandidates,
} from "../../domain/color/generation-color-matching";
import type { QuantizedImage } from "../../domain/quantization/quantization.types";
import { createApprovedColorSetProvider } from "../../runtime/color-set/approved-color-set";
import { adaptColorSetToGeneration } from "../../runtime/generation-color-set/color-set-to-generation.adapter";
import { projectGenerationPaletteForColorSet } from "../../runtime/generation-color-set/generation-palette-projection";
import { adaptRuntimePaletteToGeneration } from "../../runtime/generation-palette/runtime-to-generation-palette.adapter";
import { createApprovedRuntimePaletteProvider } from "../../runtime/palette/approved-runtime-palette";
import {
  evaluateBeadSetCandidateQuality,
  weightedPercentile,
} from "./bead-set-quality-evaluator";

const PALETTE = adaptRuntimePaletteToGeneration(
  createApprovedRuntimePaletteProvider().getSnapshot(),
);
const COLOR_SETS = adaptColorSetToGeneration(
  createApprovedColorSetProvider().getSnapshot(),
);

function quantized(
  entries: readonly { readonly code: string; readonly count: number }[],
  transparentPixelCount = 0,
): QuantizedImage {
  const colors = entries.map((entry, index) => {
    const color = PALETTE.colors.find(
      (candidate) => candidate.code === entry.code,
    );
    if (color === undefined)
      throw new Error(`Missing test color ${entry.code}.`);
    return Object.freeze({
      index,
      rgb: Object.freeze({
        r: color.rgb[0],
        g: color.rgb[1],
        b: color.rgb[2],
      }),
      lab: Object.freeze({
        l: color.lab[0],
        a: color.lab[1],
        b: color.lab[2],
      }),
      pixelCount: entry.count,
    });
  });
  const opaquePixelCount = entries.reduce(
    (total, entry) => total + entry.count,
    0,
  );
  const colorIndices = new Uint16Array(
    opaquePixelCount + transparentPixelCount,
  );
  let offset = 0;
  entries.forEach((entry, index) => {
    colorIndices.fill(index, offset, offset + entry.count);
    offset += entry.count;
  });
  colorIndices.fill(65535, offset);
  return Object.freeze({
    width: colorIndices.length,
    height: 1,
    colors: Object.freeze(colors),
    colorIndices,
    transparentIndex: 65535,
    opaquePixelCount,
    transparentPixelCount,
  });
}

describe("weightedPercentile", () => {
  it("uses deterministic nearest-rank cumulative-weight boundaries", () => {
    const values = [
      { value: 0, weight: 95, order: 0 },
      { value: 4, weight: 5, order: 1 },
    ];
    expect(weightedPercentile(values, 0.95)).toBe(0);
    expect(weightedPercentile(values, 0.96)).toBe(4);
    expect(weightedPercentile([...values].reverse(), 0.95)).toBe(0);
  });

  it("rejects empty, non-positive, non-integer, and unsafe weights", () => {
    expect(() => weightedPercentile([], 0.95)).toThrow(RangeError);
    expect(() =>
      weightedPercentile([{ value: 1, weight: 0, order: 0 }], 0.95),
    ).toThrow(RangeError);
    expect(() =>
      weightedPercentile([{ value: 1, weight: 1.5, order: 0 }], 0.95),
    ).toThrow(RangeError);
    expect(() =>
      weightedPercentile(
        [
          { value: 1, weight: Number.MAX_SAFE_INTEGER, order: 0 },
          { value: 2, weight: 1, order: 1 },
        ],
        0.95,
      ),
    ).toThrow(RangeError);
  });
});

describe("evaluateBeadSetCandidateQuality", () => {
  it("evaluates exactly the six approved profiles in explicit size order", () => {
    const result = evaluateBeadSetCandidateQuality(
      quantized([{ code: "A4", count: 1 }]),
      PALETTE,
      COLOR_SETS,
    );
    expect(result.candidates.map(({ profileSize }) => profileSize)).toEqual([
      24, 48, 72, 120, 168, 221,
    ]);
    expect(result.candidates.map(({ profileId }) => profileId)).toEqual([
      "poparooz-set-24",
      "poparooz-set-48",
      "poparooz-set-72",
      "poparooz-set-120",
      "poparooz-set-168",
      "poparooz-set-221",
    ]);
  });

  it("weights mean, p95, and maximum metrics by occupied cluster pixels", () => {
    const input = quantized([
      { code: "A4", count: 95 },
      { code: "A20", count: 5 },
    ]);
    const result = evaluateBeadSetCandidateQuality(input, PALETTE, COLOR_SETS);
    const profile24 = result.candidates[0]!;
    const target = input.colors[1]!.lab;
    const projected = projectGenerationPaletteForColorSet(
      PALETTE,
      COLOR_SETS.profiles[0]!,
    );
    const match = matchNearestColor(
      target,
      prepareColorMatchCandidates(projected),
    );
    const directDistance = deltaE2000(target, {
      l: match.color.lab[0],
      a: match.color.lab[1],
      b: match.color.lab[2],
    });

    expect(profile24.totalWeightedPixelCount).toBe(100);
    expect(profile24.weightedMeanPaletteDeltaE00).toBeCloseTo(
      (directDistance * 5) / 100,
      12,
    );
    expect(profile24.weightedP95PaletteDeltaE00).toBe(0);
    expect(profile24.maximumPaletteDeltaE00).toBeCloseTo(directDistance, 12);
  });

  it("excludes transparent positions and calculates relative-to-221 metrics", () => {
    const result = evaluateBeadSetCandidateQuality(
      quantized(
        [
          { code: "A4", count: 94 },
          { code: "A20", count: 6 },
        ],
        20,
      ),
      PALETTE,
      COLOR_SETS,
    );
    const profile24 = result.candidates[0]!;
    const reference = result.candidates.at(-1)!;

    expect(result.occupiedPixelCount).toBe(100);
    expect(result.transparentPixelCount).toBe(20);
    expect(profile24.totalWeightedPixelCount).toBe(100);
    expect(profile24.weightedP95PaletteDeltaE00).toBeGreaterThan(0);
    expect(reference.profileSize).toBe(221);
    expect(reference.weightedMeanPaletteDeltaE00).toBe(0);
    expect(reference.weightedP95PaletteDeltaE00).toBe(0);
    expect(reference.meanDeltaVs221).toBe(0);
    expect(reference.p95DeltaVs221).toBe(0);
    expect(profile24.meanDeltaVs221).toBe(
      profile24.weightedMeanPaletteDeltaE00 -
        reference.weightedMeanPaletteDeltaE00,
    );
    expect(profile24.p95DeltaVs221).toBe(
      profile24.weightedP95PaletteDeltaE00 -
        reference.weightedP95PaletteDeltaE00,
    );
  });

  it("returns byte-equivalent frozen records on repeated evaluation", () => {
    const input = quantized([
      { code: "A4", count: 4 },
      { code: "A10", count: 3 },
      { code: "A20", count: 2 },
    ]);
    const first = evaluateBeadSetCandidateQuality(input, PALETTE, COLOR_SETS);
    const second = evaluateBeadSetCandidateQuality(input, PALETTE, COLOR_SETS);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.candidates)).toBe(true);
    expect(first.candidates.every(Object.isFrozen)).toBe(true);
  });

  it("fails closed when the approved profile list is incomplete", () => {
    expect(() =>
      evaluateBeadSetCandidateQuality(
        quantized([{ code: "A4", count: 1 }]),
        PALETTE,
        {
          ...COLOR_SETS,
          profiles: COLOR_SETS.profiles.slice(0, 5),
        },
      ),
    ).toThrow("approved candidate profile set");
  });
});
