import { validateDecodedImage } from "./image-limits";
import type { RgbaImage } from "./image.types";

export function applyTransparentAlphaOccupancy(
  image: RgbaImage,
  thresholdByte: number,
): RgbaImage {
  validateDecodedImage(image);
  if (
    !Number.isInteger(thresholdByte) ||
    thresholdByte < 0 ||
    thresholdByte > 255
  ) {
    throw new RangeError(
      "The transparent occupancy threshold must be an integer between 0 and 255.",
    );
  }

  let output: Uint8ClampedArray | undefined;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3]!;
    const excluded = alpha <= thresholdByte;
    const requiresChange = excluded
      ? image.data[offset] !== 0 ||
        image.data[offset + 1] !== 0 ||
        image.data[offset + 2] !== 0 ||
        alpha !== 0
      : alpha !== 255;

    if (!requiresChange) continue;
    output ??= new Uint8ClampedArray(image.data);
    if (excluded) {
      output.fill(0, offset, offset + 4);
    } else {
      output[offset + 3] = 255;
    }
  }

  return output === undefined
    ? image
    : { width: image.width, height: image.height, data: output };
}
