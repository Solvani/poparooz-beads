export const MARKETING_WITHDRAWAL_FEATURE_UNAVAILABLE =
  "FEATURE_UNAVAILABLE" as const;

export interface MarketingWithdrawalAvailability {
  readonly enabled: boolean;
  readonly state: typeof MARKETING_WITHDRAWAL_FEATURE_UNAVAILABLE;
}

export function isMarketingWithdrawalEnabled(
  value: string | undefined,
): boolean {
  return value === "true";
}

export function resolveMarketingWithdrawalAvailability(
  value: string | undefined,
): MarketingWithdrawalAvailability {
  return Object.freeze({
    enabled: isMarketingWithdrawalEnabled(value),
    state: MARKETING_WITHDRAWAL_FEATURE_UNAVAILABLE,
  });
}

export function resolveProductionMarketingWithdrawalAvailability(): MarketingWithdrawalAvailability {
  return resolveMarketingWithdrawalAvailability(
    import.meta.env.VITE_MARKETING_WITHDRAWAL_ENABLED,
  );
}
