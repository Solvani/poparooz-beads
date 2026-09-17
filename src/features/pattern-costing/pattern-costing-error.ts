export type PatternCostingErrorCode =
  | "REJECT_RAW_JSON_DUPLICATE_KEY"
  | "REJECT_RAW_JSON_MALFORMED_OR_INVALID_UTF8"
  | "REJECT_I_JSON_VIOLATION"
  | "QUARANTINE_SCHEMA_OR_PRIVACY_VIOLATION"
  | "QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISSING"
  | "QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MALFORMED"
  | "QUARANTINE_GENERATOR_IMPLEMENTATION_AUTHORITY_MISMATCH"
  | "QUARANTINE_PROCESSING_POLICY_IDENTITY_MISMATCH"
  | "QUARANTINE_RUNTIME_AUTHORITY_MISMATCH"
  | "QUARANTINE_PRODUCT_RESOLUTION_FAILURE"
  | "QUARANTINE_GENERATION_ATTEMPT_NOT_CURRENT_SUCCESS"
  | "QUARANTINE_COUNT_SEMANTICS_INVALID"
  | "QUARANTINE_FINAL_SNAPSHOT_DIGEST_MISMATCH"
  | "QUARANTINE_PAYLOAD_CHECKSUM_MISMATCH";

export class PatternCostingError extends Error {
  constructor(
    readonly code: PatternCostingErrorCode,
    options?: ErrorOptions,
  ) {
    super("Pattern costing export validation failed.", options);
    this.name = "PatternCostingError";
  }
}

export function fail(code: PatternCostingErrorCode, cause?: unknown): never {
  throw new PatternCostingError(code, { cause });
}
