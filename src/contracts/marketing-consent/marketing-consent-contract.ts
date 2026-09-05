import { z } from "zod";

export const MARKETING_CONSENT_SCHEMA_VERSION = 1 as const;
export const MARKETING_CONSENT_VERSION = "marketing-consent-v1.0.0" as const;
export const MARKETING_CONSENT_MAX_BODY_BYTES = 4_096 as const;
export const MARKETING_CONSENT_PRODUCTION_ORIGIN =
  "https://generator.poparooz.com" as const;
export const MARKETING_CONSENT_GRANT_PATH =
  "/api/marketing-consent/v1/grants" as const;
export const MARKETING_CONSENT_WITHDRAWAL_PATH =
  "/api/marketing-consent/v1/withdrawals" as const;

export const MARKETING_CONSENT_CHALLENGE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const marketingConsentGrantRequestSchema = z
  .object({
    schemaVersion: z.literal(MARKETING_CONSENT_SCHEMA_VERSION),
    challengeId: z.string().regex(MARKETING_CONSENT_CHALLENGE_ID_REGEX),
    consentVersion: z.literal(MARKETING_CONSENT_VERSION),
    affirmativeIntent: z.literal(true),
  })
  .strict();

export const marketingConsentWithdrawalRequestSchema = z
  .object({
    schemaVersion: z.literal(MARKETING_CONSENT_SCHEMA_VERSION),
    challengeId: z.string().regex(MARKETING_CONSENT_CHALLENGE_ID_REGEX),
  })
  .strict();

const responseResults = [
  "grant_persisted",
  "already_active",
  "withdrawn",
  "already_withdrawn",
  "not_active",
  "invalid_request",
  "version_unsupported",
  "verification_authority_invalid",
  "service_unavailable",
] as const;

const responseSchemas = responseResults.map((result) =>
  z
    .object({
      schemaVersion: z.literal(MARKETING_CONSENT_SCHEMA_VERSION),
      result: z.literal(result),
    })
    .strict(),
);

export const marketingConsentResponseSchema = z.union(responseSchemas);

export type MarketingConsentGrantRequest = z.infer<
  typeof marketingConsentGrantRequestSchema
>;
export type MarketingConsentWithdrawalRequest = z.infer<
  typeof marketingConsentWithdrawalRequestSchema
>;
export type MarketingConsentResponse = z.infer<
  typeof marketingConsentResponseSchema
>;
export type MarketingConsentResponseResult = (typeof responseResults)[number];
