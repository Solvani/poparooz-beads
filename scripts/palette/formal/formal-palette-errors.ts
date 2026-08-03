export const FORMAL_PALETTE_ISSUE_CODES = [
  "INVALID_MANIFEST",
  "INVALID_NORMALIZED_RECORD",
  "RECORD_COUNT_MISMATCH",
  "DUPLICATE_CODE",
  "DUPLICATE_HEX",
  "DUPLICATE_CANONICAL_INDEX",
  "NON_CONTIGUOUS_CANONICAL_INDEX",
  "UNKNOWN_SERIES",
  "DUPLICATE_SERIES",
  "CODE_SERIES_MISMATCH",
  "SERIES_RANK_MISMATCH",
  "INVALID_HEX",
  "INVALID_DISPLAY_NAME_STATE",
  "INVALID_DIGITAL_COLOR_STATUS",
  "INVALID_PHYSICAL_COLOR_STATUS",
  "INVALID_SOURCE_HASH",
] as const;

export type FormalPaletteIssueCode =
  (typeof FORMAL_PALETTE_ISSUE_CODES)[number];

export const FORMAL_PALETTE_COMPILATION_ERROR_CODES = [
  "SOURCE_NOT_FOUND",
  "SOURCE_HASH_MISMATCH",
  "SOURCE_INPUT_CONFLICT",
  "WORKBOOK_PARSE_FAILED",
  "WORKBOOK_LAYOUT_INVALID",
  "PALETTE_VALIDATION_FAILED",
  "SUBSTITUTE_VALIDATION_FAILED",
  "STAGING_STATE_INVALID",
  "STAGING_WRITE_FAILED",
  "STAGING_VERIFICATION_FAILED",
  "PUBLICATION_FAILED",
  "PUBLICATION_RECOVERY_REQUIRED",
  "FORMAL_PACKAGE_INVENTORY_MISMATCH",
  "FORMAL_PACKAGE_CONTENT_MISMATCH",
  "INTERNAL_ERROR",
  "INVALID_WORKSHEETS",
  "MISSING_WORKSHEET",
  "INVALID_PALETTE_LAYOUT",
  "INVALID_SUBSTITUTE_LAYOUT",
  "INVALID_FIXED_LAYOUT",
  "INVALID_LEVEL_SUMMARY",
  "INVALID_SUBSTITUTE_HEADER",
  "INVALID_SUBSTITUTE_SERIAL",
  "INVALID_SUBSTITUTE_FIELD",
  "INVALID_SUBSTITUTE_LEVEL",
  "INVALID_DELTA_E",
  "MISSING_CODE",
  "MISSING_HEX",
  "INVALID_CODE",
  "UNEXPECTED_PALETTE_CONTENT",
  "NON_CONTIGUOUS_SERIES",
  "COLOR_DERIVATION_FAILED",
  "MISSING_PALETTE_CODE",
  "SUBSTITUTE_HEX_MISMATCH",
  "SELF_RELATION",
  "DUPLICATE_RELATION",
  "MISSING_BUSINESS_ORDER",
  "RELATION_COUNT_MISMATCH",
  "SUBSTITUTE_LEVEL_COUNT_MISMATCH",
] as const;

export type FormalPaletteCompilationErrorCode =
  | FormalPaletteIssueCode
  | (typeof FORMAL_PALETTE_COMPILATION_ERROR_CODES)[number];

export class FormalPaletteCompilationError extends Error {
  readonly code: FormalPaletteCompilationErrorCode;

  constructor(
    code: FormalPaletteCompilationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(`[${code}] ${sanitizeFormalPaletteErrorMessage(message)}`, options);
    this.name = "FormalPaletteCompilationError";
    this.code = code;
  }
}

export function sanitizeFormalPaletteErrorMessage(message: string): string {
  return message
    .replace(/[A-Za-z]:[\\/][^\s"']+/g, "<path>")
    .replace(/(?:^|\s)\/(?:[^\s/]+\/)+[^\s"']*/g, " <path>")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);
}

export function isFormalPaletteCompilationError(
  error: unknown,
): error is FormalPaletteCompilationError {
  return error instanceof FormalPaletteCompilationError;
}

export function formatFormalPaletteCliError(error: unknown): string {
  return isFormalPaletteCompilationError(error)
    ? error.message
    : "[INTERNAL_ERROR] Formal Palette compilation failed unexpectedly.";
}

export interface FormalPaletteIssue {
  readonly code: FormalPaletteIssueCode;
  readonly message: string;
  readonly path: readonly (string | number)[];
  readonly recordIndex?: number;
  readonly colorCode?: string;
}

export type FormalPaletteValidationResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly issues: readonly FormalPaletteIssue[] };

export function formalIssueMessage(
  code: FormalPaletteIssueCode,
  message: string,
): string {
  return `[${code}] ${message}`;
}
