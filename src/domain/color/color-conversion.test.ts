import { describe, expect, it } from "vitest";

import {
  CIELAB_EPSILON,
  CIELAB_KAPPA,
  D65_2_DEGREE_WHITE_POINT,
  ColorConversionError,
  linearRgbToXyzD65,
  normalizedSrgbToLinearRgb,
  rgb8ToLab,
  rgb8ToLinearRgb,
  rgb8ToNormalizedSrgb,
  rgb8ToXyzD65,
  srgbChannelToLinear,
  xyzD65ToLab,
  type ColorConversionErrorCode,
  type LabColor,
  type Rgb8,
} from ".";

function expectColorError(
  callback: () => unknown,
  code: ColorConversionErrorCode,
): void {
  try {
    callback();
    throw new Error("Expected a color conversion error.");
  } catch (error) {
    expect(error).toBeInstanceOf(ColorConversionError);
    expect((error as ColorConversionError).code).toBe(code);
  }
}

function expectLabClose(
  actual: LabColor,
  expected: LabColor,
  tolerance = 1e-4,
): void {
  expect(Math.abs(actual.l - expected.l)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.a - expected.a)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.b - expected.b)).toBeLessThanOrEqual(tolerance);
}

describe("RGB8 validation and normalization", () => {
  it.each([
    { rgb: { r: -1, g: 0, b: 0 }, code: "RGB_CHANNEL_OUT_OF_RANGE" },
    { rgb: { r: 256, g: 0, b: 0 }, code: "RGB_CHANNEL_OUT_OF_RANGE" },
    { rgb: { r: 0.5, g: 0, b: 0 }, code: "INVALID_RGB_CHANNEL" },
    { rgb: { r: Number.NaN, g: 0, b: 0 }, code: "NON_FINITE_COLOR_VALUE" },
    {
      rgb: { r: Number.POSITIVE_INFINITY, g: 0, b: 0 },
      code: "NON_FINITE_COLOR_VALUE",
    },
    { rgb: { r: "1", g: 0, b: 0 }, code: "INVALID_RGB_CHANNEL" },
    { rgb: null, code: "INVALID_RGB_CHANNEL" },
  ] as const)("rejects invalid RGB8 input with $code", ({ rgb, code }) => {
    expectColorError(() => rgb8ToNormalizedSrgb(rgb as unknown as Rgb8), code);
  });

  it("maps 8-bit channels independently without rounding", () => {
    expect(rgb8ToNormalizedSrgb({ r: 0, g: 128, b: 255 })).toEqual({
      r: 0,
      g: 128 / 255,
      b: 1,
    });
  });

  it("does not mutate the RGB8 input", () => {
    const input = Object.freeze({ r: 17, g: 91, b: 203 });
    rgb8ToNormalizedSrgb(input);
    expect(input).toEqual({ r: 17, g: 91, b: 203 });
  });
});

