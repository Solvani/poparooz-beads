import { describe, expect, it } from "vitest";

import { excludeStrictEdgeConnectedLightBackground } from "./edge-connected-light-background";
import { refineOpaqueSourceMatteBackground } from "./opaque-source-matte-background";
import type { RgbaImage } from "./image.types";

type Pixel = readonly [number, number, number, number];

const WHITE: Pixel = [255, 255, 255, 255];
const BLACK: Pixel = [0, 0, 0, 255];
const TRANSPARENT: Pixel = [0, 0, 0, 0];

describe("opaque source matte background refinement", () => {
  it("removes a white-to-247-to-242 matte transition and retains black", () => {
    const original = image(4, 1, [WHITE, gray(247), gray(242), BLACK]);
    const result = refine(original);

    expect(pixels(result)).toEqual([
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      BLACK,
    ]);
  });

  it("removes a neutral matte transition and retains cream", () => {
    const cream: Pixel = [255, 245, 220, 255];
    const original = image(3, 1, [WHITE, gray(247), cream]);

    expect(pixels(refine(original))).toEqual([TRANSPARENT, TRANSPARENT, cream]);
  });

  it("retains legitimate RGB240 gray and darker content", () => {
    const original = image(3, 1, [WHITE, gray(240), BLACK]);
    expect(pixels(refine(original))).toEqual([TRANSPARENT, gray(240), BLACK]);
  });

  it("uses 242 as the inclusive lower boundary and rejects 241 and 240", () => {
    for (const [value, excluded] of [
      [242, true],
      [241, false],
      [240, false],
    ] as const) {
      const result = refine(image(3, 1, [WHITE, gray(value), BLACK]));
      expect(pixelAt(result, 1, 0)).toEqual(
        excluded ? TRANSPARENT : gray(value),
      );
    }
  });

  it("does not grow through a large flat RGB245 authored region", () => {
    const original = image(7, 1, [
      WHITE,
      gray(245),
      gray(245),
      gray(245),
      gray(245),
      gray(245),
      BLACK,
    ]);

    expect(pixels(refine(original))).toEqual([
      TRANSPARENT,
      gray(245),
      gray(245),
      gray(245),
      gray(245),
      gray(245),
      BLACK,
    ]);
  });

  it("retains white enclosed by a dark ring", () => {
    const original = image(5, 5, [
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      BLACK,
      BLACK,
      BLACK,
      WHITE,
      WHITE,
      BLACK,
      WHITE,
      BLACK,
      WHITE,
      WHITE,
      BLACK,
      BLACK,
      BLACK,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
    ]);

    expect(pixelAt(refine(original), 2, 2)).toEqual(WHITE);
  });

  it("does not cross diagonal-only neutral contact", () => {
    const original = image(3, 3, [
      WHITE,
      BLACK,
      BLACK,
      BLACK,
      gray(242),
      BLACK,
      BLACK,
      BLACK,
      BLACK,
    ]);

    expect(pixelAt(refine(original), 1, 1)).toEqual(gray(242));
  });

  it("preserves the strict full-white fail-open result", () => {
    const original = image(2, 2, [WHITE, WHITE, WHITE, WHITE]);
    const strict = excludeStrictEdgeConnectedLightBackground(original);

    expect(strict).toBe(original);
    expect(refineOpaqueSourceMatteBackground(original, strict)).toBe(strict);
  });

  it("bypasses sources that already contain alpha", () => {
    const original = image(3, 1, [[255, 255, 255, 0], gray(242), BLACK]);
    const strict = image(3, 1, [TRANSPARENT, gray(242), BLACK]);

    expect(refineOpaqueSourceMatteBackground(original, strict)).toBe(strict);
  });

  it("keeps opaque PNG- and JPEG-equivalent rasters deterministic", () => {
    const pngRaster = image(4, 1, [WHITE, gray(247), gray(242), BLACK]);
    const jpegRaster = image(4, 1, [WHITE, gray(247), gray(242), BLACK]);

    expect(refine(pngRaster)).toEqual(refine(jpegRaster));
  });

  it("preserves non-neutral colored matte", () => {
    const greenMatte: Pixel = [242, 250, 242, 255];
    const cyanMatte: Pixel = [242, 250, 250, 255];
    const original = image(4, 1, [WHITE, greenMatte, cyanMatte, BLACK]);

    expect(pixels(refine(original))).toEqual([
      TRANSPARENT,
      greenMatte,
      cyanMatte,
      BLACK,
    ]);
  });

  it("uses transition semantics rather than a fixed fringe depth", () => {
    const short = image(4, 1, [WHITE, gray(247), gray(242), BLACK]);
    const deep = image(8, 1, [
      WHITE,
      gray(247),
      gray(246),
      gray(245),
      gray(244),
      gray(243),
      gray(242),
      BLACK,
    ]);

    expect(pixels(refine(short))).toEqual([
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      BLACK,
    ]);
    expect(pixels(refine(deep))).toEqual([
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      BLACK,
    ]);
  });

  it("is deterministic and immutable at downstream target dimensions", () => {
    for (const size of [40, 80, 104]) {
      const values = Array.from({ length: size * size }, () => WHITE);
      const center = Math.floor(size / 2);
      values[center * size + center - 2] = gray(247);
      values[center * size + center - 1] = gray(242);
      values[center * size + center] = BLACK;
      const original = image(size, size, values);
      const before = new Uint8ClampedArray(original.data);

      const first = refine(original);
      const second = refine(original);

      expect(first).toMatchObject({ width: size, height: size });
      expect(first.data).toEqual(second.data);
      expect(original.data).toEqual(before);
    }
  });
});

function refine(original: RgbaImage): RgbaImage {
  return refineOpaqueSourceMatteBackground(
    original,
    excludeStrictEdgeConnectedLightBackground(original),
  );
}

function image(
  width: number,
  height: number,
  values: readonly Pixel[],
): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(values.flat()) };
}

function gray(value: number): Pixel {
  return [value, value, value, 255];
}

function pixels(value: RgbaImage): Pixel[] {
  const result: Pixel[] = [];
  for (let offset = 0; offset < value.data.length; offset += 4) {
    result.push([
      value.data[offset]!,
      value.data[offset + 1]!,
      value.data[offset + 2]!,
      value.data[offset + 3]!,
    ]);
  }
  return result;
}

function pixelAt(value: RgbaImage, x: number, y: number): Pixel {
  const offset = (y * value.width + x) * 4;
  return [
    value.data[offset]!,
    value.data[offset + 1]!,
    value.data[offset + 2]!,
    value.data[offset + 3]!,
  ];
}
