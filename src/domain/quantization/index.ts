export {
  QUANTIZATION_ERROR_CODES,
  QuantizationError,
  type QuantizationErrorCode,
} from "./quantization-errors";
export {
  MAX_QUANTIZATION_COLORS,
  TRANSPARENT_COLOR_INDEX,
  validateQuantizationImage,
  validateQuantizationOptions,
} from "./quantization-options";
export { quantizeImage } from "./quantize-image";
export {
  validateQuantizedImage,
  validateQuantizedResult,
} from "./quantized-result-validation";
export type {
  QuantizationOptions,
  QuantizedColor,
  QuantizedImage,
} from "./quantization.types";