describe("sRGB inverse transfer function", () => {
  it.each([0, 0.04044, 0.04045, 0.04046, 1])(
    "uses the standard branch at %s",
    (channel) => {
      const expected =
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      expect(srgbChannelToLinear(channel)).toBeCloseTo(expected, 15);
    },
  );

  it.each([-0.0001, 1.0001])("rejects out-of-range channel %s", (channel) => {
    expectColorError(
      () => srgbChannelToLinear(channel),
      "INVALID_NORMALIZED_CHANNEL",
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-finite channel %s",
    (channel) => {
      expectColorError(
        () => srgbChannelToLinear(channel),
        "NON_FINITE_COLOR_VALUE",
      );
    },
  );

  it("is monotonically increasing and remains in range", () => {
    let previous = -1;
    for (let index = 0; index <= 1000; index += 1) {
      const result = srgbChannelToLinear(index / 1000);
      expect(result).toBeGreaterThan(previous);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
      previous = result;
    }
  });

  it("validates all normalized channels", () => {
    expectColorError(
      () => normalizedSrgbToLinearRgb({ r: 0, g: 2, b: 0 }),
      "INVALID_NORMALIZED_CHANNEL",
    );
  });
});

describe("Linear RGB to XYZ D65", () => {
  it.each([
    [
      { r: 0, g: 0, b: 0 },
      { x: 0, y: 0, z: 0 },
    ],
    [
      { r: 1, g: 1, b: 1 },
      { x: 0.95047, y: 1.0000001, z: 1.08883 },
    ],
    [
      { r: 1, g: 0, b: 0 },
      { x: 0.4124564, y: 0.2126729, z: 0.0193339 },
    ],
    [
      { r: 0, g: 1, b: 0 },
      { x: 0.3575761, y: 0.7151522, z: 0.119192 },
    ],
    [
      { r: 0, g: 0, b: 1 },
      { x: 0.1804375, y: 0.072175, z: 0.9503041 },
    ],
  ] as const)("applies each frozen matrix row to %o", (rgb, expected) => {
    expect(linearRgbToXyzD65(rgb)).toEqual(expected);
  });

  it("returns finite XYZ for a mixed color without mutating input", () => {
    const input = Object.freeze({ r: 0.125, g: 0.5, b: 0.875 });
    const result = linearRgbToXyzD65(input);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
    expect(input).toEqual({ r: 0.125, g: 0.5, b: 0.875 });
  });

  it.each([
    [{ r: -0.1, g: 0, b: 0 }, "INVALID_LINEAR_RGB"],
    [{ r: 0, g: 1.1, b: 0 }, "INVALID_LINEAR_RGB"],
    [{ r: 0, g: Number.NaN, b: 0 }, "NON_FINITE_COLOR_VALUE"],
  ] as const)("rejects invalid linear RGB", (rgb, code) => {
    expectColorError(() => linearRgbToXyzD65(rgb), code);
  });
});

describe("XYZ D65 to CIELAB", () => {
  it("maps black and the D65 reference white", () => {
    expectLabClose(xyzD65ToLab({ x: 0, y: 0, z: 0 }), {
      l: 0,
      a: 0,
      b: 0,
    });
    expectLabClose(xyzD65ToLab(D65_2_DEGREE_WHITE_POINT), {
      l: 100,
      a: 0,
      b: 0,
    });
  });

  it("uses the linear branch at epsilon and the cube-root branch above it", () => {
    const atThreshold = xyzD65ToLab({
      x: CIELAB_EPSILON * D65_2_DEGREE_WHITE_POINT.x,
      y: CIELAB_EPSILON,
      z: CIELAB_EPSILON * D65_2_DEGREE_WHITE_POINT.z,
    });
    const expectedL = 116 * ((CIELAB_KAPPA * CIELAB_EPSILON + 16) / 116) - 16;
    expect(atThreshold.l).toBeCloseTo(expectedL, 14);

    const above = CIELAB_EPSILON + Number.EPSILON;
    const aboveThreshold = xyzD65ToLab({
      x: above * D65_2_DEGREE_WHITE_POINT.x,
      y: above,
      z: above * D65_2_DEGREE_WHITE_POINT.z,
    });
    expect(aboveThreshold.l).toBeCloseTo(116 * Math.cbrt(above) - 16, 14);
  });

  it.each([
    [{ x: -1, y: 0, z: 0 }, "INVALID_XYZ"],
    [{ x: 0, y: Number.NaN, z: 0 }, "NON_FINITE_COLOR_VALUE"],
    [{ x: 0, y: 0, z: Number.POSITIVE_INFINITY }, "NON_FINITE_COLOR_VALUE"],
  ] as const)("rejects invalid XYZ", (xyz, code) => {
    expectColorError(() => xyzD65ToLab(xyz), code);
  });
});

describe("RGB8 composition and golden references", () => {
  it.each([
    [
      { r: 0, g: 0, b: 0 },
      { l: 0, a: 0, b: 0 },
    ],
    [
      { r: 255, g: 255, b: 255 },
      { l: 100, a: 0, b: 0 },
    ],
    [
      { r: 255, g: 0, b: 0 },
      { l: 53.2408, a: 80.0925, b: 67.2032 },
    ],
    [
      { r: 0, g: 255, b: 0 },
      { l: 87.7347, a: -86.1827, b: 83.1793 },
    ],
    [
      { r: 0, g: 0, b: 255 },
      { l: 32.297, a: 79.1875, b: -107.8602 },
    ],
    [
      { r: 128, g: 128, b: 128 },
      { l: 53.585, a: 0, b: 0 },
    ],
  ] as const)("matches the D65 reference for RGB %o", (rgb, expected) => {
    expectLabClose(rgb8ToLab(rgb), expected);
  });

  it("reuses the same staged conversion result", () => {
    const input = { r: 19, g: 127, b: 241 };
    expect(rgb8ToXyzD65(input)).toEqual(
      linearRgbToXyzD65(rgb8ToLinearRgb(input)),
    );
    expect(rgb8ToLab(input)).toEqual(xyzD65ToLab(rgb8ToXyzD65(input)));
  });

  it("is exactly deterministic across repeated calls", () => {
    const input = Object.freeze({ r: 31, g: 127, b: 223 });
    const first = rgb8ToLab(input);
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(rgb8ToLab(input)).toEqual(first);
    }
    expect(input).toEqual({ r: 31, g: 127, b: 223 });
  });

  it("normalizes exact negative zero in public results", () => {
    const results = [
      rgb8ToNormalizedSrgb({ r: 0, g: 0, b: 0 }),
      rgb8ToLinearRgb({ r: 0, g: 0, b: 0 }),
      rgb8ToXyzD65({ r: 0, g: 0, b: 0 }),
      rgb8ToLab({ r: 0, g: 0, b: 0 }),
    ];
    expect(
      results.flatMap(Object.values).some((value) => Object.is(value, -0)),
    ).toBe(false);
  });
});

describe("color conversion properties", () => {
  it("keeps grayscale a and b near zero and L strictly increasing", () => {
    let previousL = -1;
    for (let channel = 0; channel <= 255; channel += 1) {
      const lab = rgb8ToLab({ r: channel, g: channel, b: channel });
      expect(Math.abs(lab.a)).toBeLessThan(2e-5);
      expect(Math.abs(lab.b)).toBeLessThan(2e-5);
      expect(lab.l).toBeGreaterThan(previousL);
      previousL = lab.l;
    }
  });

  it("gives pure green a higher L than pure blue", () => {
    expect(rgb8ToLab({ r: 0, g: 255, b: 0 }).l).toBeGreaterThan(
      rgb8ToLab({ r: 0, g: 0, b: 255 }).l,
    );
  });

  it("returns finite Lab for a representative RGB8 lattice", () => {
    const channels = [0, 17, 51, 85, 119, 153, 187, 221, 255];
    for (const r of channels) {
      for (const g of channels) {
        for (const b of channels) {
          expect(
            Object.values(rgb8ToLab({ r, g, b })).every(Number.isFinite),
          ).toBe(true);
        }
      }
    }
  });
});
