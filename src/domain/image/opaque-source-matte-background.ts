import { ImagePipelineError } from "./image-errors";
import { validateDecodedImage } from "./image-limits";
import type { RgbaImage } from "./image.types";

const MATTE_CHANNEL_MINIMUM = 242;
const MATTE_CHANNEL_SPREAD_MAXIMUM = 6;
const DARKER_NEIGHBOR_RGB_SUM_DIFFERENCE = 3;

const STRICT_BACKGROUND = 1;
const TRANSITION_CANDIDATE = 2;
const MATTE_BACKGROUND = 3;

export function refineOpaqueSourceMatteBackground(
  original: RgbaImage,
  strictMasked: RgbaImage,
): RgbaImage {
  validateDecodedImage(original);
  validateDecodedImage(strictMasked);
  if (
    original.width !== strictMasked.width ||
    original.height !== strictMasked.height
  ) {
    throw new ImagePipelineError(
      "INVALID_IMAGE_DIMENSIONS",
      "Source matte inputs must have matching dimensions.",
    );
  }

  const pixelCount = original.width * original.height;
  const state = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let queueHead = 0;
  let queueTail = 0;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    if (original.data[offset + 3] !== 255) return strictMasked;
    if (isStrictBackgroundOwnership(original, strictMasked, offset)) {
      state[pixelIndex] = STRICT_BACKGROUND;
      queue[queueTail] = pixelIndex;
      queueTail += 1;
    }
  }

  const strictBackgroundCount = queueTail;
  if (strictBackgroundCount === 0) return strictMasked;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (
      state[pixelIndex] === 0 &&
      isOpaqueNeutralMatteCandidate(original.data, pixelIndex * 4) &&
      hasDarkerRetainedOpaqueNeighbor(original, strictMasked, pixelIndex)
    ) {
      state[pixelIndex] = TRANSITION_CANDIDATE;
    }
  }

  let matteBackgroundCount = 0;
  while (queueHead < queueTail) {
    const pixelIndex = queue[queueHead]!;
    queueHead += 1;
    const x = pixelIndex % original.width;
    const y = Math.floor(pixelIndex / original.width);

    if (x > 0) acceptTransitionCandidate(pixelIndex - 1);
    if (x + 1 < original.width) acceptTransitionCandidate(pixelIndex + 1);
    if (y > 0) acceptTransitionCandidate(pixelIndex - original.width);
    if (y + 1 < original.height)
      acceptTransitionCandidate(pixelIndex + original.width);
  }

  if (matteBackgroundCount === 0) return strictMasked;
  if (strictBackgroundCount + matteBackgroundCount === pixelCount)
    return strictMasked;

  const data = new Uint8ClampedArray(strictMasked.data);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (state[pixelIndex] === MATTE_BACKGROUND) {
      data.fill(0, pixelIndex * 4, pixelIndex * 4 + 4);
    }
  }
  return { width: original.width, height: original.height, data };

  function acceptTransitionCandidate(pixelIndex: number): void {
    if (state[pixelIndex] !== TRANSITION_CANDIDATE) return;
    state[pixelIndex] = MATTE_BACKGROUND;
    queue[queueTail] = pixelIndex;
    queueTail += 1;
    matteBackgroundCount += 1;
  }
}

function isStrictBackgroundOwnership(
  original: RgbaImage,
  strictMasked: RgbaImage,
  offset: number,
): boolean {
  return (
    original.data[offset + 3] === 255 &&
    strictMasked.data[offset] === 0 &&
    strictMasked.data[offset + 1] === 0 &&
    strictMasked.data[offset + 2] === 0 &&
    strictMasked.data[offset + 3] === 0
  );
}

function isOpaqueNeutralMatteCandidate(
  data: Uint8ClampedArray,
  offset: number,
): boolean {
  if (data[offset + 3] !== 255) return false;
  const red = data[offset]!;
  const green = data[offset + 1]!;
  const blue = data[offset + 2]!;
  const minimum = Math.min(red, green, blue);
  const maximum = Math.max(red, green, blue);
  return (
    minimum >= MATTE_CHANNEL_MINIMUM &&
    maximum - minimum <= MATTE_CHANNEL_SPREAD_MAXIMUM
  );
}

function hasDarkerRetainedOpaqueNeighbor(
  original: RgbaImage,
  strictMasked: RgbaImage,
  pixelIndex: number,
): boolean {
  const x = pixelIndex % original.width;
  const y = Math.floor(pixelIndex / original.width);
  const candidateRgbSum = rgbSum(original.data, pixelIndex * 4);

  return (
    (x > 0 && isDarkerRetainedNeighbor(pixelIndex - 1)) ||
    (x + 1 < original.width && isDarkerRetainedNeighbor(pixelIndex + 1)) ||
    (y > 0 && isDarkerRetainedNeighbor(pixelIndex - original.width)) ||
    (y + 1 < original.height &&
      isDarkerRetainedNeighbor(pixelIndex + original.width))
  );

  function isDarkerRetainedNeighbor(neighborIndex: number): boolean {
    const neighborOffset = neighborIndex * 4;
    return (
      strictMasked.data[neighborOffset + 3] === 255 &&
      candidateRgbSum - rgbSum(original.data, neighborOffset) >=
        DARKER_NEIGHBOR_RGB_SUM_DIFFERENCE
    );
  }
}

function rgbSum(data: Uint8ClampedArray, offset: number): number {
  return data[offset]! + data[offset + 1]! + data[offset + 2]!;
}
