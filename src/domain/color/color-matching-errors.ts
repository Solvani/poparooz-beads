export const COLOR_MATCHING_ERROR_CODES = [
  "INVALID_LAB_COLOR",
  "EMPTY_PALETTE",
  "NO_ELIGIBLE_PALETTE_COLORS",
  "INVALID_PALETTE_CANDIDATE",
  "NON_FINITE_COLOR_DISTANCE",
] as const;

export type ColorMatchingErrorCode =
  (typeof COLOR_MATCHING_ERROR_CODES)[number];

export class ColorMatchingError extends Error {
  readonly code: ColorMatchingErrorCode;

  constructor(code: ColorMatchingErrorCode, message: string) {
    super(message);
    this.name = "ColorMatchingError";
    this.code = code;
  }
}
