import { deltaE2000 } from "../../../src/domain/color/color-distance.ts";
import { rgb8ToLab } from "../../../src/domain/color/color-conversion.ts";
import { resizeRgbaImage } from "../../../src/domain/image/rgba-resize.ts";
import type {
  ImageBackground,
  NormalizedImageResult,
  RgbaImage,
} from "../../../src/domain/image/image.types.ts";

export interface DominantSamplingDiagnostics {
  readonly activated: boolean;
  readonly bypassReason: "none" | "not-downscaling";
  readonly evaluatedCellCount: number;
  readonly dominantRgbChangedCellCount: number;
  readonly alphaMismatchCount: number;
}

export interface DominantSamplingResult {
  readonly image: RgbaImage;
  readonly diagnostics: DominantSamplingDiagnostics;
}

interface WeightedRgb {
  readonly key: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly weight: number;
}

/**
 * Evaluation-only dominant RGB sampling. Spatial overlap multiplied by source
 * alpha selects the RGB. Production area-resized alpha and contain geometry are
 * retained exactly; only RGB inside a downscaled draw rectangle may change.
 */
export function applyDominantRgbSamplingCandidate(
  source: RgbaImage,
  baseline: NormalizedImageResult,
  background: ImageBackground,
): DominantSamplingResult {
  const { drawX, drawY, drawWidth, drawHeight } = baseline.target;
  const downscaling = drawWidth < source.width || drawHeight < source.height;
  if (!downscaling) {
    return Object.freeze({
      image: baseline.image,
      diagnostics: diagnostics(false, "not-downscaling", 0, 0, 0),
    });
  }

  const areaResized = resizeRgbaImage(source, drawWidth, drawHeight);
  const output: RgbaImage = {
    width: baseline.image.width,
    height: baseline.image.height,
    data: new Uint8ClampedArray(baseline.image.data),
  };
  let changedRgbCellCount = 0;

  for (let targetY = 0; targetY < drawHeight; targetY += 1) {
    const sourceTop = (targetY * source.height) / drawHeight;
    const sourceBottom = ((targetY + 1) * source.height) / drawHeight;
    for (let targetX = 0; targetX < drawWidth; targetX += 1) {
      const sourceLeft = (targetX * source.width) / drawWidth;
      const sourceRight = ((targetX + 1) * source.width) / drawWidth;
      const resizedIndex = (targetY * drawWidth + targetX) * 4;
      const selected = dominantRgbForFootprint(
        source,
        sourceLeft,
        sourceRight,
        sourceTop,
        sourceBottom,
        {
          r: areaResized.data[resizedIndex]!,
          g: areaResized.data[resizedIndex + 1]!,
          b: areaResized.data[resizedIndex + 2]!,
        },
      );
      const destinationIndex =
        ((drawY + targetY) * output.width + drawX + targetX) * 4;
      if (selected !== undefined) {
        compositeDominantRgb(
          output.data,
          destinationIndex,
          selected,
          areaResized.data[resizedIndex + 3]!,
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
      ) {
        changedRgbCellCount += 1;
      }
    }
  }

  const alphaMismatchCount = countAlphaMismatches(
    baseline.image.data,
    output.data,
  );
  if (alphaMismatchCount !== 0) {
    throw new Error("Dominant RGB sampling changed production alpha bytes.");
  }

  return Object.freeze({
    image: output,
    diagnostics: diagnostics(
      true,
      "none",
      drawWidth * drawHeight,
      changedRgbCellCount,
      alphaMismatchCount,
    ),
  });
}

function dominantRgbForFootprint(
  source: RgbaImage,
  sourceLeft: number,
  sourceRight: number,
  sourceTop: number,
  sourceBottom: number,
  areaAverage: Readonly<{ r: number; g: number; b: number }>,
): WeightedRgb | undefined {
  const weights = new Map<
    number,
    { r: number; g: number; b: number; weight: number }
  >();
  const startX = Math.floor(sourceLeft);
  const endX = Math.ceil(sourceRight);
  const startY = Math.floor(sourceTop);
  const endY = Math.ceil(sourceBottom);

  for (let sourceY = startY; sourceY < endY; sourceY += 1) {
    const overlapY = overlap(sourceTop, sourceBottom, sourceY, sourceY + 1);
    if (overlapY <= 0) continue;
    for (let sourceX = startX; sourceX < endX; sourceX += 1) {
      const overlapX = overlap(sourceLeft, sourceRight, sourceX, sourceX + 1);
      if (overlapX <= 0) continue;
      const index = (sourceY * source.width + sourceX) * 4;
      const alpha = source.data[index + 3]! / 255;
      if (alpha === 0) continue;
      const weight = overlapX * overlapY * alpha;
      const r = source.data[index]!;
      const g = source.data[index + 1]!;
      const b = source.data[index + 2]!;
      const key = (r << 16) | (g << 8) | b;
      const existing = weights.get(key);
      if (existing === undefined) weights.set(key, { r, g, b, weight });
      else existing.weight += weight;
    }
  }

  let winner: WeightedRgb | undefined;
  let winnerDistance = Number.POSITIVE_INFINITY;
  const averageLab = rgb8ToLab(areaAverage);
  for (const [key, candidate] of weights) {
    if (winner === undefined || candidate.weight > winner.weight) {
      winner = { key, ...candidate };
      winnerDistance = Number.POSITIVE_INFINITY;
      continue;
    }
    if (candidate.weight !== winner.weight) continue;
    if (!Number.isFinite(winnerDistance)) {
      winnerDistance = deltaE2000(
        rgb8ToLab({ r: winner.r, g: winner.g, b: winner.b }),
        averageLab,
      );
    }
    const candidateDistance = deltaE2000(
      rgb8ToLab({ r: candidate.r, g: candidate.g, b: candidate.b }),
      averageLab,
    );
    if (
      candidateDistance < winnerDistance ||
      (candidateDistance === winnerDistance && key < winner.key)
    ) {
      winner = { key, ...candidate };
      winnerDistance = candidateDistance;
    }
  }
  return winner;
}

function overlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): number {
  return Math.max(
    0,
    Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart),
  );
}

function compositeDominantRgb(
  output: Uint8ClampedArray,
  index: number,
  rgb: Pick<WeightedRgb, "r" | "g" | "b">,
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

function diagnostics(
  activated: boolean,
  bypassReason: DominantSamplingDiagnostics["bypassReason"],
  evaluatedCellCount: number,
  dominantRgbChangedCellCount: number,
  alphaMismatchCount: number,
): DominantSamplingDiagnostics {
  return Object.freeze({
    activated,
    bypassReason,
    evaluatedCellCount,
    dominantRgbChangedCellCount,
    alphaMismatchCount,
  });
}
