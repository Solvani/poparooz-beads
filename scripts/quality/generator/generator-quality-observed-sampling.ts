import { deltaE2000 } from "../../../src/domain/color/color-distance.ts";
import { rgb8ToLab } from "../../../src/domain/color/color-conversion.ts";
import { resizeRgbaImage } from "../../../src/domain/image/rgba-resize.ts";
import type {
  ImageBackground,
  NormalizedImageResult,
  RgbaImage,
} from "../../../src/domain/image/image.types.ts";
import {
  collectObservedRgbContributions,
  type WeightedObservedRgb,
} from "./generator-quality-cell-footprint.ts";

export interface ObservedSamplingDiagnostics {
  readonly activated: boolean;
  readonly bypassReason: "none" | "not-downscaling";
  readonly evaluatedCellCount: number;
  readonly observedRgbChangedCellCount: number;
  readonly observedCandidateCount: number;
  readonly exactReferenceMatchCellCount: number;
  readonly alphaMismatchCount: number;
}

export interface ObservedSamplingResult {
  readonly image: RgbaImage;
  readonly diagnostics: ObservedSamplingDiagnostics;
}

/** Evaluation-only nearest-observed RGB selection against production resize RGB. */
export function applyPerceptualObservedRgbSamplingCandidate(
  source: RgbaImage,
  baseline: NormalizedImageResult,
  background: ImageBackground,
): ObservedSamplingResult {
  const { drawX, drawY, drawWidth, drawHeight } = baseline.target;
  if (drawWidth >= source.width && drawHeight >= source.height) {
    return result(baseline.image, false, "not-downscaling", 0, 0, 0, 0, 0);
  }

  // This is the production resize implementation, not a parallel average.
  const areaReference = resizeRgbaImage(source, drawWidth, drawHeight);
  const output: RgbaImage = {
    width: baseline.image.width,
    height: baseline.image.height,
    data: new Uint8ClampedArray(baseline.image.data),
  };
  let changed = 0;
  let candidateCount = 0;
  let exactMatches = 0;

  for (let targetY = 0; targetY < drawHeight; targetY += 1) {
    const sourceTop = (targetY * source.height) / drawHeight;
    const sourceBottom = ((targetY + 1) * source.height) / drawHeight;
    for (let targetX = 0; targetX < drawWidth; targetX += 1) {
      const sourceLeft = (targetX * source.width) / drawWidth;
      const sourceRight = ((targetX + 1) * source.width) / drawWidth;
      const referenceIndex = (targetY * drawWidth + targetX) * 4;
      const observed = collectObservedRgbContributions(
        source,
        sourceLeft,
        sourceRight,
        sourceTop,
        sourceBottom,
      );
      candidateCount += observed.length;
      const selected = nearestObservedRgb(observed, {
        r: areaReference.data[referenceIndex]!,
        g: areaReference.data[referenceIndex + 1]!,
        b: areaReference.data[referenceIndex + 2]!,
      });
      const destinationIndex =
        ((drawY + targetY) * output.width + drawX + targetX) * 4;
      if (selected !== undefined) {
        if (
          selected.r === areaReference.data[referenceIndex] &&
          selected.g === areaReference.data[referenceIndex + 1] &&
          selected.b === areaReference.data[referenceIndex + 2]
        ) {
          exactMatches += 1;
        }
        composite(
          output.data,
          destinationIndex,
          selected,
          areaReference.data[referenceIndex + 3]!,
          background,
        );
      }
      if (
        output.data[destinationIndex] !==
          baseline.image.data[destinationIndex] ||
        output.data[destinationIndex + 1] !==
          baseline.image.data[destinationIndex + 1] ||
        output.data[destinationIndex + 2] !==
          baseline.image.data[destinationIndex + 2]
      )
        changed += 1;
    }
  }
  const alphaMismatches = countAlphaMismatches(
    baseline.image.data,
    output.data,
  );
  if (alphaMismatches !== 0) {
    throw new Error("Observed RGB sampling changed production alpha bytes.");
  }
  return result(
    output,
    true,
    "none",
    drawWidth * drawHeight,
    changed,
    candidateCount,
    exactMatches,
    alphaMismatches,
  );
}

function nearestObservedRgb(
  candidates: readonly WeightedObservedRgb[],
  reference: Readonly<{ r: number; g: number; b: number }>,
): WeightedObservedRgb | undefined {
  const referenceLab = rgb8ToLab(reference);
  let winner: WeightedObservedRgb | undefined;
  let winnerDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = deltaE2000(rgb8ToLab(candidate), referenceLab);
    if (
      distance < winnerDistance ||
      (distance === winnerDistance &&
        (winner === undefined ||
          candidate.contribution > winner.contribution ||
          (candidate.contribution === winner.contribution &&
            candidate.key < winner.key)))
    ) {
      winner = candidate;
      winnerDistance = distance;
    }
  }
  return winner;
}

function composite(
  output: Uint8ClampedArray,
  index: number,
  rgb: Pick<WeightedObservedRgb, "r" | "g" | "b">,
  alpha: number,
  background: ImageBackground,
): void {
  if (background === "transparent") {
    if (alpha === 0) output.fill(0, index, index + 4);
    else output.set([rgb.r, rgb.g, rgb.b, alpha], index);
    return;
  }
  const inverseAlpha = 255 - alpha;
  output[index] = Math.floor((rgb.r * alpha + 255 * inverseAlpha) / 255 + 0.5);
  output[index + 1] = Math.floor(
    (rgb.g * alpha + 255 * inverseAlpha) / 255 + 0.5,
  );
  output[index + 2] = Math.floor(
    (rgb.b * alpha + 255 * inverseAlpha) / 255 + 0.5,
  );
  output[index + 3] = 255;
}

function countAlphaMismatches(
  baseline: Uint8ClampedArray,
  candidate: Uint8ClampedArray,
): number {
  let count = 0;
  for (let index = 3; index < baseline.length; index += 4) {
    if (baseline[index] !== candidate[index]) count += 1;
  }
  return count;
}

function result(
  image: RgbaImage,
  activated: boolean,
  bypassReason: ObservedSamplingDiagnostics["bypassReason"],
  evaluatedCellCount: number,
  observedRgbChangedCellCount: number,
  observedCandidateCount: number,
  exactReferenceMatchCellCount: number,
  alphaMismatchCount: number,
): ObservedSamplingResult {
  return Object.freeze({
    image,
    diagnostics: Object.freeze({
      activated,
      bypassReason,
      evaluatedCellCount,
      observedRgbChangedCellCount,
      observedCandidateCount,
      exactReferenceMatchCellCount,
      alphaMismatchCount,
    }),
  });
}
