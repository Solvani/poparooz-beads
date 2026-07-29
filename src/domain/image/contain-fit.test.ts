import { describe, expect, it } from "vitest";

import { calculateContainFit } from "./contain-fit";
import type { NormalizeImageOptions } from "./image.types";

const options = (
  targetWidth: number,
  targetHeight: number,
  allowUpscale = false,
): NormalizeImageOptions => ({
  targetWidth,
  targetHeight,
  preserveAspectRatio: true,
  fit: "contain",
  background: "transparent",
  allowUpscale,
});

describe("deterministic contain fit", () => {
  it("centers a landscape image without cropping", () => {
    expect(calculateContainFit(4, 2, options(4, 4))).toEqual({
      width: 4,
      height: 4,
      fit: "contain",
      drawX: 0,
      drawY: 1,
      drawWidth: 4,
      drawHeight: 2,
    });
  });

  it("centers a portrait image without cropping", () => {
    expect(calculateContainFit(2, 4, options(4, 4))).toMatchObject({
      drawX: 1,
      drawY: 0,
      drawWidth: 2,
      drawHeight: 4,
    });
  });

  it("fills a same-aspect target", () => {
    expect(calculateContainFit(3, 3, options(3, 3))).toMatchObject({
      drawX: 0,
      drawY: 0,
      drawWidth: 3,
      drawHeight: 3,
    });
  });

  it("uses half-up dimension rounding and floor centering", () => {
    expect(calculateContainFit(3, 2, options(5, 5, true))).toMatchObject({
      drawX: 0,
      drawY: 1,
      drawWidth: 5,
      drawHeight: 3,
    });
  });

  it("never exceeds the target bounds", () => {
    const result = calculateContainFit(101, 37, options(17, 19));
    expect(result.drawX).toBeGreaterThanOrEqual(0);
    expect(result.drawY).toBeGreaterThanOrEqual(0);
    expect(result.drawX + result.drawWidth).toBeLessThanOrEqual(result.width);
    expect(result.drawY + result.drawHeight).toBeLessThanOrEqual(result.height);
  });

  it.each([
    [2, 1, 4, 2],
    [1, 2, 2, 4],
    [2, 2, 4, 4],
  ])(
    "rejects required upscaling",
    (sourceWidth, sourceHeight, width, height) => {
      expect(() =>
        calculateContainFit(sourceWidth, sourceHeight, options(width, height)),
      ).toThrow(expect.objectContaining({ code: "UPSCALE_NOT_ALLOWED" }));
    },
  );

  it("allows an explicit deterministic upscale", () => {
    expect(calculateContainFit(2, 2, options(4, 4, true))).toMatchObject({
      drawWidth: 4,
      drawHeight: 4,
    });
  });

  it.each([
    [0, 2],
    [2, 0],
    [1.5, 2],
    [4097, 2],
  ])("rejects invalid target dimensions", (width, height) => {
    expect(() => calculateContainFit(2, 2, options(width, height))).toThrow(
      expect.objectContaining({ code: "INVALID_TARGET_DIMENSIONS" }),
    );
  });
});
