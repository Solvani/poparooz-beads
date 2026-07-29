import { calculateContainFit } from "./contain-fit";
import { ImagePipelineError } from "./image-errors";
import { validateDecodedImage, validateNormalizeOptions } from "./image-limits";
import { getOrientedDimensions } from "./exif-transform";
import { resizeRgbaImage } from "./rgba-resize";
import type {
  ImageSourceMetadata,
  NormalizedImageResult,
  NormalizeImageOptions,
  RgbaImage,
} from "./image.types";

export function normalizeRgbaImage(
  orientedImage: RgbaImage,
  source: ImageSourceMetadata,
  options: NormalizeImageOptions,
): NormalizedImageResult {
  validateDecodedImage(orientedImage);
  validateNormalizeOptions(options);
  validateSourceMetadata(orientedImage, source);
  const target = calculateContainFit(
    orientedImage.width,
    orientedImage.height,
    options,
  );
  const resized = resizeRgbaImage(
    orientedImage,
    target.drawWidth,
    target.drawHeight,
  );
  const image = createBackground(
    target.width,
    target.height,
    options.background,
  );

  for (let y = 0; y < resized.height; y += 1) {
    for (let x = 0; x < resized.width; x += 1) {
      const sourceIndex = (y * resized.width + x) * 4;
      const destinationIndex =
        ((target.drawY + y) * image.width + target.drawX + x) * 4;
      compositePixel(
        resized.data,
        sourceIndex,
        image.data,
        destinationIndex,
        options.background,
      );
    }
  }
  return { source: { ...source }, target, image };
}

function validateSourceMetadata(
  image: RgbaImage,
  source: ImageSourceMetadata,
): void {
  const expected = getOrientedDimensions(
    source.originalWidth,
    source.originalHeight,
    source.exifOrientation,
  );
  if (
    source.orientedWidth !== expected.width ||
    source.orientedHeight !== expected.height ||
    image.width !== source.orientedWidth ||
    image.height !== source.orientedHeight
  ) {
    throw new ImagePipelineError(
      "INVALID_IMAGE_DIMENSIONS",
      "Decoded image dimensions do not match the orientation metadata.",
    );
  }
}

function createBackground(
  width: number,
  height: number,
  background: "transparent" | "white",
): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  if (background === "white") data.fill(255);
  return { width, height, data };
}

function compositePixel(
  source: Uint8ClampedArray,
  sourceIndex: number,
  destination: Uint8ClampedArray,
  destinationIndex: number,
  background: "transparent" | "white",
): void {
  const alpha = source[sourceIndex + 3]!;
  if (background === "transparent") {
    if (alpha === 0)
      destination.fill(0, destinationIndex, destinationIndex + 4);
    else
      destination.set(
        source.subarray(sourceIndex, sourceIndex + 4),
        destinationIndex,
      );
    return;
  }
  const inverseAlpha = 255 - alpha;
  for (let channel = 0; channel < 3; channel += 1) {
    destination[destinationIndex + channel] = Math.floor(
      (source[sourceIndex + channel]! * alpha + 255 * inverseAlpha) / 255 + 0.5,
    );
  }
  destination[destinationIndex + 3] = 255;
}
