export const RUNTIME_PALETTE_BROWSER_ERROR_CODES = [
  "RUNTIME_PALETTE_SCHEMA_INVALID",
  "RUNTIME_PALETTE_IDENTITY_MISMATCH",
  "RUNTIME_PALETTE_COUNT_MISMATCH",
  "RUNTIME_PALETTE_COLOR_INVALID",
  "RUNTIME_PALETTE_DUPLICATE_CODE",
  "RUNTIME_PALETTE_SORT_ORDER_INVALID",
  "RUNTIME_PALETTE_POLICY_INVALID",
  "RUNTIME_PALETTE_PROVIDER_INITIALIZATION_FAILED",
] as const;

export type RuntimePaletteBrowserErrorCode =
  (typeof RUNTIME_PALETTE_BROWSER_ERROR_CODES)[number];

const SAFE_MESSAGES: Readonly<Record<RuntimePaletteBrowserErrorCode, string>> =
  Object.freeze({
    RUNTIME_PALETTE_SCHEMA_INVALID: "The Runtime Palette format is invalid.",
    RUNTIME_PALETTE_IDENTITY_MISMATCH:
      "The Runtime Palette identity is invalid.",
    RUNTIME_PALETTE_COUNT_MISMATCH:
      "The Runtime Palette color count is invalid.",
    RUNTIME_PALETTE_COLOR_INVALID: "A Runtime Palette color is invalid.",
    RUNTIME_PALETTE_DUPLICATE_CODE:
      "The Runtime Palette contains a duplicate color code.",
    RUNTIME_PALETTE_SORT_ORDER_INVALID:
      "The Runtime Palette color order is invalid.",
    RUNTIME_PALETTE_POLICY_INVALID:
      "The Runtime Palette eligibility policy is invalid.",
    RUNTIME_PALETTE_PROVIDER_INITIALIZATION_FAILED:
      "The Runtime Palette is unavailable.",
  });

export class RuntimePaletteBrowserError extends Error {
  readonly code: RuntimePaletteBrowserErrorCode;
  readonly field?: string;
  readonly recordIndex?: number;

  constructor(
    code: RuntimePaletteBrowserErrorCode,
    details?: { readonly field?: string; readonly recordIndex?: number },
  ) {
    super(SAFE_MESSAGES[code]);
    this.name = "RuntimePaletteBrowserError";
    this.code = code;
    this.field = details?.field;
    this.recordIndex = details?.recordIndex;
  }
}
