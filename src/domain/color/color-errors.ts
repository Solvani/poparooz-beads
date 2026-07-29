export const COLOR_CONVERSION_ERROR_CODES = [
  "INVALID_RGB_CHANNEL",
  "RGB_CHANNEL_OUT_OF_RANGE",
  "INVALID_NORMALIZED_CHANNEL",
  "INVALID_LINEAR_RGB",
  "INVALID_XYZ",
  "NON_FINITE_COLOR_VALUE",
] as const;

export type ColorConversionErrorCode =
  (typeof COLOR_CONVERSION_ERROR_CODES)[number];

export class ColorConversionError extends Error {
  readonly code: ColorConversionErrorCode;

  constructor(code: ColorConversionErrorCode, message: string) {
    super(message);
    this.name = "ColorConversionError";
    this.code = code;
  }
}
