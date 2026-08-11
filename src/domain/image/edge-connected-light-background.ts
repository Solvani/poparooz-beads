import { validateDecodedImage } from "./image-limits";
import type { RgbaImage } from "./image.types";

const QUANTIZABLE_ALPHA_THRESHOLD = 16;
const LIGHT_CHANNEL_MINIMUM = 248;
const LIGHT_CHANNEL_SPREAD_MAXIMUM = 6;
const FRINGE_CHANNEL_MINIMUM = 232;
const FRINGE_CHANNEL_SPREAD_MAXIMUM = 8;
const DARKER_NEIGHBOR_RGB_SUM_DIFFERENCE = 48;

const STRICT_EXCLUDED = 1;
const FRINGE_CANDIDATE = 2;
const FRINGE_EXCLUDED = 3;

interface StrictEdgeExclusion {
  readonly exclusionState: Uint8Array;
  readonly queue: Uint32Array;
  readonly excludedCount: number;
  readonly quantizablePixelCount: number;
}

export function excludeStrictEdgeConnectedLightBackground(
  image: RgbaImage,
): RgbaImage {
  validateDecodedImage(image);
  const strict = buildStrictEdgeExclusion(image);
  if (
    strict.excludedCount === 0 ||
    strict.excludedCount === strict.quantizablePixelCount
  )
    return image;
  return copyWithExcludedPixels(image, strict.exclusionState, false);
}

export function excludeEdgeConnectedLightBackground(
  image: RgbaImage,
): RgbaImage {
  const strict = buildStrictEdgeExclusion(image);
  const {
    exclusionState,
    queue,
    excludedCount: strictExcludedCount,
    quantizablePixelCount,
  } = strict;
  if (
    strictExcludedCount === 0 ||
    strictExcludedCount === quantizablePixelCount
  )
    return image;
  const pixelCount = image.width * image.height;

  const markFringeCandidate = (pixelIndex: number) => {
    if (
      exclusionState[pixelIndex] === 0 &&
      isOpaqueLightNeutralFringe(image.data, pixelIndex * 4)
    ) {
      exclusionState[pixelIndex] = FRINGE_CANDIDATE;
    }
  };

  for (let queueIndex = 0; queueIndex < strictExcludedCount; queueIndex += 1) {
    const pixelIndex = queue[queueIndex]!;
    const x = pixelIndex % image.width;
    const y = Math.floor(pixelIndex / image.width);
    if (x > 0) markFringeCandidate(pixelIndex - 1);
    if (x + 1 < image.width) markFringeCandidate(pixelIndex + 1);
    if (y > 0) markFringeCandidate(pixelIndex - image.width);
    if (y + 1 < image.height) markFringeCandidate(pixelIndex + image.width);
  }

  let fringeExcludedCount = 0;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (
      exclusionState[pixelIndex] === FRINGE_CANDIDATE &&
      hasDarkerRetainedOpaqueNeighbor(image, exclusionState, pixelIndex)
    ) {
      exclusionState[pixelIndex] = FRINGE_EXCLUDED;
      fringeExcludedCount += 1;
    }
  }

  if (strictExcludedCount + fringeExcludedCount === quantizablePixelCount)
    return image;

  return copyWithExcludedPixels(image, exclusionState, true);
}

