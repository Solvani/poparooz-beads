import { describe, expect, it } from "vitest";

import {
  ColorMatchingError,
  deltaE76,
  deltaE2000,
  type ColorMatchingErrorCode,
  type LabColor,
} from ".";
import { CIEDE2000_REFERENCE_CASES } from "./fixtures/ciede2000-reference.fixture";

function expectMatchingError(
  callback: () => unknown,
  code: ColorMatchingErrorCode,
): void {
  try {
    callback();
    throw new Error("Expected a color matching error.");
  } catch (error) {
    expect(error).toBeInstanceOf(ColorMatchingError);
    expect((error as ColorMatchingError).code).toBe(code);
  }
}

describe("deltaE2000", () => {
  it.each(CIEDE2000_REFERENCE_CASES)(
    "matches Sharma reference pair %#",
    (l1, a1, b1, l2, a2, b2, expected) => {
      const actual = deltaE2000(
        { l: l1, a: a1, b: b1 },
        { l: l2, a: a2, b: b2 },
      );
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1e-4);
    },
  );

  it.each([
    { l: 0, a: 0, b: 0 },
    { l: 50, a: 0, b: 0 },
    { l: 50, a: 1e-12, b: -1e-12 },
    { l: 60, a: 80, b: -70 },
    { l: 100, a: -120, b: 130 },
  ])("is zero for identical color $l,$a,$b", (color) => {
    const distance = deltaE2000(color, color);
    expect(distance).toBe(0);
    expect(Object.is(distance, -0)).toBe(false);
  });

  it.each([
    [
      { l: 50, a: 2.5, b: 0 },
      { l: 50, a: 0, b: -2.5 },
    ],
    [
      { l: 40, a: 50, b: 0.0001 },
      { l: 42, a: 50, b: -0.0001 },
    ],
    [
      { l: 50, a: 0, b: 0 },
      { l: 65, a: 20, b: -30 },
    ],
  ])("is symmetric for representative pair %#", (left, right) => {
    expect(deltaE2000(left, right)).toBeCloseTo(deltaE2000(right, left), 12);
  });

  it.each(CIEDE2000_REFERENCE_CASES)(
    "is symmetric for reference pair %#",
    (l1, a1, b1, l2, a2, b2) => {
      const left = { l: l1, a: a1, b: b1 };
      const right = { l: l2, a: a2, b: b2 };
      expect(deltaE2000(left, right)).toBeCloseTo(deltaE2000(right, left), 12);
    },
  );

  it("handles hue wrapping around zero and 360 degrees", () => {
    const nearZero = { l: 50, a: 40, b: 0.0001 };
    const near360 = { l: 50, a: 40, b: -0.0001 };
    expect(deltaE2000(nearZero, near360)).toBeLessThan(0.001);
  });

  it("handles one or two zero-chroma colors without NaN", () => {
    expect(
      Number.isFinite(
        deltaE2000({ l: 50, a: 0, b: 0 }, { l: 50, a: 20, b: 30 }),
      ),
    ).toBe(true);
    expect(deltaE2000({ l: 50, a: 0, b: 0 }, { l: 60, a: 0, b: 0 })).toBe(
      9.470578563636415,
    );
  });

  it("is finite, non-negative, deterministic, and input preserving", () => {
    const left = Object.freeze({ l: 42, a: -17, b: 63 });
    const right = Object.freeze({ l: 71, a: 44, b: -29 });
    const first = deltaE2000(left, right);
    expect(Number.isFinite(first)).toBe(true);
    expect(first).toBeGreaterThanOrEqual(0);
    for (let index = 0; index < 100; index += 1) {
      expect(deltaE2000(left, right)).toBe(first);
    }
    expect(left).toEqual({ l: 42, a: -17, b: 63 });
    expect(right).toEqual({ l: 71, a: 44, b: -29 });
  });

  it("is finite and non-negative across a representative Lab lattice", () => {
    const lightnessValues = [0, 25, 50, 75, 100];
    const chromaticValues = [-128, -0.001, 0, 0.001, 127];
    const reference = { l: 53, a: 7, b: -11 };
    for (const l of lightnessValues) {
      for (const a of chromaticValues) {
        for (const b of chromaticValues) {
          const distance = deltaE2000({ l, a, b }, reference);
          expect(Number.isFinite(distance)).toBe(true);
          expect(distance).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("Lab validation", () => {
  it.each([
    null,
    { l: "50", a: 0, b: 0 },
    { l: -1, a: 0, b: 0 },
    { l: 101, a: 0, b: 0 },
    { l: Number.NaN, a: 0, b: 0 },
    { l: 50, a: Number.POSITIVE_INFINITY, b: 0 },
    { l: 50, a: 0, b: Number.NEGATIVE_INFINITY },
  ])("rejects invalid Lab value %#", (color) => {
    expectMatchingError(
      () => deltaE2000(color as unknown as LabColor, { l: 50, a: 0, b: 0 }),
      "INVALID_LAB_COLOR",
    );
  });
});

describe("deltaE76 diagnostics", () => {
  it("calculates the Euclidean Lab baseline", () => {
    expect(deltaE76({ l: 50, a: 2, b: 3 }, { l: 54, a: 5, b: 15 })).toBe(13);
  });

  it("is zero, symmetric, and does not return negative zero", () => {
    const left = { l: 20, a: -5, b: 9 };
    const right = { l: 72, a: 16, b: -44 };
    expect(deltaE76(left, left)).toBe(0);
    expect(Object.is(deltaE76(left, left), -0)).toBe(false);
    expect(deltaE76(left, right)).toBe(deltaE76(right, left));
  });

  it("uses the same strict Lab validation", () => {
    expectMatchingError(
      () => deltaE76({ l: 50, a: Number.NaN, b: 0 }, { l: 50, a: 0, b: 0 }),
      "INVALID_LAB_COLOR",
    );
  });
});
