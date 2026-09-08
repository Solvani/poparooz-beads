import { describe, expect, it, vi } from "vitest";

import { UNAVAILABLE_MARKETING_CONSENT_CAPABILITY } from "./marketing-consent-capability";
import type { MarketingConsentBrowserClient } from "./marketing-consent-client";
import {
  createProductionMarketingConsentCapability,
  isProductionMarketingConsentEnabled,
} from "./production-marketing-consent-capability";

describe("production Marketing Consent capability", () => {
  it("enables only the exact lowercase true environment value", () => {
    expect(isProductionMarketingConsentEnabled("true")).toBe(true);

    for (const value of [
      undefined,
      "",
      "false",
      "TRUE",
      "1",
      " true ",
      "malformed",
    ]) {
      expect(isProductionMarketingConsentEnabled(value)).toBe(false);
    }
  });

  it("fails closed without constructing a browser client", () => {
    const createClient = vi.fn<() => MarketingConsentBrowserClient>();

    const capability = createProductionMarketingConsentCapability(
      false,
      createClient,
    );

    expect(capability).toBe(UNAVAILABLE_MARKETING_CONSENT_CAPABILITY);
    expect(capability.availability).toEqual({ available: false });
    expect("client" in capability).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("fails closed when the environment value is absent", () => {
    expect(createProductionMarketingConsentCapability()).toBe(
      UNAVAILABLE_MARKETING_CONSENT_CAPABILITY,
    );
  });

  it("preserves the configured browser client when enabled", () => {
    const client: MarketingConsentBrowserClient = Object.freeze({
      grant: vi.fn(),
    });
    const createClient = vi.fn(() => client);

    const capability = createProductionMarketingConsentCapability(
      true,
      createClient,
    );

    expect(capability.availability).toEqual({ available: true });
    expect(createClient).toHaveBeenCalledOnce();
    expect("client" in capability && capability.client).toBe(client);
  });
});
