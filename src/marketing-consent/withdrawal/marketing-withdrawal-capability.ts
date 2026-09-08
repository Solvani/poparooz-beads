import type { MarketingWithdrawalBrowserClient } from "./marketing-withdrawal-client";

export type MarketingWithdrawalCapability =
  | Readonly<{ availability: Readonly<{ available: false }> }>
  | Readonly<{
      availability: Readonly<{ available: true }>;
      client: MarketingWithdrawalBrowserClient;
    }>;

export const UNAVAILABLE_MARKETING_WITHDRAWAL_CAPABILITY: MarketingWithdrawalCapability =
  Object.freeze({
    availability: Object.freeze({ available: false as const }),
  });
