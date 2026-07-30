import type { RgbaImage } from "../image/image.types";
import { QuantizationError } from "./quantization-errors";
import type { QuantizationOptions } from "./quantization.types";

export const MAX_QUANTIZATION_COLORS = 512;
export const TRANSPARENT_COLOR_INDEX = 65535;

export function validateQuantizationOptions(
  options: QuantizationOptions,
): void {
  if (typeof options !== "object" || options === null) {
    throw new QuantizationError(
      "INVALID_MAX_COLORS",
      "Quantization options are invalid.",
    );
  }

  if (
    typeof options.maxColors !== "number" ||
    !Number.isFinite(options.maxColors) ||
    !Number.isInteger(options.maxColors) ||
    options.maxColors < 1 ||
    options.maxColors > MAX_QUANTIZATION_COLORS
  ) {
    throw new QuantizationError(
      "INVALID_MAX_COLORS",
      "The maximum color count must be an integer within the supported limit.",
    );
  }

  if (
    typeof options.alphaThreshold !== "number" ||
    !Number.isFinite(options.alphaThreshold) ||
    !Number.isInteger(options.alphaThreshold) ||
    options.alphaThreshold < 0 ||
    options.alphaThreshold > 255
  ) {
    throw new QuantizationError(
      "INVALID_ALPHA_THRESHOLD",
      "The alpha threshold must be an integer between 0 and 255.",
    );
  }
}

export function validateQuantizationImage(image: RgbaImage): void {
  if (
    typeof image !== "object" ||
    image === null ||
    !Number.isSafeInteger(image.width) ||
    !Number.isSafeInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0 ||
    image.width > Math.floor(Number.MAX_SAFE_INTEGER / image.height) ||
    !(image.data instanceof Uint8ClampedArray)
  ) {
    throwInvalidImage();
  }

  const pixelCount = image.width * image.height;
  if (
    pixelCount > Math.floor(Number.MAX_SAFE_INTEGER / 4) ||
    image.data.length !== pixelCount * 4
  ) {
    throwInvalidImage();
  }
}

function throwInvalidImage(): never {
  throw new QuantizationError(
    "INVALID_RGBA_IMAGE",
    "The RGBA image dimensions or pixel data are invalid.",
  );
}
