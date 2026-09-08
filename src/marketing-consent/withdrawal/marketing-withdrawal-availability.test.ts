import { describe, expect, it } from "vitest";

import { isProductionMarketingConsentEnabled } from "../production-marketing-consent-capability";
import {
  MARKETING_WITHDRAWAL_FEATURE_UNAVAILABLE,
  isMarketingWithdrawalEnabled,
  resolveMarketingWithdrawalAvailability,
} from "./marketing-withdrawal-availability";

describe("Marketing withdrawal availability", () => {
  it("enables only the exact lowercase true environment value", () => {
    expect(isMarketingWithdrawalEnabled("true")).toBe(true);

    for (const value of [
      undefined,
      "",
      "false",
      "TRUE",
      "1",
      " true ",
      "malformed",
    ]) {
      expect(isMarketingWithdrawalEnabled(value)).toBe(false);
    }
  });

  it("keeps the foundation unavailable even when its independent flag is enabled", () => {
    expect(resolveMarketingWithdrawalAvailability("false")).toEqual({
      enabled: false,
      state: MARKETING_WITHDRAWAL_FEATURE_UNAVAILABLE,
    });
    expect(resolveMarketingWithdrawalAvailability("true")).toEqual({
      enabled: true,
      state: MARKETING_WITHDRAWAL_FEATURE_UNAVAILABLE,
    });
  });

  it("does not couple withdrawal and grant flags", () => {
    expect(isMarketingWithdrawalEnabled("true")).toBe(true);
    expect(isProductionMarketingConsentEnabled("false")).toBe(false);

    expect(isMarketingWithdrawalEnabled("false")).toBe(false);
    expect(isProductionMarketingConsentEnabled("true")).toBe(true);
  });
});
