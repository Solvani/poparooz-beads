export const GENERATION_PALETTE_ADAPTER_ERROR_CODES = [
  "GENERATION_PALETTE_INPUT_INVALID",
  "GENERATION_PALETTE_IDENTITY_MISMATCH",
  "GENERATION_PALETTE_COUNT_MISMATCH",
  "GENERATION_PALETTE_COLOR_INVALID",
  "GENERATION_PALETTE_DUPLICATE_CODE",
  "GENERATION_PALETTE_SORT_ORDER_INVALID",
  "GENERATION_PALETTE_OUTPUT_INVALID",
] as const;

export type GenerationPaletteAdapterErrorCode =
  (typeof GENERATION_PALETTE_ADAPTER_ERROR_CODES)[number];

const SAFE_MESSAGES: Readonly<
  Record<GenerationPaletteAdapterErrorCode, string>
> = Object.freeze({
  GENERATION_PALETTE_INPUT_INVALID:
    "The Runtime Palette input is invalid for generation.",
  GENERATION_PALETTE_IDENTITY_MISMATCH:
    "The Runtime Palette identity is invalid for generation.",
  GENERATION_PALETTE_COUNT_MISMATCH:
    "The Runtime Palette counts are invalid for generation.",
  GENERATION_PALETTE_COLOR_INVALID:
    "A Runtime Palette color is invalid for generation.",
  GENERATION_PALETTE_DUPLICATE_CODE:
    "The Runtime Palette contains a duplicate generation color code.",
  GENERATION_PALETTE_SORT_ORDER_INVALID:
    "The Runtime Palette generation color order is invalid.",
  GENERATION_PALETTE_OUTPUT_INVALID:
    "The Generation Palette output is invalid.",
});

export class GenerationPaletteAdapterError extends Error {
  readonly code: GenerationPaletteAdapterErrorCode;

  constructor(code: GenerationPaletteAdapterErrorCode) {
    super(SAFE_MESSAGES[code]);
    this.name = "GenerationPaletteAdapterError";
    this.code = code;
  }
}
