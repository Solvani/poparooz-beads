import type { RgbaImage } from "../image/image.types";
import { QuantizationError } from "./quantization-errors";
import { TRANSPARENT_COLOR_INDEX } from "./quantization-options";
import type { QuantizationOptions, QuantizedImage } from "./quantization.types";

export function validateQuantizedResult(
  image: RgbaImage,
  options: QuantizationOptions,
  result: QuantizedImage,
): void {
  const totalPixels = image.width * image.height;
  if (
    result.width !== image.width ||
    result.height !== image.height ||
    result.colorIndices.length !== totalPixels ||
    result.colors.length < 1 ||
    result.colors.length > options.maxColors ||
    result.transparentIndex !== TRANSPARENT_COLOR_INDEX ||
    result.opaquePixelCount + result.transparentPixelCount !== totalPixels ||
    result.colors.reduce((sum, color) => sum + color.pixelCount, 0) !==
      result.opaquePixelCount ||
    result.colorIndices.buffer === image.data.buffer
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
  for (let index = 0; index < result.colors.length; index += 1) {
    const color = result.colors[index]!;
    if (
      color.index !== index ||
      color.pixelCount <= 0 ||
      observedCounts[index] !== color.pixelCount ||
      !Number.isInteger(color.rgb.r) ||
      !Number.isInteger(color.rgb.g) ||
      !Number.isInteger(color.rgb.b) ||
      color.rgb.r < 0 ||
      color.rgb.r > 255 ||
      color.rgb.g < 0 ||
      color.rgb.g > 255 ||
      color.rgb.b < 0 ||
      color.rgb.b > 255 ||
      !Object.values(color.lab).every(Number.isFinite) ||
      Object.values(color.lab).some((value) => Object.is(value, -0))
    ) {
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
