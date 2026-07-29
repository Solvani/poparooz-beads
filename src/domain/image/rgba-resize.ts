import { validateDecodedImage, validateImageDimensions } from "./image-limits";
import type { RgbaImage } from "./image.types";

export function resizeRgbaImage(
  source: RgbaImage,
  targetWidth: number,
  targetHeight: number,
): RgbaImage {
  validateDecodedImage(source);
  validateImageDimensions(targetWidth, targetHeight);
  if (source.width === targetWidth && source.height === targetHeight) {
    return { ...source, data: new Uint8ClampedArray(source.data) };
  }
  return targetWidth > source.width || targetHeight > source.height
    ? resizeBilinear(source, targetWidth, targetHeight)
    : resizeAreaAverage(source, targetWidth, targetHeight);
}

function resizeAreaAverage(
  source: RgbaImage,
  targetWidth: number,
  targetHeight: number,
): RgbaImage {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  const scaleX = source.width / targetWidth;
  const scaleY = source.height / targetHeight;

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceTop = targetY * scaleY;
    const sourceBottom = (targetY + 1) * scaleY;
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceLeft = targetX * scaleX;
      const sourceRight = (targetX + 1) * scaleX;
      let weightedAlpha = 0;
      let weightedRed = 0;
      let weightedGreen = 0;
      let weightedBlue = 0;
      let totalArea = 0;

      for (
        let sourceY = Math.floor(sourceTop);
        sourceY < Math.ceil(sourceBottom);
        sourceY += 1
      ) {
        const overlapY = Math.max(
          0,
          Math.min(sourceBottom, sourceY + 1) - Math.max(sourceTop, sourceY),
        );
        for (
          let sourceX = Math.floor(sourceLeft);
          sourceX < Math.ceil(sourceRight);
          sourceX += 1
        ) {
          const overlapX = Math.max(
            0,
            Math.min(sourceRight, sourceX + 1) - Math.max(sourceLeft, sourceX),
          );
          const area = overlapX * overlapY;
          const sourceIndex = (sourceY * source.width + sourceX) * 4;
          const alpha = source.data[sourceIndex + 3]! / 255;
          totalArea += area;
          weightedAlpha += alpha * area;
          weightedRed += source.data[sourceIndex]! * alpha * area;
          weightedGreen += source.data[sourceIndex + 1]! * alpha * area;
          weightedBlue += source.data[sourceIndex + 2]! * alpha * area;
        }
      }

      writeUnpremultipliedPixel(
        output,
        (targetY * targetWidth + targetX) * 4,
        weightedRed,
        weightedGreen,
        weightedBlue,
        weightedAlpha,
        totalArea,
      );
    }
  }
  return { width: targetWidth, height: targetHeight, data: output };
}

function resizeBilinear(
  source: RgbaImage,
  targetWidth: number,
  targetHeight: number,
): RgbaImage {
  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = (targetY + 0.5) * (source.height / targetHeight) - 0.5;
    const y0 = Math.floor(sourceY);
    const yWeight = sourceY - y0;
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = (targetX + 0.5) * (source.width / targetWidth) - 0.5;
      const x0 = Math.floor(sourceX);
      const xWeight = sourceX - x0;
      const samples = [
        [x0, y0, (1 - xWeight) * (1 - yWeight)],
        [x0 + 1, y0, xWeight * (1 - yWeight)],
        [x0, y0 + 1, (1 - xWeight) * yWeight],
        [x0 + 1, y0 + 1, xWeight * yWeight],
      ] as const;
      let alpha = 0;
      let red = 0;
      let green = 0;
      let blue = 0;

      for (const [sampleX, sampleY, weight] of samples) {
        const clampedX = Math.min(source.width - 1, Math.max(0, sampleX));
        const clampedY = Math.min(source.height - 1, Math.max(0, sampleY));
        const sourceIndex = (clampedY * source.width + clampedX) * 4;
        const sampleAlpha = source.data[sourceIndex + 3]! / 255;
        alpha += sampleAlpha * weight;
        red += source.data[sourceIndex]! * sampleAlpha * weight;
        green += source.data[sourceIndex + 1]! * sampleAlpha * weight;
        blue += source.data[sourceIndex + 2]! * sampleAlpha * weight;
      }
      writeUnpremultipliedPixel(
        output,
        (targetY * targetWidth + targetX) * 4,
        red,
        green,
        blue,
        alpha,
        1,
      );
    }
  }
  return { width: targetWidth, height: targetHeight, data: output };
}

function writeUnpremultipliedPixel(
  output: Uint8ClampedArray,
  index: number,
  red: number,
  green: number,
  blue: number,
  weightedAlpha: number,
  totalWeight: number,
): void {
  if (weightedAlpha <= 0 || totalWeight <= 0) {
    output.fill(0, index, index + 4);
    return;
  }
  output[index] = roundChannel(red / weightedAlpha);
  output[index + 1] = roundChannel(green / weightedAlpha);
  output[index + 2] = roundChannel(blue / weightedAlpha);
  output[index + 3] = roundChannel((weightedAlpha / totalWeight) * 255);
}

function roundChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.floor(value + 0.5)));
}
