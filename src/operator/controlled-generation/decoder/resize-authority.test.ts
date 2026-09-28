import { describe, expect, it } from "vitest";

import { controlledContainResize } from "./resize-authority";

describe("controlled resize authority", () => {
  it("uses centered contain, premultiplied-alpha area averaging, and half-up rounding", () => {
    const result = controlledContainResize(
      {
        width: 2,
        height: 2,
        data: new Uint8ClampedArray([
          255, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 255, 255, 255, 255, 255,
        ]),
      },
      {
        format: "png",
        originalWidth: 2,
        originalHeight: 2,
        orientedWidth: 2,
        orientedHeight: 2,
        exifOrientation: 1,
        hasAlpha: true,
      },
      { width: 1, height: 1, background: "transparent" },
    );
    expect([...result.image.data]).toEqual([170, 170, 85, 191]);
    expect(result.target).toMatchObject({
      fit: "contain",
      drawX: 0,
      drawY: 0,
      drawWidth: 1,
      drawHeight: 1,
    });
  });

  it("fails closed instead of upscaling", () => {
    expect(() =>
      controlledContainResize(
        { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) },
        {
          format: "png",
          originalWidth: 1,
          originalHeight: 1,
          orientedWidth: 1,
          orientedHeight: 1,
          exifOrientation: 1,
          hasAlpha: false,
        },
        { width: 2, height: 2, background: "white" },
      ),
    ).toThrow(expect.objectContaining({ code: "UPSCALE_NOT_ALLOWED" }));
  });
});
