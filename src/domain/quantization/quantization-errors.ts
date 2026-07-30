export const QUANTIZATION_ERROR_CODES = [
  "INVALID_RGBA_IMAGE",
  "INVALID_MAX_COLORS",
  "INVALID_ALPHA_THRESHOLD",
  "NO_QUANTIZABLE_PIXELS",
  "INVALID_HISTOGRAM_ENTRY",
  "UNSPLITTABLE_QUANTIZATION_BOX",
  "INVALID_CLUSTER_RESULT",
  "QUANTIZATION_FAILED",
] as const;

export type QuantizationErrorCode = (typeof QUANTIZATION_ERROR_CODES)[number];

export class QuantizationError extends Error {
  readonly code: QuantizationErrorCode;

  constructor(code: QuantizationErrorCode, message: string) {
    super(message);
    this.name = "QuantizationError";
    this.code = code;
  }
}
