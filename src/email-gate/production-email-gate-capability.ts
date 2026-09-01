import type { EmailGateCapability } from "./email-gate-capability";
import { createEmailGateBrowserClient } from "./email-gate-client";
import { createBrowserEmailGateUnlockStore } from "./local-unlock";
import {
  EMAIL_GATE_TURNSTILE_ACTION,
  EMAIL_GATE_TURNSTILE_SITEKEY,
  createTurnstileIssueProofProvider,
} from "./turnstile-issue-proof-provider";

type AvailableEmailGateCapability = Extract<
  EmailGateCapability,
  { availability: { available: true } }
>;

export function createProductionEmailGateCapability(): AvailableEmailGateCapability {
  return Object.freeze({
    availability: Object.freeze({ available: true as const }),
    client: createEmailGateBrowserClient(),
    issueProofProvider: createTurnstileIssueProofProvider({
      sitekey: EMAIL_GATE_TURNSTILE_SITEKEY,
      action: EMAIL_GATE_TURNSTILE_ACTION,
      appearance: "interaction-only",
      tabindex: 0,
    }),
    unlockStore: createBrowserEmailGateUnlockStore(),
  });
}
