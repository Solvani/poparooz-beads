import { describe, expect, it, vi } from "vitest";

import type { EmailGateBrowserClient } from "../../email-gate/email-gate-client";
import type { EmailGateIssueProofProvider } from "../../email-gate/email-gate-capability";
import { resolveMarketingWithdrawalAvailability } from "./marketing-withdrawal-availability";
import type { MarketingWithdrawalBrowserClient } from "./marketing-withdrawal-client";
import type { MarketingWithdrawalVerificationCapability } from "./marketing-withdrawal-verification-capability";
import {
  UNAVAILABLE_MARKETING_WITHDRAWAL_ROUTE_CAPABILITY,
  createProductionMarketingWithdrawalRouteCapability,
} from "./production-marketing-withdrawal-verification-capability";

const emailClient: EmailGateBrowserClient = {
  issueChallenge: vi.fn(),
  verifyChallenge: vi.fn(),
};
const proofProvider: EmailGateIssueProofProvider = {
  getFreshIssueToken: vi.fn(),
};
const verification: MarketingWithdrawalVerificationCapability = {
  client: emailClient,
  issueProofProvider: proofProvider,
};
const withdrawalClient: MarketingWithdrawalBrowserClient = {
  withdraw: vi.fn(),
};

describe("production withdrawal route capability", () => {
  it("constructs no dependency when the withdrawal flag is disabled", () => {
    const createVerification = vi.fn(() => verification);
    const createWithdrawal = vi.fn();
    const result = createProductionMarketingWithdrawalRouteCapability(
      resolveMarketingWithdrawalAvailability("false"),
      createVerification,
      createWithdrawal,
    );

    expect(result).toBe(UNAVAILABLE_MARKETING_WITHDRAWAL_ROUTE_CAPABILITY);
    expect(createVerification).not.toHaveBeenCalled();
    expect(createWithdrawal).not.toHaveBeenCalled();
  });

  it("constructs only the narrow verification and I02 withdrawal capabilities when enabled", () => {
    const createVerification = vi.fn(() => verification);
    const createWithdrawal = vi.fn(() => ({
      availability: { available: true as const },
      client: withdrawalClient,
    }));
    const availability = resolveMarketingWithdrawalAvailability("true");
    const result = createProductionMarketingWithdrawalRouteCapability(
      availability,
      createVerification,
      createWithdrawal,
    );

    expect(result).toEqual({
      available: true,
      verification,
      withdrawal: {
        availability: { available: true },
        client: withdrawalClient,
      },
    });
    expect(createVerification).toHaveBeenCalledOnce();
    expect(createWithdrawal).toHaveBeenCalledWith(availability);
    expect("unlockStore" in verification).toBe(false);
  });
});
