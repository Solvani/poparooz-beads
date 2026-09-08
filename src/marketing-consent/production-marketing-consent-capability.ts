import {
  UNAVAILABLE_MARKETING_CONSENT_CAPABILITY,
  type MarketingConsentCapability,
} from "./marketing-consent-capability";
import {
  createMarketingConsentBrowserClient,
  type MarketingConsentBrowserClient,
} from "./marketing-consent-client";

export function isProductionMarketingConsentEnabled(
  value: string | undefined,
): boolean {
  return value === "true";
}

const defaultEnabled = isProductionMarketingConsentEnabled(
  import.meta.env.VITE_MARKETING_CONSENT_ENABLED,
);

type AvailableMarketingConsentCapability = Extract<
  MarketingConsentCapability,
  { availability: { available: true } }
>;
type UnavailableMarketingConsentCapability = Extract<
  MarketingConsentCapability,
  { availability: { available: false } }
>;

export function createProductionMarketingConsentCapability(
  enabled: true,
  createClient?: () => MarketingConsentBrowserClient,
): AvailableMarketingConsentCapability;
export function createProductionMarketingConsentCapability(
  enabled: false,
  createClient?: () => MarketingConsentBrowserClient,
): UnavailableMarketingConsentCapability;
export function createProductionMarketingConsentCapability(
  enabled?: boolean,
  createClient?: () => MarketingConsentBrowserClient,
): MarketingConsentCapability;
export function createProductionMarketingConsentCapability(
  enabled = defaultEnabled,
  createClient: () => MarketingConsentBrowserClient = createMarketingConsentBrowserClient,
): MarketingConsentCapability {
  if (!enabled) return UNAVAILABLE_MARKETING_CONSENT_CAPABILITY;

  return Object.freeze({
    availability: Object.freeze({ available: true as const }),
    client: createClient(),
  });
}
