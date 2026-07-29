import { validateDecodedImage } from "./image-limits";
import type { ExifOrientation, RgbaImage } from "./image.types";

export function getOrientedDimensions(
  width: number,
  height: number,
  orientation: ExifOrientation,
): { width: number; height: number } {
  return orientation >= 5
    ? { width: height, height: width }
    : { width, height };
}

export function applyExifOrientation(
  image: RgbaImage,
  orientation: ExifOrientation,
): RgbaImage {
  validateDecodedImage(image);
  const dimensions = getOrientedDimensions(
    image.width,
    image.height,
    orientation,
  );
  const output = new Uint8ClampedArray(
    dimensions.width * dimensions.height * 4,
  );

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const destination = destinationPoint(
        x,
        y,
        image.width,
        image.height,
        orientation,
      );
      const sourceIndex = (y * image.width + x) * 4;
      const destinationIndex =
        (destination.y * dimensions.width + destination.x) * 4;
      output.set(
        image.data.subarray(sourceIndex, sourceIndex + 4),
        destinationIndex,
      );
    }
  }

  return { ...dimensions, data: output };
}

function destinationPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: ExifOrientation,
): { x: number; y: number } {
  switch (orientation) {
    case 1:
      return { x, y };
    case 2:
      return { x: width - 1 - x, y };
    case 3:
      return { x: width - 1 - x, y: height - 1 - y };
    case 4:
      return { x, y: height - 1 - y };
    case 5:
      return { x: y, y: x };
    case 6:
      return { x: height - 1 - y, y: x };
    case 7:
      return { x: height - 1 - y, y: width - 1 - x };
    case 8:
      return { x: y, y: width - 1 - x };
  }
}
