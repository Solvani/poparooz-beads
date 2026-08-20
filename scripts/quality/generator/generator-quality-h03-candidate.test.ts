import { describe, expect, it } from "vitest";

import type { RgbaImage } from "../../../src/domain/image/image.types.ts";
import { applyH03D02NormalizedFringeCandidate } from "./generator-quality-h03-candidate.ts";

describe("H03-D02 normalized fringe candidate", () => {
  it("removes a precomputed eligible neutral fringe batch", () => {
    const image = blankImage();
    setPixel(image, 2, 2, [100, 101, 100, 48]);
    setPixel(image, 3, 2, [20, 20, 20, 255]);
    setPixel(image, 2, 3, [20, 20, 20, 255]);
    setPixel(image, 3, 3, [20, 20, 20, 255]);

    const result = apply(image);

    expect(result.diagnostics).toMatchObject({
      activated: true,
      candidateCount: 1,
      removedCount: 1,
      topologyGuardRejected: false,
    });
    expect(pixel(result.image, 2, 2)).toEqual([0, 0, 0, 0]);
  });

  it("does not progressively discover a second layer", () => {
    const image = blankImage(6, 5);
    setPixel(image, 2, 2, [100, 100, 100, 48]);
    setPixel(image, 3, 2, [100, 100, 100, 48]);
    setPixel(image, 2, 3, [20, 20, 20, 255]);
    setPixel(image, 3, 3, [20, 20, 20, 255]);
    setPixel(image, 3, 1, [20, 20, 20, 255]);
    setPixel(image, 4, 2, [20, 20, 20, 255]);

    const result = apply(image);

    expect(result.diagnostics.candidateCount).toBe(1);
    expect(pixel(result.image, 3, 2)).toEqual([100, 100, 100, 48]);
  });

  it("preserves boundary and sparse fringe positions", () => {
    const image = blankImage();
    setPixel(image, 0, 2, [100, 100, 100, 48]);
    setPixel(image, 2, 2, [100, 100, 100, 48]);
    setPixel(image, 3, 2, [20, 20, 20, 255]);

    const result = apply(image);

    expect(result.diagnostics.candidateCount).toBe(0);
    expect(result.image).toBe(image);
  });

  it("rejects a batch that splits an occupied component", () => {
    const image = blankImage();
    setPixel(image, 1, 2, [20, 20, 20, 255]);
    setPixel(image, 2, 2, [100, 100, 100, 48]);
    setPixel(image, 3, 2, [20, 20, 20, 255]);

    const result = apply(image);

    expect(result.diagnostics).toMatchObject({
      candidateCount: 1,
      removedCount: 0,
      topologyGuardRejected: true,
      componentCountBefore: 1,
      componentCountAfter: 2,
    });
    expect(result.image).toBe(image);
  });

  it("is an exact no-op for explicit-alpha sources and White mode", () => {
    const image = blankImage();
    setPixel(image, 2, 2, [100, 100, 100, 48]);

    const explicitAlpha = applyH03D02NormalizedFringeCandidate(image, {
      background: "transparent",
      sourceHasAlpha: true,
    });
    const white = applyH03D02NormalizedFringeCandidate(image, {
      background: "white",
      sourceHasAlpha: false,
    });

    expect(explicitAlpha.image).toBe(image);
    expect(explicitAlpha.diagnostics.bypassReason).toBe(
      "explicit-alpha-source",
    );
    expect(white.image).toBe(image);
    expect(white.diagnostics.bypassReason).toBe("not-transparent");
  });
});

function apply(image: RgbaImage) {
  return applyH03D02NormalizedFringeCandidate(image, {
    background: "transparent",
    sourceHasAlpha: false,
  });
}

function blankImage(width = 5, height = 5): RgbaImage {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function setPixel(
  image: RgbaImage,
  x: number,
  y: number,
  rgba: readonly [number, number, number, number],
): void {
  image.data.set(rgba, (y * image.width + x) * 4);
}

function pixel(image: RgbaImage, x: number, y: number): number[] {
  return Array.from(
    image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4),
  );
}
