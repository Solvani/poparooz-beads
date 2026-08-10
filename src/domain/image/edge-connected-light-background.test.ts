import { describe, expect, it } from "vitest";

import type { RgbaImage } from "./image.types";
import { excludeEdgeConnectedLightBackground } from "./edge-connected-light-background";

type Pixel = readonly [number, number, number, number];

const WHITE: Pixel = [255, 255, 255, 255];
const RED: Pixel = [210, 20, 30, 255];

function image(
  width: number,
  height: number,
  pixels: readonly Pixel[],
): RgbaImage {
  return {
    width,
    height,
    data: new Uint8ClampedArray(pixels.flat()),
  };
}

function pixelAt(value: RgbaImage, x: number, y: number): number[] {
  const offset = (y * value.width + x) * 4;
  return [...value.data.slice(offset, offset + 4)];
}

describe("excludeEdgeConnectedLightBackground", () => {
  it("clears an edge-connected white canvas and preserves its colored subject", () => {
    const source = image(3, 3, [
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      RED,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 1)).toEqual(RED);
  });

  it("preserves white detail enclosed by a non-candidate ring", () => {
    const source = image(5, 5, [
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      RED,
      RED,
      RED,
      WHITE,
      WHITE,
      RED,
      WHITE,
      RED,
      WHITE,
      WHITE,
      RED,
      RED,
      RED,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 2, 2)).toEqual(WHITE);
  });

  it("uses the exact light threshold and channel-spread boundary", () => {
    const source = image(4, 2, [
      [248, 249, 254, 255],
      RED,
      [247, 255, 255, 255],
      [248, 248, 255, 255],
      [248, 248, 248, 255],
      RED,
      RED,
      RED,
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 0, 1)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 2, 0)).toEqual([247, 255, 255, 255]);
    expect(pixelAt(result, 3, 0)).toEqual([248, 248, 255, 255]);
  });

  it("preserves a light non-candidate subject touching an edge", () => {
    const source = image(3, 2, [
      WHITE,
      [247, 246, 240, 255],
      WHITE,
      RED,
      RED,
      RED,
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 1, 0)).toEqual([247, 246, 240, 255]);
  });

  it("preserves existing transparent and partially transparent pixels", () => {
    const transparent: Pixel = [19, 20, 21, 0];
    const partial: Pixel = [255, 255, 255, 128];
    const source = image(3, 2, [WHITE, transparent, partial, RED, RED, RED]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 1, 0)).toEqual(transparent);
    expect(pixelAt(result, 2, 0)).toEqual(partial);
  });

  it("fails open when exclusion would remove every quantizable pixel", () => {
    const source = image(2, 2, [WHITE, WHITE, WHITE, WHITE]);

    expect(excludeEdgeConnectedLightBackground(source)).toBe(source);
  });

  it("does not cross a diagonal-only connection", () => {
    const dark: Pixel = [10, 10, 10, 255];
    const source = image(3, 3, [
      WHITE,
      dark,
      dark,
      dark,
      WHITE,
      dark,
      dark,
      dark,
      RED,
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 1)).toEqual(WHITE);
  });

  it("is deterministic, dimension-agnostic, and never mutates its input", () => {
    for (const size of [40, 80, 104]) {
      const pixels = Array.from({ length: size * size }, () => WHITE);
      pixels[Math.floor(pixels.length / 2)] = RED;
      const source = image(size, size, pixels);
      const before = new Uint8ClampedArray(source.data);

      const first = excludeEdgeConnectedLightBackground(source);
      const second = excludeEdgeConnectedLightBackground(source);

      expect(first.width).toBe(size);
      expect(first.height).toBe(size);
      expect(first.data).toEqual(second.data);
      expect(source.data).toEqual(before);
    }
  });
});
