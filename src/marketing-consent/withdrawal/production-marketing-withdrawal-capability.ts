import {
  UNAVAILABLE_MARKETING_WITHDRAWAL_CAPABILITY,
  type MarketingWithdrawalCapability,
} from "./marketing-withdrawal-capability";
import {
  createMarketingWithdrawalBrowserClient,
  type MarketingWithdrawalBrowserClient,
} from "./marketing-withdrawal-client";
import {
  resolveProductionMarketingWithdrawalAvailability,
  type MarketingWithdrawalAvailability,
} from "./marketing-withdrawal-availability";

export function createProductionMarketingWithdrawalCapability(
  availability: MarketingWithdrawalAvailability = resolveProductionMarketingWithdrawalAvailability(),
  createClient: () => MarketingWithdrawalBrowserClient = createMarketingWithdrawalBrowserClient,
): MarketingWithdrawalCapability {
  if (!availability.enabled) return UNAVAILABLE_MARKETING_WITHDRAWAL_CAPABILITY;

  return Object.freeze({
    availability: Object.freeze({ available: true as const }),
    client: createClient(),
  });
}