function buildStrictEdgeExclusion(image: RgbaImage): StrictEdgeExclusion {
  const pixelCount = image.width * image.height;
  const exclusionState = new Uint8Array(pixelCount);
  const queue = new Uint32Array(pixelCount);
  let queueHead = 0;
  let queueTail = 0;
  let quantizablePixelCount = 0;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (image.data[pixelIndex * 4 + 3]! > QUANTIZABLE_ALPHA_THRESHOLD) {
      quantizablePixelCount += 1;
    }
  }

  const enqueueCandidate = (pixelIndex: number) => {
    if (
      exclusionState[pixelIndex] === 0 &&
      isOpaqueNearWhite(image.data, pixelIndex * 4)
    ) {
      exclusionState[pixelIndex] = STRICT_EXCLUDED;
      queue[queueTail] = pixelIndex;
      queueTail += 1;
    }
  };

  for (let x = 0; x < image.width; x += 1) {
    enqueueCandidate(x);
    enqueueCandidate((image.height - 1) * image.width + x);
  }
  for (let y = 1; y < image.height - 1; y += 1) {
    enqueueCandidate(y * image.width);
    enqueueCandidate(y * image.width + image.width - 1);
  }

  while (queueHead < queueTail) {
    const pixelIndex = queue[queueHead]!;
    queueHead += 1;
    const x = pixelIndex % image.width;
    const y = Math.floor(pixelIndex / image.width);
    if (x > 0) enqueueCandidate(pixelIndex - 1);
    if (x + 1 < image.width) enqueueCandidate(pixelIndex + 1);
    if (y > 0) enqueueCandidate(pixelIndex - image.width);
    if (y + 1 < image.height) enqueueCandidate(pixelIndex + image.width);
  }

  return {
    exclusionState,
    queue,
    excludedCount: queueTail,
    quantizablePixelCount,
  };
}

function copyWithExcludedPixels(
  image: RgbaImage,
  exclusionState: Uint8Array,
  includeFringe: boolean,
): RgbaImage {
  const pixelCount = image.width * image.height;
  const data = new Uint8ClampedArray(image.data);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (
      exclusionState[pixelIndex] === STRICT_EXCLUDED ||
      (includeFringe && exclusionState[pixelIndex] === FRINGE_EXCLUDED)
    ) {
      data.fill(0, pixelIndex * 4, pixelIndex * 4 + 4);
    }
  }
  return { width: image.width, height: image.height, data };
}

function isOpaqueLightNeutralFringe(
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
    minimum >= FRINGE_CHANNEL_MINIMUM &&
    maximum - minimum <= FRINGE_CHANNEL_SPREAD_MAXIMUM
  );
}

function hasDarkerRetainedOpaqueNeighbor(
  image: RgbaImage,
  exclusionState: Uint8Array,
  pixelIndex: number,
): boolean {
  const x = pixelIndex % image.width;
  const y = Math.floor(pixelIndex / image.width);
  const candidateOffset = pixelIndex * 4;
  const candidateRgbSum = rgbSum(image.data, candidateOffset);

  return (
    (x > 0 &&
      isDarkerRetainedOpaqueNeighbor(
        image.data,
        exclusionState,
        candidateRgbSum,
        pixelIndex - 1,
      )) ||
    (x + 1 < image.width &&
      isDarkerRetainedOpaqueNeighbor(
        image.data,
        exclusionState,
        candidateRgbSum,
        pixelIndex + 1,
      )) ||
    (y > 0 &&
      isDarkerRetainedOpaqueNeighbor(
        image.data,
        exclusionState,
        candidateRgbSum,
        pixelIndex - image.width,
      )) ||
    (y + 1 < image.height &&
      isDarkerRetainedOpaqueNeighbor(
        image.data,
        exclusionState,
        candidateRgbSum,
        pixelIndex + image.width,
      ))
  );
}

function isDarkerRetainedOpaqueNeighbor(
  data: Uint8ClampedArray,
  exclusionState: Uint8Array,
  candidateRgbSum: number,
  neighborIndex: number,
): boolean {
  if (exclusionState[neighborIndex] !== 0) return false;
  const neighborOffset = neighborIndex * 4;
  return (
    data[neighborOffset + 3] === 255 &&
    candidateRgbSum - rgbSum(data, neighborOffset) >=
      DARKER_NEIGHBOR_RGB_SUM_DIFFERENCE
  );
}

function rgbSum(data: Uint8ClampedArray, offset: number): number {
  return data[offset]! + data[offset + 1]! + data[offset + 2]!;
}

function isOpaqueNearWhite(data: Uint8ClampedArray, offset: number): boolean {
  if (data[offset + 3] !== 255) return false;
  const red = data[offset]!;
  const green = data[offset + 1]!;
  const blue = data[offset + 2]!;
  const minimum = Math.min(red, green, blue);
  const maximum = Math.max(red, green, blue);
  return (
    minimum >= LIGHT_CHANNEL_MINIMUM &&
    maximum - minimum <= LIGHT_CHANNEL_SPREAD_MAXIMUM
  );
}
