import type { RgbaImage } from "./image.types";

const QUANTIZABLE_ALPHA_THRESHOLD = 16;
const LIGHT_CHANNEL_MINIMUM = 248;
const LIGHT_CHANNEL_SPREAD_MAXIMUM = 6;

export function excludeEdgeConnectedLightBackground(
  image: RgbaImage,
): RgbaImage {
  const pixelCount = image.width * image.height;
  if (pixelCount === 0) return image;

  const excluded = new Uint8Array(pixelCount);
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
      excluded[pixelIndex] === 0 &&
      isOpaqueNearWhite(image.data, pixelIndex * 4)
    ) {
      excluded[pixelIndex] = 1;
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

  if (queueTail === 0 || queueTail === quantizablePixelCount) return image;

  const data = new Uint8ClampedArray(image.data);
  for (let queueIndex = 0; queueIndex < queueTail; queueIndex += 1) {
    const offset = queue[queueIndex]! * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
  }
  return { width: image.width, height: image.height, data };
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
