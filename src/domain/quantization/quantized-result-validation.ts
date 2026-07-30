import type { RgbaImage } from "../image/image.types";
import { validateLabColor } from "../color/lab-validation";
import { QuantizationError } from "./quantization-errors";
import { TRANSPARENT_COLOR_INDEX } from "./quantization-options";
import type { QuantizationOptions, QuantizedImage } from "./quantization.types";

export function validateQuantizedResult(
  image: RgbaImage,
  options: QuantizationOptions,
  result: QuantizedImage,
): void {
  validateQuantizedImage(result);
  if (
    result.width !== image.width ||
    result.height !== image.height ||
    result.colors.length > options.maxColors ||
    result.colorIndices.buffer === image.data.buffer
  ) {
    throwInvalidResult();
  }
}

export function validateQuantizedImage(result: QuantizedImage): void {
  if (
    typeof result !== "object" ||
    result === null ||
    !Number.isSafeInteger(result.width) ||
    !Number.isSafeInteger(result.height) ||
    result.width <= 0 ||
    result.height <= 0 ||
    result.width > Math.floor(Number.MAX_SAFE_INTEGER / result.height) ||
    !Array.isArray(result.colors) ||
    !(result.colorIndices instanceof Uint16Array) ||
    result.transparentIndex !== TRANSPARENT_COLOR_INDEX ||
    !Number.isSafeInteger(result.opaquePixelCount) ||
    !Number.isSafeInteger(result.transparentPixelCount) ||
    result.opaquePixelCount < 0 ||
    result.transparentPixelCount < 0
  ) {
    throwInvalidResult();
  }

  const totalPixels = result.width * result.height;
  if (
    result.colorIndices.length !== totalPixels ||
    result.colors.length < 1 ||
    result.colors.length >= TRANSPARENT_COLOR_INDEX ||
    result.opaquePixelCount + result.transparentPixelCount !== totalPixels
  ) {
    throwInvalidResult();
  }

  const seenIndices = new Set<number>();
  let declaredOpaqueCount = 0;
  for (const color of result.colors) {
    if (
      typeof color !== "object" ||
      color === null ||
      !Number.isSafeInteger(color.index) ||
      color.index < 0 ||
      color.index >= result.colors.length ||
      seenIndices.has(color.index) ||
      !Number.isSafeInteger(color.pixelCount) ||
      color.pixelCount <= 0 ||
      typeof color.rgb !== "object" ||
      color.rgb === null ||
      !Number.isInteger(color.rgb.r) ||
      !Number.isInteger(color.rgb.g) ||
      !Number.isInteger(color.rgb.b) ||
      color.rgb.r < 0 ||
      color.rgb.r > 255 ||
      color.rgb.g < 0 ||
      color.rgb.g > 255 ||
      color.rgb.b < 0 ||
      color.rgb.b > 255 ||
      typeof color.lab !== "object" ||
      color.lab === null ||
      Object.values(color.lab).some((value) => Object.is(value, -0))
    ) {
      throwInvalidResult();
    }
    try {
      validateLabColor(color.lab);
    } catch {
      throwInvalidResult();
    }
    seenIndices.add(color.index);
    declaredOpaqueCount += color.pixelCount;
  }
  if (
    seenIndices.size !== result.colors.length ||
    declaredOpaqueCount !== result.opaquePixelCount
  ) {
    throwInvalidResult();
  }

  const observedCounts = new Uint32Array(result.colors.length);
  let observedTransparent = 0;
  for (const index of result.colorIndices) {
    if (index === TRANSPARENT_COLOR_INDEX) {
      observedTransparent += 1;
    } else if (index < result.colors.length) {
      observedCounts[index] = observedCounts[index]! + 1;
    } else {
      throwInvalidResult();
    }
  }

  if (observedTransparent !== result.transparentPixelCount) {
    throwInvalidResult();
  }
  for (const color of result.colors) {
    if (observedCounts[color.index] !== color.pixelCount) {
      throwInvalidResult();
    }
  }
}

function throwInvalidResult(): never {
  throw new QuantizationError(
    "INVALID_CLUSTER_RESULT",
    "The quantized image violates an output invariant.",
  );
}
