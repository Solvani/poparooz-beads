export const EMAIL_GATE_CHALLENGE_TTL_MS = 600_000 as const;
export const EMAIL_GATE_COOLDOWN_MS = 60_000 as const;
export const EMAIL_GATE_PROVIDER_LEASE_MS = 15_000 as const;
export const EMAIL_GATE_RESERVATION_MS = 86_400_000 as const;
export const EMAIL_GATE_RETENTION_MS = 7 * 86_400_000;
export const EMAIL_GATE_MAX_PROVIDER_ATTEMPTS = 3 as const;
export const EMAIL_GATE_MAX_WRONG_ATTEMPTS = 5 as const;
export const EMAIL_GATE_GLOBAL_RESERVATION_LIMIT = 90 as const;
export const EMAIL_GATE_OTP_KEY_VERSION = 1 as const;
export const EMAIL_GATE_DELIVERY_PAYLOAD_VERSION = 1 as const;
export const EMAIL_GATE_AGGREGATE_SCHEMA_VERSION = 1 as const;
export const EMAIL_GATE_RECONCILIATION_VERSION = 1 as const;

export const EMAIL_GATE_STATES = [
  "delivery_pending",
  "active",
  "verified",
  "expired",
  "superseded",
  "terminal_failed",
  "delivery_failed",
] as const;

export type EmailGateChallengeState = (typeof EMAIL_GATE_STATES)[number];

export interface EmailGateChallengeRow {
  readonly challengeId: string;
  readonly normalizedEmail: string;
  readonly state: EmailGateChallengeState;
  readonly otpKeyVersion: number;
  readonly providerSendEventId: string;
  readonly deliveryPayloadVersion: number;
  readonly providerAttemptCount: number;
  readonly providerAttemptLeaseUntil: number | null;
  readonly attemptCount: number;
  readonly predecessorChallengeId: string | null;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly activatedAt: number | null;
  readonly verifiedAt: number | null;
  readonly terminalAt: number | null;
  readonly lastProviderAttemptAt: number | null;
  readonly reconciledAt: number | null;
  readonly reconciliationVersion: number | null;
  readonly deletionEligibleAt: number | null;
  readonly rowVersion: number;
}

export type ProviderAttemptOutcome =
  | "accepted"
  | "definite_reject"
  | "ambiguous"
  | "concurrent_idempotency_conflict"
  | "changed_payload_conflict";

export interface ProviderSendResult {
  readonly outcome: ProviderAttemptOutcome;
}

export type VerificationResult =
  | "verification_succeeded"
  | "verification_invalid"
  | "verification_expired"
  | "verification_locked"
  | "retry_later"
  | "service_unavailable";

export function toUtcAggregateDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function remainingSeconds(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}
