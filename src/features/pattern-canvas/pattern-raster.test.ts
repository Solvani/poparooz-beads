import { describe, expect, it, vi } from "vitest";

import type { PublicPatternResult } from "../../domain/pattern/public-pattern.types";
import {
  buildPatternRaster,
  TRANSPARENT_CELL_DARK,
  type PatternRasterSurfaceFactory,
} from "./pattern-raster";
import { createPublicPattern } from "./test/pattern-result";

function surface() {
  let imageData: ImageData | undefined;
  const context = {
    createImageData: vi.fn((width: number, height: number) => {
      imageData = {
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
        colorSpace: "srgb",
      } as ImageData;
      return imageData;
    }),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const canvas = document.createElement("canvas");
  const factory: PatternRasterSurfaceFactory = vi.fn((width, height) => {
    canvas.width = width;
    canvas.height = height;
    return { canvas, context };
  });
  return { factory, context, canvas, readImage: () => imageData! };
}

describe("pattern raster", () => {
  it("maps matrix indexes to public hex colors in one pixel per cell", () => {
    const target = surface();
    const pattern = createPublicPattern();
    const result = buildPatternRaster(pattern, target.factory);

    expect(result).toMatchObject({ ok: true });
    expect(target.factory).toHaveBeenCalledWith(2, 2);
    expect([...target.readImage().data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...target.readImage().data.slice(4, 8)]).toEqual([0, 0, 255, 255]);
    expect(target.context.putImageData).toHaveBeenCalledOnce();
  });

  it("uses a neutral checker cell for transparency rather than a white bead", () => {
    const target = surface();
    buildPatternRaster(createPublicPattern(), target.factory);
    const transparent = [...target.readImage().data.slice(8, 12)];
    const dark = [
      Number.parseInt(TRANSPARENT_CELL_DARK.slice(1, 3), 16),
      Number.parseInt(TRANSPARENT_CELL_DARK.slice(3, 5), 16),
      Number.parseInt(TRANSPARENT_CELL_DARK.slice(5, 7), 16),
      255,
    ];
    expect(transparent).toEqual(dark);
    expect(transparent).not.toEqual([255, 255, 255, 255]);
  });

  it("does not mutate the public matrix or colors", () => {
    const target = surface();
    const pattern = createPublicPattern();
    const indexes = pattern.matrix.colorIndices.slice();
    const colors = JSON.stringify(pattern.colors);
    buildPatternRaster(pattern, target.factory);
    expect(pattern.matrix.colorIndices).toEqual(indexes);
    expect(JSON.stringify(pattern.colors)).toBe(colors);
  });

  it("safely rejects invalid dimensions, lengths, indexes, hex, and context", () => {
    const target = surface();
    const valid = createPublicPattern();
    expect(
      buildPatternRaster(
        {
          ...valid,
          matrix: { ...valid.matrix, width: 3 },
        },
        target.factory,
      ).ok,
    ).toBe(false);
    expect(
      buildPatternRaster(createPublicPattern(1, 1, [9]), target.factory).ok,
    ).toBe(false);
    const invalidHex = {
      ...valid,
      colors: [
        {
          ...valid.colors[0]!,
          color: { ...valid.colors[0]!.color, hex: "white" },
        },
      ],
    } as PublicPatternResult;
    expect(buildPatternRaster(invalidHex, target.factory).ok).toBe(false);
    expect(buildPatternRaster(valid, () => null).ok).toBe(false);
    expect(
      buildPatternRaster(
        createPublicPattern(4097, 1, new Uint16Array(4097)),
        target.factory,
      ).ok,
    ).toBe(false);
  });

  it("builds a larger structural raster without per-cell DOM nodes", () => {
    const width = 512;
    const height = 256;
    const target = surface();
    const indexes = new Uint16Array(width * height);
    const pattern = createPublicPattern(width, height, indexes);
    const result = buildPatternRaster(pattern, target.factory);
    expect(result.ok).toBe(true);
    expect(target.readImage().data.byteLength).toBe(width * height * 4);
    expect(document.querySelectorAll("[data-pattern-cell]")).toHaveLength(0);
  });
});
