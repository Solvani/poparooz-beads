import { describe, expect, it } from "vitest";

import {
  MARKETING_CONSENT_CHALLENGE_ID_REGEX,
  MARKETING_CONSENT_VERSION,
  marketingConsentGrantRequestSchema,
  marketingConsentResponseSchema,
  marketingConsentWithdrawalRequestSchema,
} from "./marketing-consent-contract";

describe("Marketing Consent shared contract", () => {
  const validRequest = Object.freeze({
    schemaVersion: 1,
    challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
    consentVersion: MARKETING_CONSENT_VERSION,
    affirmativeIntent: true,
  });
  const validWithdrawalRequest = Object.freeze({
    schemaVersion: 1,
    challengeId: "abcdefab-cdef-4abc-8def-abcdefabcdef",
  });

  it("accepts only the exact frozen grant request", () => {
    expect(
      marketingConsentGrantRequestSchema.safeParse(validRequest).success,
    ).toBe(true);
    expect(
      MARKETING_CONSENT_CHALLENGE_ID_REGEX.test(validRequest.challengeId),
    ).toBe(true);
  });

  it.each([
    ["false intent", { ...validRequest, affirmativeIntent: false }],
    [
      "missing intent",
      {
        schemaVersion: 1,
        challengeId: validRequest.challengeId,
        consentVersion: MARKETING_CONSENT_VERSION,
      },
    ],
    ["email", { ...validRequest, email: "forbidden@example.invalid" }],
    ["source context", { ...validRequest, sourceContext: "forbidden" }],
    ["unknown field", { ...validRequest, unknown: true }],
    ["Pattern", { ...validRequest, pattern: "forbidden" }],
    ["image", { ...validRequest, image: "forbidden" }],
    ["PNG", { ...validRequest, png: "forbidden" }],
    ["materials", { ...validRequest, materials: [] }],
    ["colors", { ...validRequest, colors: [] }],
    ["Shopify", { ...validRequest, shopify: {} }],
    ["provider", { ...validRequest, provider: "forbidden" }],
    ["timestamp", { ...validRequest, timestamp: 1 }],
    ["subscription id", { ...validRequest, subscriptionId: "forbidden" }],
    ["event id", { ...validRequest, eventId: "forbidden" }],
  ])("rejects forbidden request shape: %s", (_label, request) => {
    expect(marketingConsentGrantRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });

  it.each([
    "not-a-uuid",
    "abcdefab-cdef-1abc-8def-abcdefabcdef",
    "abcdefab-cdef-4abc-7def-abcdefabcdef",
    "ABCDEFAB-CDEF-4ABC-8DEF-ABCDEFABCDEF",
  ])("rejects invalid or non-canonical challenge id %s", (challengeId) => {
    expect(
      marketingConsentGrantRequestSchema.safeParse({
        ...validRequest,
        challengeId,
      }).success,
    ).toBe(false);
  });

  it.each([null, [], [validRequest], "value", 1, true])(
    "rejects malformed request value %j",
    (request) => {
      expect(
        marketingConsentGrantRequestSchema.safeParse(request).success,
      ).toBe(false);
    },
  );

  it("rejects unsupported schema and consent versions", () => {
    expect(
      marketingConsentGrantRequestSchema.safeParse({
        ...validRequest,
        schemaVersion: 2,
      }).success,
    ).toBe(false);
    expect(
      marketingConsentGrantRequestSchema.safeParse({
        ...validRequest,
        consentVersion: "marketing-consent-v2.0.0",
      }).success,
    ).toBe(false);
  });

  it("accepts only the exact frozen withdrawal request", () => {
    expect(
      marketingConsentWithdrawalRequestSchema.safeParse(validWithdrawalRequest)
        .success,
    ).toBe(true);
  });

  it.each([
    ["missing challenge id", { schemaVersion: 1 }],
    [
      "malformed UUID",
      { ...validWithdrawalRequest, challengeId: "not-a-uuid" },
    ],
    [
      "non-v4 UUID",
      {
        ...validWithdrawalRequest,
        challengeId: "abcdefab-cdef-1abc-8def-abcdefabcdef",
      },
    ],
    [
      "uppercase UUID",
      {
        ...validWithdrawalRequest,
        challengeId: "ABCDEFAB-CDEF-4ABC-8DEF-ABCDEFABCDEF",
      },
    ],
    [
      "email",
      { ...validWithdrawalRequest, email: "forbidden@example.invalid" },
    ],
    [
      "consent version",
      { ...validWithdrawalRequest, consentVersion: MARKETING_CONSENT_VERSION },
    ],
    [
      "affirmative intent",
      { ...validWithdrawalRequest, affirmativeIntent: true },
    ],
    [
      "source context",
      { ...validWithdrawalRequest, sourceContext: "forbidden" },
    ],
    ["timestamp", { ...validWithdrawalRequest, timestamp: 1 }],
    [
      "subscription id",
      { ...validWithdrawalRequest, subscriptionId: "forbidden" },
    ],
    ["event id", { ...validWithdrawalRequest, eventId: "forbidden" }],
    ["operation key", { ...validWithdrawalRequest, operationKey: "forbidden" }],
    ["Shopify", { ...validWithdrawalRequest, shopify: {} }],
    ["provider", { ...validWithdrawalRequest, provider: "forbidden" }],
    ["Pattern", { ...validWithdrawalRequest, pattern: "forbidden" }],
    ["image", { ...validWithdrawalRequest, image: "forbidden" }],
    ["materials", { ...validWithdrawalRequest, materials: [] }],
    ["colors", { ...validWithdrawalRequest, colors: [] }],
    ["unknown field", { ...validWithdrawalRequest, unknown: true }],
    ["unsupported schema", { ...validWithdrawalRequest, schemaVersion: 2 }],
  ])("rejects invalid withdrawal request shape: %s", (_label, request) => {
    expect(
      marketingConsentWithdrawalRequestSchema.safeParse(request).success,
    ).toBe(false);
  });

  it.each([
    null,
    [],
    [validWithdrawalRequest],
    "value",
    1,
    true,
    {},
    { schemaVersion: 1, challengeId: {} },
  ])("rejects malformed withdrawal value %j", (request) => {
    expect(
      marketingConsentWithdrawalRequestSchema.safeParse(request).success,
    ).toBe(false);
  });

  it("keeps every public response envelope closed", () => {
    for (const result of [
      "grant_persisted",
      "already_active",
      "withdrawn",
      "already_withdrawn",
      "not_active",
      "invalid_request",
      "version_unsupported",
      "verification_authority_invalid",
      "service_unavailable",
    ] as const) {
      expect(
        marketingConsentResponseSchema.safeParse({ schemaVersion: 1, result })
          .success,
      ).toBe(true);
      expect(
        marketingConsentResponseSchema.safeParse({
          schemaVersion: 1,
          result,
          canonicalEmail: "forbidden@example.invalid",
        }).success,
      ).toBe(false);
    }
  });
});
