import type { MarketingConsentCapability } from "./marketing-consent-capability";
import { createMarketingConsentBrowserClient } from "./marketing-consent-client";

export function createProductionMarketingConsentCapability(): Extract<
  MarketingConsentCapability,
  { availability: { available: true } }
> {
  return Object.freeze({
    availability: Object.freeze({ available: true as const }),
    client: createMarketingConsentBrowserClient(),
  });
}
