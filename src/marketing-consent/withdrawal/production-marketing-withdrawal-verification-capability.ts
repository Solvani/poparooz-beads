import { createEmailGateBrowserClient } from "../../email-gate/email-gate-client";
import {
  EMAIL_GATE_TURNSTILE_ACTION,
  EMAIL_GATE_TURNSTILE_SITEKEY,
  createTurnstileIssueProofProvider,
} from "../../email-gate/turnstile-issue-proof-provider";
import type { MarketingWithdrawalAvailability } from "./marketing-withdrawal-availability";
import type { MarketingWithdrawalCapability } from "./marketing-withdrawal-capability";
import type { MarketingWithdrawalVerificationCapability } from "./marketing-withdrawal-verification-capability";
import { createProductionMarketingWithdrawalCapability } from "./production-marketing-withdrawal-capability";

export type MarketingWithdrawalRouteCapability =
  | Readonly<{ available: false }>
  | Readonly<{
      available: true;
      verification: MarketingWithdrawalVerificationCapability;
      withdrawal: Extract<
        MarketingWithdrawalCapability,
        { availability: { available: true } }
      >;
    }>;

export const UNAVAILABLE_MARKETING_WITHDRAWAL_ROUTE_CAPABILITY: MarketingWithdrawalRouteCapability =
  Object.freeze({ available: false as const });

export function createProductionMarketingWithdrawalVerificationCapability(): MarketingWithdrawalVerificationCapability {
  return Object.freeze({
    client: createEmailGateBrowserClient(),
    issueProofProvider: createTurnstileIssueProofProvider({
      sitekey: EMAIL_GATE_TURNSTILE_SITEKEY,
      action: EMAIL_GATE_TURNSTILE_ACTION,
      appearance: "interaction-only",
      tabindex: 0,
    }),
  });
}

export function createProductionMarketingWithdrawalRouteCapability(
  availability: MarketingWithdrawalAvailability,
  createVerification: () => MarketingWithdrawalVerificationCapability = createProductionMarketingWithdrawalVerificationCapability,
  createWithdrawal: (
    availability: MarketingWithdrawalAvailability,
  ) => MarketingWithdrawalCapability = createProductionMarketingWithdrawalCapability,
): MarketingWithdrawalRouteCapability {
  if (!availability.enabled)
    return UNAVAILABLE_MARKETING_WITHDRAWAL_ROUTE_CAPABILITY;

  const withdrawal = createWithdrawal(availability);
  if (!withdrawal.availability.available || !("client" in withdrawal))
    return UNAVAILABLE_MARKETING_WITHDRAWAL_ROUTE_CAPABILITY;

  return Object.freeze({
    available: true as const,
    verification: createVerification(),
    withdrawal,
  });
}
