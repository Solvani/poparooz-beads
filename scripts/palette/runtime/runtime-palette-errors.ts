export const RUNTIME_PALETTE_ERROR_CODES = [
  "INPUT_READ_FAILED",
  "INPUT_JSON_INVALID",
  "FORMAL_MANIFEST_INVALID",
  "FORMAL_PALETTE_INVALID",
  "FORMAL_VALIDATION_REPORT_INVALID",
  "DERIVATION_AUDIT_INVALID",
  "DERIVATION_MISMATCH",
  "RUNTIME_POLICY_INVALID",
  "RUNTIME_ARTIFACT_INVALID",
  "RUNTIME_ARTIFACT_MISMATCH",
  "RUNTIME_LOCK_INPUT_INVALID",
  "RUNTIME_LOCK_INVALID",
  "RUNTIME_PRODUCTION_GATE_CONFIG_INVALID",
  "RUNTIME_PRODUCTION_LOCK_MISSING",
  "RUNTIME_PRODUCTION_LOCK_HASH_MISMATCH",
  "RUNTIME_PRODUCTION_LOCK_INVALID",
  "RUNTIME_PRODUCTION_INPUT_MISSING",
  "RUNTIME_PRODUCTION_INPUT_HASH_MISMATCH",
  "RUNTIME_PRODUCTION_INPUT_LENGTH_MISMATCH",
  "RUNTIME_PRODUCTION_ARTIFACT_MISSING",
  "RUNTIME_PRODUCTION_ARTIFACT_HASH_MISMATCH",
  "RUNTIME_PRODUCTION_ARTIFACT_INVALID",
  "RUNTIME_PRODUCTION_ARTIFACT_RECOMPILE_MISMATCH",
  "RUNTIME_PRODUCTION_INVENTORY_INVALID",
  "RUNTIME_PRODUCTION_PATH_INVALID",
  "PUBLICATION_CONFLICT",
  "PUBLICATION_FAILED",
  "INTERNAL_ERROR",
] as const;

export type RuntimePaletteErrorCode =
  (typeof RUNTIME_PALETTE_ERROR_CODES)[number];

export class RuntimePaletteCompilationError extends Error {
  readonly code: RuntimePaletteErrorCode;

  constructor(
    code: RuntimePaletteErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(`[${code}] ${sanitizeRuntimePaletteErrorMessage(message)}`, options);
    this.name = "RuntimePaletteCompilationError";
    this.code = code;
  }
}

export function formatRuntimePaletteCliError(error: unknown): string {
  return error instanceof RuntimePaletteCompilationError
    ? error.message
    : "[INTERNAL_ERROR] Runtime Palette compilation failed unexpectedly.";
}

function sanitizeRuntimePaletteErrorMessage(message: string): string {
  return message
    .replace(/[A-Za-z]:[\\/][^\s"']+/g, "<path>")
    .replace(/(?:^|\s)\/(?:[^\s/]+\/)+[^\s"']*/g, " <path>")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);
}
