import type { EmailGateBrowserClient } from "./email-gate-client";
import type { EmailGateUnlockStore } from "./local-unlock";

export interface EmailGateIssueProofProvider {
  getFreshIssueToken(signal: AbortSignal): Promise<string>;
  readonly interaction?: Readonly<{
    isActive(): boolean;
    subscribe(listener: () => void): () => void;
  }>;
}

export type EmailGateCapability =
  | Readonly<{
      availability: Readonly<{ available: false }>;
    }>
  | Readonly<{
      availability: Readonly<{ available: true }>;
      client: EmailGateBrowserClient;
      issueProofProvider: EmailGateIssueProofProvider;
      unlockStore: EmailGateUnlockStore;
    }>;

export const UNAVAILABLE_EMAIL_GATE_CAPABILITY: EmailGateCapability =
  Object.freeze({
    availability: Object.freeze({ available: false as const }),
  });
