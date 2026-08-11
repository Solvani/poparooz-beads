import { describe, expect, it } from "vitest";

import { resizeRgbaImage } from "./rgba-resize";
import { applyTransparentAlphaOccupancy } from "./transparent-alpha-occupancy";
import type { RgbaImage } from "./image.types";

const THRESHOLD = 32;

describe("transparent Alpha occupancy", () => {
  it("applies the exact 32/33 boundary and canonicalizes the output", () => {
    const source = image(
      5,
      1,
      [
        91, 92, 93, 0, 81, 82, 83, 16, 71, 72, 73, 32, 61, 62, 63, 33, 51, 52,
        53, 255,
      ],
    );

    expect([...applyTransparentAlphaOccupancy(source, THRESHOLD).data]).toEqual(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 61, 62, 63, 255, 51, 52, 53, 255],
    );
  });

  it("preserves retained RGB, dimensions, and input immutability", () => {
    const source = image(2, 1, [20, 180, 80, 33, 40, 50, 60, 32]);
    const original = new Uint8ClampedArray(source.data);

    const result = applyTransparentAlphaOccupancy(source, THRESHOLD);

    expect(result).toEqual(image(2, 1, [20, 180, 80, 255, 0, 0, 0, 0]));
    expect(result.width).toBe(source.width);
    expect(result.height).toBe(source.height);
    expect(source.data).toEqual(original);
  });

  it("returns the original image when it is already binary", () => {
    const source = image(2, 1, [0, 0, 0, 0, 20, 180, 80, 255]);
    expect(applyTransparentAlphaOccupancy(source, THRESHOLD)).toBe(source);
  });

  it("is deterministic", () => {
    const source = image(
      3,
      1,
      [20, 180, 80, 17, 20, 180, 80, 33, 1, 2, 3, 128],
    );
    expect(applyTransparentAlphaOccupancy(source, THRESHOLD)).toEqual(
      applyTransparentAlphaOccupancy(source, THRESHOLD),
    );
  });

  it("returns a canonical empty image when all positions are excluded", () => {
    const source = image(2, 1, [1, 2, 3, 16, 4, 5, 6, 32]);
    expect([...applyTransparentAlphaOccupancy(source, THRESHOLD).data]).toEqual(
      [0, 0, 0, 0, 0, 0, 0, 0],
    );
  });

  it("rejects invalid threshold bytes", () => {
    const source = image(1, 1, [1, 2, 3, 255]);
    for (const value of [-1, 256, 1.5, Number.NaN]) {
      expect(() => applyTransparentAlphaOccupancy(source, value)).toThrow(
        RangeError,
      );
    }
  });

  it("preserves intentional transparent PNG-style edges above 32", () => {
    const source = image(
      4,
      1,
      [20, 180, 80, 16, 20, 180, 80, 32, 20, 180, 80, 33, 20, 180, 80, 128],
    );
    expect([...applyTransparentAlphaOccupancy(source, THRESHOLD).data]).toEqual(
      [0, 0, 0, 0, 0, 0, 0, 0, 20, 180, 80, 255, 20, 180, 80, 255],
    );
  });

  it.each([
    ["40-size vertical line", "vertical", 40, 40],
    ["40-size diagonal", "diagonal", 40, 40],
    ["80-size isolated dot", "dot", 80, 1],
    ["40-size narrow colored feature", "feature", 40, 16],
  ] as const)(
    "retains the audited %s coverage",
    (_label, kind, target, expected) => {
      const resized = resizeRgbaImage(shape(kind), target, target);
      const result = applyTransparentAlphaOccupancy(resized, THRESHOLD);
      expect(occupiedCount(result)).toBe(expected);
    },
  );
});

function image(width: number, height: number, values: number[]): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(values) };
}

function occupiedCount(value: RgbaImage): number {
  let count = 0;
  for (let offset = 3; offset < value.data.length; offset += 4) {
    if (value.data[offset] === 255) count += 1;
  }
  return count;
}

function shape(kind: "vertical" | "diagonal" | "dot" | "feature"): RgbaImage {
  const size = 208;
  const data = new Uint8ClampedArray(size * size * 4);
  const setPixel = (
    x: number,
    y: number,
    rgb: readonly [number, number, number],
  ) => {
    const offset = (y * size + x) * 4;
    data[offset] = rgb[0];
    data[offset + 1] = rgb[1];
    data[offset + 2] = rgb[2];
    data[offset + 3] = 255;
  };

  if (kind === "vertical") {
    for (let y = 0; y < size; y += 1) setPixel(104, y, [0, 0, 0]);
  } else if (kind === "diagonal") {
    for (let position = 0; position < size; position += 1) {
      setPixel(position, position, [0, 0, 0]);
    }
  } else if (kind === "dot") {
    setPixel(104, 104, [0, 0, 0]);
  } else {
    for (let y = 80; y < 128; y += 1) {
      for (let x = 103; x < 105; x += 1) setPixel(x, y, [20, 180, 80]);
    }
  }
  return { width: size, height: size, data };
}
