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
