import { z } from "zod";

export const EMAIL_GATE_SCHEMA_VERSION = 1 as const;
export const EMAIL_GATE_MAX_BODY_BYTES = 4_096 as const;
export const EMAIL_GATE_PRODUCTION_ORIGIN =
  "https://generator.poparooz.com" as const;
export const EMAIL_GATE_CHALLENGE_PATH =
  "/api/email-gate/v1/challenges" as const;
export const EMAIL_GATE_VERIFICATION_PATH =
  "/api/email-gate/v1/verifications" as const;

export const EMAIL_GATE_CHALLENGE_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const EMAIL_GATE_OTP_REGEX = /^[0-9]{8}$/;

const EMAIL_GATE_ATEXT_LOCAL_PART_REGEX =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const EMAIL_GATE_DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const emailGateChallengeRequestSchema = z
  .object({
    schemaVersion: z.literal(EMAIL_GATE_SCHEMA_VERSION),
    email: z.string(),
    turnstileToken: z.string().min(1).max(2_048),
  })
  .strict();

export const emailGateVerificationRequestSchema = z
  .object({
    schemaVersion: z.literal(EMAIL_GATE_SCHEMA_VERSION),
    challengeId: z.string().regex(EMAIL_GATE_CHALLENGE_ID_REGEX),
    code: z.string().regex(EMAIL_GATE_OTP_REGEX),
  })
  .strict();

const challengeIssuedSchema = z
  .object({
    schemaVersion: z.literal(EMAIL_GATE_SCHEMA_VERSION),
    result: z.literal("challenge_issued"),
    challengeId: z.string().regex(EMAIL_GATE_CHALLENGE_ID_REGEX),
    expiresInSeconds: z.number().int().positive(),
    resendAfterSeconds: z.number().int().nonnegative(),
  })
  .strict();

const verificationSucceededSchema = z
  .object({
    schemaVersion: z.literal(EMAIL_GATE_SCHEMA_VERSION),
    result: z.literal("verification_succeeded"),
    verified: z.literal(true),
  })
  .strict();

const failureResults = [
  "invalid_request",
  "version_unsupported",
  "verification_invalid",
  "verification_expired",
  "verification_locked",
  "retry_later",
  "service_unavailable",
] as const;

const failureSchemas = failureResults.map((result) =>
  z
    .object({
      schemaVersion: z.literal(EMAIL_GATE_SCHEMA_VERSION),
      result: z.literal(result),
    })
    .strict(),
);

export const emailGateResponseSchema = z.union([
  challengeIssuedSchema,
  verificationSucceededSchema,
  ...failureSchemas,
]);

export type EmailGateChallengeRequest = z.infer<
  typeof emailGateChallengeRequestSchema
>;
export type EmailGateVerificationRequest = z.infer<
  typeof emailGateVerificationRequestSchema
>;
export type EmailGateResponse = z.infer<typeof emailGateResponseSchema>;
export type EmailGateFailureResult = (typeof failureResults)[number];

export type EmailNormalizationResult =
  Readonly<{ ok: true; normalizedEmail: string }> | Readonly<{ ok: false }>;

export function normalizeEmailAddressV1(
  rawEmail: string,
): EmailNormalizationResult {
  const trimmed = rawEmail.replace(/^[\x09\x20]+|[\x09\x20]+$/g, "");

  if (
    trimmed.length === 0 ||
    trimmed.length > 254 ||
    /[^\x00-\x7f]/.test(trimmed) ||
    /[\x00-\x20\x7f]/.test(trimmed)
  ) {
    return Object.freeze({ ok: false });
  }

  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf("@")) {
    return Object.freeze({ ok: false });
  }

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();
  if (
    localPart.length > 64 ||
    !EMAIL_GATE_ATEXT_LOCAL_PART_REGEX.test(localPart) ||
    domain.length === 0 ||
    domain.length > 253 ||
    domain.endsWith(".")
  ) {
    return Object.freeze({ ok: false });
  }

  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length > 63 ||
        label.startsWith("xn--") ||
        !EMAIL_GATE_DOMAIN_LABEL_REGEX.test(label),
    )
  ) {
    return Object.freeze({ ok: false });
  }

  const normalizedEmail = `${localPart}@${domain}`;
  if (normalizedEmail.length > 254) {
    return Object.freeze({ ok: false });
  }

  return Object.freeze({ ok: true, normalizedEmail });
}
