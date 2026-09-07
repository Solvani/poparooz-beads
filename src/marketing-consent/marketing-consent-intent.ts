// Transient intent from a completed verification, never subscription authority.
export interface VerifiedConsentIntent {
  readonly challengeId: string;
  readonly marketingConsent: boolean;
}
