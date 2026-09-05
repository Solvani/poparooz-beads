import { describe, expect, it, vi } from "vitest";

import { MARKETING_CONSENT_VERSION } from "../../../src/contracts/marketing-consent/marketing-consent-contract";
import type { EmailGateChallengeState } from "../model";
import type {
  MarketingConsentAuthorityRepository,
  MarketingConsentAuthorityRow,
} from "../repository/marketing-consent-authority-repository";
import type {
  MarketingConsentGrantResult,
  MarketingConsentRepository,
} from "../repository/marketing-consent-repository";
import {
  MARKETING_CONSENT_AUTHORITY_WINDOW_MS,
  createMarketingConsentService,
} from "../service/marketing-consent-service";

const CHALLENGE_ID = "abcdefab-cdef-4abc-8def-abcdefabcdef";
const SUBSCRIPTION_ID = "10000000-0000-4000-8000-000000000001";
const EVENT_ID = "20000000-0000-4000-8000-000000000002";

const REQUEST = Object.freeze({
  schemaVersion: 1 as const,
  challengeId: CHALLENGE_ID,
  consentVersion: MARKETING_CONSENT_VERSION,
  affirmativeIntent: true as const,
});

function authority(
  overrides: Partial<MarketingConsentAuthorityRow> = {},
): MarketingConsentAuthorityRow {
  return Object.freeze({
    challengeId: CHALLENGE_ID,
    normalizedEmail: "server-owned@example.invalid",
    state: "verified",
    createdAt: 100,
    verifiedAt: 200,
    ...overrides,
  });
}

function fixture(
  row: MarketingConsentAuthorityRow | null = authority(),
  now = 300,
) {
  const findChallengeAuthority = vi.fn(async () => row);
  const grant = vi.fn(
    async (): Promise<MarketingConsentGrantResult> => "grant_persisted",
  );
  const authorityRepository: MarketingConsentAuthorityRepository =
    Object.freeze({ findChallengeAuthority });
  const marketingRepository: MarketingConsentRepository = Object.freeze({
    grant,
    withdraw: vi.fn(async () => "not_active" as const),
  });
  const randomUuid = vi
    .fn<() => string>()
    .mockReturnValueOnce(SUBSCRIPTION_ID)
    .mockReturnValueOnce(EVENT_ID);
  const service = createMarketingConsentService({
    authorityRepository,
    marketingRepository,
    now: () => now,
    randomUuid,
  });
  return { service, findChallengeAuthority, grant, randomUuid };
}

describe("Marketing Consent authority service", () => {
  it("passes only server-resolved authority and server-owned transition values", async () => {
    const test = fixture();
    await expect(test.service.grant(REQUEST)).resolves.toBe("grant_persisted");
    expect(test.findChallengeAuthority).toHaveBeenCalledWith(CHALLENGE_ID);
    expect(test.grant).toHaveBeenCalledWith({
      canonicalEmail: "server-owned@example.invalid",
      challengeId: CHALLENGE_ID,
      challengeCreatedAt: 100,
      challengeVerifiedAt: 200,
      timestamp: 300,
      subscriptionId: SUBSCRIPTION_ID,
      eventId: EVENT_ID,
    });
    expect(test.randomUuid).toHaveBeenCalledTimes(2);
  });

  it("accepts the inclusive 600000ms authority boundary", async () => {
    const test = fixture(
      authority({ createdAt: 0, verifiedAt: 10 }),
      10 + MARKETING_CONSENT_AUTHORITY_WINDOW_MS,
    );
    await expect(test.service.grant(REQUEST)).resolves.toBe("grant_persisted");
    expect(test.grant).toHaveBeenCalledOnce();
  });

  it("rejects 600001ms authority without persistence", async () => {
    const test = fixture(
      authority({ createdAt: 0, verifiedAt: 10 }),
      11 + MARKETING_CONSENT_AUTHORITY_WINDOW_MS,
    );
    await expect(test.service.grant(REQUEST)).resolves.toBe(
      "verification_authority_invalid",
    );
    expect(test.grant).not.toHaveBeenCalled();
    expect(test.randomUuid).not.toHaveBeenCalled();
  });

  it("rejects missing, null-verified, and future-dated authority uniformly", async () => {
    for (const [row, now] of [
      [null, 300],
      [authority({ verifiedAt: null }), 300],
      [authority({ createdAt: 100, verifiedAt: 301 }), 300],
    ] as const) {
      const test = fixture(row, now);
      await expect(test.service.grant(REQUEST)).resolves.toBe(
        "verification_authority_invalid",
      );
      expect(test.grant).not.toHaveBeenCalled();
    }
  });

  it.each([
    "delivery_pending",
    "active",
    "expired",
    "superseded",
    "terminal_failed",
    "delivery_failed",
  ] as const)(
    "rejects nonverified state %s without persistence",
    async (state) => {
      const test = fixture(authority({ state }));
      await expect(test.service.grant(REQUEST)).resolves.toBe(
        "verification_authority_invalid",
      );
      expect(test.grant).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed server authority without exposing a narrower reason", async () => {
    for (const row of [
      authority({ challengeId: "00000000-0000-4000-8000-000000000099" }),
      authority({ normalizedEmail: "" }),
      authority({ createdAt: -1 }),
      authority({ createdAt: 201, verifiedAt: 200 }),
    ]) {
      const test = fixture(row);
      await expect(test.service.grant(REQUEST)).resolves.toBe(
        "verification_authority_invalid",
      );
      expect(test.grant).not.toHaveBeenCalled();
    }
  });

  it("maps repository authority rejection and failures without detail leakage", async () => {
    const rejected = fixture();
    rejected.grant.mockResolvedValueOnce("verification_authority_invalid");
    await expect(rejected.service.grant(REQUEST)).resolves.toBe(
      "verification_authority_invalid",
    );

    const failed = fixture();
    failed.grant.mockRejectedValueOnce(new Error("private database detail"));
    await expect(failed.service.grant(REQUEST)).resolves.toBe(
      "service_unavailable",
    );
  });

  it("maps authority lookup and server dependency failures to service_unavailable", async () => {
    const lookup = fixture();
    lookup.findChallengeAuthority.mockRejectedValueOnce(
      new Error("private lookup detail"),
    );
    await expect(lookup.service.grant(REQUEST)).resolves.toBe(
      "service_unavailable",
    );

    const badClock = fixture(authority(), Number.NaN);
    await expect(badClock.service.grant(REQUEST)).resolves.toBe(
      "service_unavailable",
    );

    const badUuid = fixture();
    badUuid.randomUuid.mockReset().mockReturnValue("not-a-uuid");
    await expect(badUuid.service.grant(REQUEST)).resolves.toBe(
      "service_unavailable",
    );
  });

  it("defines every known Email Gate state in the authority test matrix", () => {
    const covered = new Set<EmailGateChallengeState>([
      "verified",
      "delivery_pending",
      "active",
      "expired",
      "superseded",
      "terminal_failed",
      "delivery_failed",
    ]);
    expect(covered.size).toBe(7);
  });
});
