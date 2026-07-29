import { describe, expect, it } from "vitest";

import { normalizeRgbaImage } from "./normalize-rgba";
import type {
  ImageSourceMetadata,
  NormalizeImageOptions,
  RgbaImage,
} from "./image.types";

const metadata: ImageSourceMetadata = {
  format: "png",
  originalWidth: 2,
  originalHeight: 1,
  orientedWidth: 2,
  orientedHeight: 1,
  exifOrientation: 1,
  hasAlpha: true,
};
const options = (
  background: "transparent" | "white",
): NormalizeImageOptions => ({
  targetWidth: 2,
  targetHeight: 3,
  preserveAspectRatio: true,
  fit: "contain",
  background,
  allowUpscale: false,
});

describe("normalized RGBA composition", () => {
  const source: RgbaImage = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 128, 10, 20, 30, 0]),
  };

  it("returns the exact requested target dimensions", () => {
    const result = normalizeRgbaImage(source, metadata, options("transparent"));
    expect(result.image).toMatchObject({ width: 2, height: 3 });
    expect(result.image.data).toHaveLength(24);
  });

  it("centers transparent letterbox pixels", () => {
    const result = normalizeRgbaImage(source, metadata, options("transparent"));
    expect([...result.image.data.slice(0, 8)]).toEqual(new Array(8).fill(0));
    expect([...result.image.data.slice(16)]).toEqual(new Array(8).fill(0));
  });

  it("preserves nonzero alpha and clears hidden RGB for alpha zero", () => {
    const result = normalizeRgbaImage(source, metadata, options("transparent"));
    expect([...result.image.data.slice(8, 16)]).toEqual([
      255, 0, 0, 128, 0, 0, 0, 0,
    ]);
  });

  it("uses opaque white letterboxing", () => {
    const result = normalizeRgbaImage(source, metadata, options("white"));
    expect([...result.image.data.slice(0, 8)]).toEqual(new Array(8).fill(255));
    expect([...result.image.data.slice(16)]).toEqual(new Array(8).fill(255));
  });

  it("composites semitransparent and transparent pixels over white", () => {
    const result = normalizeRgbaImage(source, metadata, options("white"));
    expect([...result.image.data.slice(8, 16)]).toEqual([
      255, 127, 127, 255, 255, 255, 255, 255,
    ]);
  });

  it("keeps every white-background alpha at 255", () => {
    const result = normalizeRgbaImage(source, metadata, options("white"));
    for (let index = 3; index < result.image.data.length; index += 4) {
      expect(result.image.data[index]).toBe(255);
    }
  });

  it("rejects metadata that would imply another orientation size", () => {
    expect(() =>
      normalizeRgbaImage(
        source,
        { ...metadata, exifOrientation: 6 },
        options("white"),
      ),
    ).toThrow(expect.objectContaining({ code: "INVALID_IMAGE_DIMENSIONS" }));
  });

  it("does not modify input pixels", () => {
    const original = new Uint8ClampedArray(source.data);
    normalizeRgbaImage(source, metadata, options("transparent"));
    expect(source.data).toEqual(original);
  });
});
