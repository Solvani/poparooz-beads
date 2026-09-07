import type { MarketingConsentBrowserClient } from "./marketing-consent-client";

export type MarketingConsentCapability =
  | Readonly<{ availability: Readonly<{ available: false }> }>
  | Readonly<{
      availability: Readonly<{ available: true }>;
      client: MarketingConsentBrowserClient;
    }>;

export const UNAVAILABLE_MARKETING_CONSENT_CAPABILITY: MarketingConsentCapability =
  Object.freeze({ availability: Object.freeze({ available: false as const }) });
