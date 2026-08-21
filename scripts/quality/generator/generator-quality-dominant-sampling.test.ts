import { describe, expect, it } from "vitest";

import { normalizeRgbaImage } from "../../../src/domain/image/normalize-rgba.ts";
import type {
  ImageBackground,
  RgbaImage,
} from "../../../src/domain/image/image.types.ts";
import { applyDominantRgbSamplingCandidate } from "./generator-quality-dominant-sampling.ts";

describe("Q02-A02 dominant RGB sampling candidate", () => {
  it("selects the dominant contributing RGB while preserving area alpha", () => {
    const source = row([
      [252, 249, 224, 255],
      [252, 249, 224, 255],
      [252, 249, 224, 255],
      [252, 249, 224, 255],
      [250, 244, 200, 255],
      [250, 244, 200, 255],
      [250, 244, 200, 255],
    ]);
    const baseline = normalize(source, 3, "transparent");
    const candidate = applyDominantRgbSamplingCandidate(
      source,
      baseline,
      "transparent",
    );

    expect(Array.from(baseline.image.data.slice(4, 8))).toEqual([
      251, 248, 217, 255,
    ]);
    expect(Array.from(candidate.image.data.slice(4, 8))).toEqual([
      252, 249, 224, 255,
    ]);
    expect(alpha(candidate.image)).toEqual(alpha(baseline.image));
    expect(candidate.diagnostics).toMatchObject({
      activated: true,
      bypassReason: "none",
      dominantRgbChangedCellCount: 1,
      alphaMismatchCount: 0,
    });
  });

  it("weights partial alpha and ignores alpha-zero hidden RGB", () => {
    const partial = row([
      [255, 0, 0, 255],
      [0, 0, 255, 128],
    ]);
    const hidden = row([
      [255, 0, 0, 255],
      [0, 255, 0, 0],
    ]);

    expect(candidatePixel(partial)).toEqual([255, 0, 0, 192]);
    expect(candidatePixel(hidden)).toEqual([255, 0, 0, 128]);
  });

  it("bypasses when no downscale occurs and is deterministic", () => {
    const source = row([
      [10, 20, 30, 255],
      [40, 50, 60, 255],
    ]);
    const baseline = normalize(source, 2, "transparent");
    const first = applyDominantRgbSamplingCandidate(
      source,
      baseline,
      "transparent",
    );
    const second = applyDominantRgbSamplingCandidate(
      source,
      baseline,
      "transparent",
    );

    expect(first.image.data).toEqual(baseline.image.data);
    expect(second).toEqual(first);
    expect(first.diagnostics).toMatchObject({
      activated: false,
      bypassReason: "not-downscaling",
    });
  });
});

function candidatePixel(source: RgbaImage): number[] {
  const baseline = normalize(source, 1, "transparent");
  return Array.from(
    applyDominantRgbSamplingCandidate(source, baseline, "transparent").image
      .data,
  );
}

function normalize(
  source: RgbaImage,
  targetWidth: number,
  background: ImageBackground,
) {
  return normalizeRgbaImage(
    source,
    {
      format: "png",
      originalWidth: source.width,
      originalHeight: source.height,
      orientedWidth: source.width,
      orientedHeight: source.height,
      exifOrientation: 1,
      hasAlpha: alpha(source).some((value) => value !== 255),
    },
    {
      targetWidth,
      targetHeight: 1,
      preserveAspectRatio: true,
      fit: "contain",
      background,
      allowUpscale: false,
    },
  );
}

function row(
  pixels: readonly (readonly [number, number, number, number])[],
): RgbaImage {
  return {
    width: pixels.length,
    height: 1,
    data: new Uint8ClampedArray(pixels.flat()),
  };
}

function alpha(image: RgbaImage): number[] {
  const result: number[] = [];
  for (let index = 3; index < image.data.length; index += 4) {
    result.push(image.data[index]!);
  }
  return result;
}
