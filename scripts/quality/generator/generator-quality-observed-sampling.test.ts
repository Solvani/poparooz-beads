import { describe, expect, it } from "vitest";

import { normalizeRgbaImage } from "../../../src/domain/image/normalize-rgba.ts";
import type { RgbaImage } from "../../../src/domain/image/image.types.ts";
import { applyPerceptualObservedRgbSamplingCandidate } from "./generator-quality-observed-sampling.ts";

describe("Q02-A03 perceptual observed-color sampling candidate", () => {
  it("selects the perceptually nearest actually observed RGB", () => {
    const source = row([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ]);
    const baseline = normalize(source, 1);
    const candidate = applyPerceptualObservedRgbSamplingCandidate(
      source,
      baseline,
      "transparent",
    );

    expect(Array.from(baseline.image.data)).toEqual([170, 0, 85, 255]);
    expect(Array.from(candidate.image.data)).toEqual([255, 0, 0, 255]);
    expect(candidate.diagnostics).toMatchObject({
      activated: true,
      observedCandidateCount: 2,
      alphaMismatchCount: 0,
    });
  });

  it("excludes hidden RGB and preserves exact production alpha", () => {
    const source = row([
      [10, 20, 30, 255],
      [240, 1, 200, 0],
    ]);
    const baseline = normalize(source, 1);
    const candidate = applyPerceptualObservedRgbSamplingCandidate(
      source,
      baseline,
      "transparent",
    );

    expect(Array.from(candidate.image.data)).toEqual([10, 20, 30, 128]);
    expect(candidate.diagnostics.observedCandidateCount).toBe(1);
  });

  it("bypasses no-upscale cells and replays deterministically", () => {
    const source = row([
      [10, 20, 30, 255],
      [40, 50, 60, 255],
    ]);
    const baseline = normalize(source, 2);
    const first = applyPerceptualObservedRgbSamplingCandidate(
      source,
      baseline,
      "transparent",
    );
    const second = applyPerceptualObservedRgbSamplingCandidate(
      source,
      baseline,
      "transparent",
    );

    expect(first.image.data).toEqual(baseline.image.data);
    expect(second).toEqual(first);
    expect(first.diagnostics.bypassReason).toBe("not-downscaling");
  });
});

function normalize(source: RgbaImage, targetWidth: number) {
  return normalizeRgbaImage(
    source,
    {
      format: "png",
      originalWidth: source.width,
      originalHeight: source.height,
      orientedWidth: source.width,
      orientedHeight: source.height,
      exifOrientation: 1,
      hasAlpha: source.data.some(
        (value, index) => index % 4 === 3 && value !== 255,
      ),
    },
    {
      targetWidth,
      targetHeight: 1,
      preserveAspectRatio: true,
      fit: "contain",
      background: "transparent",
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
