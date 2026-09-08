import { describe, expect, it, vi } from "vitest";

import { createProductionMarketingConsentCapability } from "../production-marketing-consent-capability";
import { resolveMarketingWithdrawalAvailability } from "./marketing-withdrawal-availability";
import { UNAVAILABLE_MARKETING_WITHDRAWAL_CAPABILITY } from "./marketing-withdrawal-capability";
import type { MarketingWithdrawalBrowserClient } from "./marketing-withdrawal-client";
import { createProductionMarketingWithdrawalCapability } from "./production-marketing-withdrawal-capability";

const client: MarketingWithdrawalBrowserClient = Object.freeze({
  withdraw: vi.fn(),
});

describe("production Marketing withdrawal capability", () => {
  it("fails closed from the current production environment by default", () => {
    expect(createProductionMarketingWithdrawalCapability()).toBe(
      UNAVAILABLE_MARKETING_WITHDRAWAL_CAPABILITY,
    );
  });

  it("does not instantiate a client when the existing availability authority is disabled", () => {
    const createClient = vi.fn(() => client);
    const capability = createProductionMarketingWithdrawalCapability(
      resolveMarketingWithdrawalAvailability("false"),
      createClient,
    );

    expect(capability).toBe(UNAVAILABLE_MARKETING_WITHDRAWAL_CAPABILITY);
    expect(capability.availability).toEqual({ available: false });
    expect("client" in capability).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates the strict client only when exact true enabled the existing authority", () => {
    const createClient = vi.fn(() => client);
    const capability = createProductionMarketingWithdrawalCapability(
      resolveMarketingWithdrawalAvailability("true"),
      createClient,
    );

    expect(capability.availability).toEqual({ available: true });
    expect("client" in capability && capability.client).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "keeps grant=%s and withdrawal=%s mechanically independent",
    (grantEnabled, withdrawalEnabled) => {
      const grantClient = { grant: vi.fn() };
      const withdrawalClient = { withdraw: vi.fn() };
      const grant = createProductionMarketingConsentCapability(
        grantEnabled,
        () => grantClient,
      );
      const withdrawal = createProductionMarketingWithdrawalCapability(
        resolveMarketingWithdrawalAvailability(
          withdrawalEnabled ? "true" : "false",
        ),
        () => withdrawalClient,
      );

      expect(grant.availability.available).toBe(grantEnabled);
      expect(withdrawal.availability.available).toBe(withdrawalEnabled);
      expect("client" in grant).toBe(grantEnabled);
      expect("client" in withdrawal).toBe(withdrawalEnabled);
    },
  );
});
