export const PATTERN_ASSEMBLY_ERROR_CODES = [
  "INVALID_QUANTIZED_IMAGE",
  "INVALID_PALETTE",
  "NO_ELIGIBLE_PALETTE_COLORS",
  "INVALID_BOARD_PROFILE",
  "INVALID_QUANTIZED_COLOR_INDEX",
  "MISSING_QUANTIZED_COLOR_MAPPING",
  "INVALID_PATTERN_COLOR_INDEX",
  "PATTERN_COLOR_CAPACITY_EXCEEDED",
  "INVALID_PATTERN_MATRIX",
  "INVALID_MATERIAL_REQUIREMENT",
  "INVALID_BOARD_LAYOUT",
  "INVALID_PATTERN_RESULT",
  "PUBLIC_PATTERN_MAPPING_FAILED",
] as const;

export type PatternAssemblyErrorCode =
  (typeof PATTERN_ASSEMBLY_ERROR_CODES)[number];

export class PatternAssemblyError extends Error {
  readonly code: PatternAssemblyErrorCode;
  readonly causeCode?: string;

  constructor(
    code: PatternAssemblyErrorCode,
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.name = "PatternAssemblyError";
    this.code = code;
    this.causeCode = causeCode;
  }
}
