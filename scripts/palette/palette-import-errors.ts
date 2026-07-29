export const PALETTE_IMPORT_ISSUE_CODES = [
  "CSV_PARSE_ERROR",
  "MISSING_HEADER",
  "UNKNOWN_HEADER",
  "DUPLICATE_HEADER",
  "EMPTY_REQUIRED_FIELD",
  "INVALID_BOOLEAN",
  "INVALID_NUMBER",
  "DOMAIN_VALIDATION_ERROR",
  "DUPLICATE_REFERENCE_CODE",
  "DUPLICATE_DISPLAY_CODE",
  "METADATA_VALIDATION_ERROR",
] as const;

export type PaletteImportIssueCode =
  (typeof PALETTE_IMPORT_ISSUE_CODES)[number];

export interface PaletteImportIssue {
  row?: number;
  column?: string;
  code: PaletteImportIssueCode;
  message: string;
  value?: unknown;
}
