import { describe, expect, it } from "vitest";

import { resizeRgbaImage } from "./rgba-resize";
import type { RgbaImage } from "./image.types";

describe("deterministic RGBA resize", () => {
  it("preserves a 1:1 image exactly while returning a copy", () => {
    const source = image(2, 1, [1, 2, 3, 4, 5, 6, 7, 8]);
    const result = resizeRgbaImage(source, 2, 1);
    expect(result.data).toEqual(source.data);
    expect(result.data).not.toBe(source.data);
  });

  it("area-averages a known opaque 2x2 image", () => {
    const source = image(
      2,
      2,
      [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255],
    );
    expect([...resizeRgbaImage(source, 1, 1).data]).toEqual([
      128, 128, 128, 255,
    ]);
  });

  it("weights colors by alpha during downsampling", () => {
    const source = image(2, 1, [255, 0, 0, 255, 0, 0, 255, 0]);
    expect([...resizeRgbaImage(source, 1, 1).data]).toEqual([255, 0, 0, 128]);
  });

  it("normalizes fully transparent RGB to zero", () => {
    const source = image(2, 1, [99, 88, 77, 0, 1, 2, 3, 0]);
    expect([...resizeRgbaImage(source, 1, 1).data]).toEqual([0, 0, 0, 0]);
  });

  it("bilinearly expands a single pixel deterministically", () => {
    const source = image(1, 1, [12, 34, 56, 128]);
    expect([...resizeRgbaImage(source, 2, 2).data]).toEqual([
      12, 34, 56, 128, 12, 34, 56, 128, 12, 34, 56, 128, 12, 34, 56, 128,
    ]);
  });

  it("returns identical bytes on repeated runs", () => {
    const source = image(
      3,
      2,
      [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24,
      ],
    );
    expect(resizeRgbaImage(source, 2, 1).data).toEqual(
      resizeRgbaImage(source, 2, 1).data,
    );
  });

  it("does not modify its input", () => {
    const source = image(2, 1, [1, 2, 3, 4, 5, 6, 7, 8]);
    const original = new Uint8ClampedArray(source.data);
    resizeRgbaImage(source, 1, 1);
    expect(source.data).toEqual(original);
  });

  it("rejects RGBA length mismatches", () => {
    expect(() =>
      resizeRgbaImage(
        { width: 2, height: 2, data: new Uint8ClampedArray(4) },
        1,
        1,
      ),
    ).toThrow(expect.objectContaining({ code: "INVALID_IMAGE_DIMENSIONS" }));
  });
});

function image(width: number, height: number, values: number[]): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(values) };
}
