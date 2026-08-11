import { describe, expect, it } from "vitest";

import type { RgbaImage } from "./image.types";
import {
  excludeEdgeConnectedLightBackground,
  excludeStrictEdgeConnectedLightBackground,
} from "./edge-connected-light-background";

type Pixel = readonly [number, number, number, number];

const WHITE: Pixel = [255, 255, 255, 255];
const RED: Pixel = [210, 20, 30, 255];
const DARK: Pixel = [30, 30, 30, 255];

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

describe("excludeStrictEdgeConnectedLightBackground", () => {
  it("masks only a strict opaque source canvas and preserves colored content", () => {
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
    const before = new Uint8ClampedArray(source.data);

    const result = excludeStrictEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 1)).toEqual(RED);
    expect(source.data).toEqual(before);
  });

  it("does not apply the post-resize H02 fringe rule at source resolution", () => {
    const source = image(3, 1, [WHITE, [235, 235, 235, 255], DARK]);

    const result = excludeStrictEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 0)).toEqual([235, 235, 235, 255]);
    expect(pixelAt(result, 2, 0)).toEqual(DARK);
  });

  it("does not use source transparency as a seed and preserves partial alpha", () => {
    const transparent: Pixel = [19, 20, 21, 0];
    const partial: Pixel = [255, 255, 255, 128];
    const source = image(3, 3, [
      transparent,
      partial,
      transparent,
      transparent,
      WHITE,
      transparent,
      transparent,
      DARK,
      transparent,
    ]);

    const result = excludeStrictEdgeConnectedLightBackground(source);

    expect(result).toBe(source);
    expect(pixelAt(result, 0, 0)).toEqual(transparent);
    expect(pixelAt(result, 1, 0)).toEqual(partial);
    expect(pixelAt(result, 1, 1)).toEqual(WHITE);
  });

  it("preserves an enclosed white center, cream fill, and black outline", () => {
    const cream: Pixel = [255, 245, 220, 255];
    const source = image(5, 5, [
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      DARK,
      DARK,
      DARK,
      WHITE,
      WHITE,
      DARK,
      WHITE,
      DARK,
      WHITE,
      WHITE,
      DARK,
      cream,
      DARK,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
      WHITE,
    ]);

    const result = excludeStrictEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 2, 2)).toEqual(WHITE);
    expect(pixelAt(result, 1, 2)).toEqual(DARK);
    expect(pixelAt(result, 2, 3)).toEqual(cream);
  });

  it("characterizes opaque white artwork touching the source edge as canvas-connected", () => {
    const source = image(3, 2, [WHITE, WHITE, RED, WHITE, RED, RED]);

    const result = excludeStrictEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 0, 1)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 2, 0)).toEqual(RED);
  });

  it("fails open for a full-white source", () => {
    const source = image(2, 2, [WHITE, WHITE, WHITE, WHITE]);

    expect(excludeStrictEdgeConnectedLightBackground(source)).toBe(source);
  });

  it("is deterministic and immutable at every supported Pattern size", () => {
    for (const size of [40, 80, 104]) {
      const pixels = Array.from({ length: size * size }, () => WHITE);
      pixels[Math.floor(pixels.length / 2)] = RED;
      const source = image(size, size, pixels);
      const before = new Uint8ClampedArray(source.data);

      const first = excludeStrictEdgeConnectedLightBackground(source);
      const second = excludeStrictEdgeConnectedLightBackground(source);

      expect(first).toMatchObject({ width: size, height: size });
      expect(first.data).toEqual(second.data);
      expect(source.data).toEqual(before);
    }
  });
});

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

  it("removes a reproduced 235 resize fringe beside a darker subject", () => {
    const source = image(3, 1, [WHITE, [235, 235, 235, 255], DARK]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 2, 0)).toEqual(DARK);
  });

  it("preserves a flat 235 light-gray subject without a darker inward transition", () => {
    const source = image(4, 1, [
      WHITE,
      [235, 235, 235, 255],
      [235, 235, 235, 255],
      [235, 235, 235, 255],
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 0)).toEqual([235, 235, 235, 255]);
    expect(pixelAt(result, 2, 0)).toEqual([235, 235, 235, 255]);
    expect(pixelAt(result, 3, 0)).toEqual([235, 235, 235, 255]);
  });

  it("uses the exact H02 light-neutral and opaque candidate boundaries", () => {
    const source = image(3, 4, [
      WHITE,
      [232, 232, 240, 255],
      DARK,
      WHITE,
      [231, 232, 232, 255],
      DARK,
      WHITE,
      [232, 232, 241, 255],
      DARK,
      WHITE,
      [255, 255, 255, 254],
      DARK,
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 1)).toEqual([231, 232, 232, 255]);
    expect(pixelAt(result, 1, 2)).toEqual([232, 232, 241, 255]);
    expect(pixelAt(result, 1, 3)).toEqual([255, 255, 255, 254]);
  });

  it("requires an RGB-sum brightness separation of at least 48", () => {
    const source = image(3, 2, [
      WHITE,
      [235, 235, 235, 255],
      [219, 219, 219, 255],
      WHITE,
      [235, 235, 235, 255],
      [220, 219, 219, 255],
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 1)).toEqual([235, 235, 235, 255]);
  });

  it("limits H02 cleanup to one layer without using new exclusions as seeds", () => {
    const source = image(4, 3, [
      DARK,
      DARK,
      DARK,
      DARK,
      WHITE,
      [247, 247, 247, 255],
      [235, 235, 235, 255],
      DARK,
      DARK,
      DARK,
      DARK,
      DARK,
    ]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 0, 1)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 1, 1)).toEqual([0, 0, 0, 0]);
    expect(pixelAt(result, 2, 1)).toEqual([235, 235, 235, 255]);
  });

  it("cleans fringe while preserving a black outline and cream fill", () => {
    const cream: Pixel = [255, 245, 220, 255];
    const pixels: Pixel[] = [];
    for (let row = 0; row < 4; row += 1) {
      pixels.push(WHITE, [235, 235, 235, 255], DARK, cream);
    }
    const source = image(4, 4, pixels);

    const result = excludeEdgeConnectedLightBackground(source);

    for (let row = 0; row < 4; row += 1) {
      expect(pixelAt(result, 0, row)).toEqual([0, 0, 0, 0]);
      expect(pixelAt(result, 1, row)).toEqual([0, 0, 0, 0]);
      expect(pixelAt(result, 2, row)).toEqual(DARK);
      expect(pixelAt(result, 3, row)).toEqual(cream);
    }
  });

  it("preserves existing transparent and partially transparent pixels", () => {
    const transparent: Pixel = [19, 20, 21, 0];
    const partial: Pixel = [255, 255, 255, 128];
    const source = image(3, 2, [WHITE, transparent, partial, RED, RED, RED]);

    const result = excludeEdgeConnectedLightBackground(source);

    expect(pixelAt(result, 1, 0)).toEqual(transparent);
    expect(pixelAt(result, 2, 0)).toEqual(partial);
  });

  it("does not use existing alpha-zero pixels as H02 seeds", () => {
    const transparent: Pixel = [0, 0, 0, 0];
    const source = image(3, 1, [transparent, [235, 235, 235, 255], DARK]);

    expect(excludeEdgeConnectedLightBackground(source)).toBe(source);
    expect(pixelAt(source, 1, 0)).toEqual([235, 235, 235, 255]);
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
