export const PROCESSING_POLICY_ERROR_CODES = [
  "PROCESSING_POLICY_INVALID",
  "PROCESSING_POLICY_PROVIDER_INITIALIZATION_FAILED",
] as const;

export type ProcessingPolicyErrorCode =
  (typeof PROCESSING_POLICY_ERROR_CODES)[number];

export class ProcessingPolicyError extends Error {
  constructor(
    readonly code: ProcessingPolicyErrorCode,
    options?: ErrorOptions,
  ) {
    super("The production processing policy is unavailable.", options);
    this.name = "ProcessingPolicyError";
  }
}
