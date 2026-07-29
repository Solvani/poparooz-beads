import { ImagePipelineError } from "./image-errors";
import type { NormalizeImageOptions, RgbaImage } from "./image.types";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_DECODED_PIXELS = 40_000_000;
export const MIN_TARGET_DIMENSION = 1;
export const MAX_TARGET_DIMENSION = 4096;
export const MAX_TARGET_PIXELS = 16_777_216;

export function validateFileSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new ImagePipelineError("EMPTY_FILE", "The image file is empty.");
  }
  if (size > MAX_FILE_BYTES) {
    throw new ImagePipelineError(
      "FILE_TOO_LARGE",
      "The image exceeds the current file-size limit.",
      { maximumBytes: MAX_FILE_BYTES },
    );
  }
}

export function validateDecodedImage(image: RgbaImage): void {
  validateImageDimensions(image.width, image.height);
  const pixels = image.width * image.height;
  if (image.data.length !== pixels * 4) {
    throw new ImagePipelineError(
      "INVALID_IMAGE_DIMENSIONS",
      "Decoded RGBA data does not match its dimensions.",
    );
  }
}

export function validateImageDimensions(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new ImagePipelineError(
      "INVALID_IMAGE_DIMENSIONS",
      "Decoded image dimensions must be positive safe integers.",
    );
  }
  if (width > Math.floor(MAX_DECODED_PIXELS / height)) {
    throw new ImagePipelineError(
      "DECODED_PIXEL_LIMIT_EXCEEDED",
      "The decoded image exceeds the current pixel limit.",
      { maximumPixels: MAX_DECODED_PIXELS },
    );
  }
}

export function validateNormalizeOptions(options: NormalizeImageOptions): void {
  const { targetWidth, targetHeight } = options;
  if (
    !Number.isSafeInteger(targetWidth) ||
    !Number.isSafeInteger(targetHeight) ||
    targetWidth < MIN_TARGET_DIMENSION ||
    targetHeight < MIN_TARGET_DIMENSION ||
    targetWidth > MAX_TARGET_DIMENSION ||
    targetHeight > MAX_TARGET_DIMENSION ||
    targetWidth > Math.floor(MAX_TARGET_PIXELS / targetHeight) ||
    options.fit !== "contain" ||
    options.preserveAspectRatio !== true ||
    (options.background !== "transparent" && options.background !== "white")
  ) {
    throw new ImagePipelineError(
      "INVALID_TARGET_DIMENSIONS",
      "Target dimensions or normalization options are outside the supported contract.",
      {
        maximumDimension: MAX_TARGET_DIMENSION,
        maximumPixels: MAX_TARGET_PIXELS,
      },
    );
  }
}
