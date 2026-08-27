import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  EMAIL_GATE_CHALLENGE_ID_REGEX,
  EMAIL_GATE_OTP_REGEX,
  emailGateChallengeRequestSchema,
  emailGateResponseSchema,
  emailGateVerificationRequestSchema,
  normalizeEmailAddressV1,
} from "./email-gate-contract";

describe("Email Gate shared contract", () => {
  it("normalizes only outer ASCII space/HTAB and lowercases only the domain", () => {
    expect(normalizeEmailAddressV1(" \tExample.Tag+1@EXAMPLE.COM\t ")).toEqual({
      ok: true,
      normalizedEmail: "Example.Tag+1@example.com",
    });
  });

  it.each([
    "",
    "a@example.com\n",
    "a b@example.com",
    "a\u00a0@example.com",
    "a@@example.com",
    ".a@example.com",
    "a..b@example.com",
    "a@localhost",
    "a@example.com.",
    "a@-example.com",
    "a@example-.com",
    "a@xn--example.com",
    "a@exam_ple.com",
    "用@example.com",
  ])("rejects disallowed address %j", (email) => {
    expect(normalizeEmailAddressV1(email)).toEqual({ ok: false });
  });

  it("enforces local, label, domain, and complete-address byte boundaries", () => {
    expect(normalizeEmailAddressV1(`${"a".repeat(64)}@example.com`).ok).toBe(
      true,
    );
    expect(normalizeEmailAddressV1(`${"a".repeat(65)}@example.com`).ok).toBe(
      false,
    );
    expect(normalizeEmailAddressV1(`a@${"b".repeat(63)}.com`).ok).toBe(true);
    expect(normalizeEmailAddressV1(`a@${"b".repeat(64)}.com`).ok).toBe(false);
    const domain253 = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    expect(domain253).toHaveLength(253);
    expect(normalizeEmailAddressV1(`a@${domain253}`).ok).toBe(false);
  });

  it("strictly validates request shapes and token/code/UUID boundaries", () => {
    const challengeBase = {
      schemaVersion: 1,
      email: "a@example.com",
      turnstileToken: "x",
    };
    expect(
      emailGateChallengeRequestSchema.safeParse(challengeBase).success,
    ).toBe(true);
    expect(
      emailGateChallengeRequestSchema.safeParse({
        ...challengeBase,
        turnstileToken: "x".repeat(2_048),
      }).success,
    ).toBe(true);
    expect(
      emailGateChallengeRequestSchema.safeParse({
        ...challengeBase,
        turnstileToken: "x".repeat(2_049),
      }).success,
    ).toBe(false);
    expect(
      emailGateChallengeRequestSchema.safeParse({ ...challengeBase, extra: 1 })
        .success,
    ).toBe(false);

    const challengeId = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    expect(EMAIL_GATE_CHALLENGE_ID_REGEX.test(challengeId)).toBe(true);
    expect(EMAIL_GATE_CHALLENGE_ID_REGEX.test(challengeId.toUpperCase())).toBe(
      false,
    );
    expect(EMAIL_GATE_OTP_REGEX.test("01234567")).toBe(true);
    expect(EMAIL_GATE_OTP_REGEX.test("1234567")).toBe(false);
    expect(EMAIL_GATE_OTP_REGEX.test("123456789")).toBe(false);
    expect(EMAIL_GATE_OTP_REGEX.test("1234a678")).toBe(false);
    expect(
      emailGateVerificationRequestSchema.safeParse({
        schemaVersion: 1,
        challengeId,
        code: "01234567",
      }).success,
    ).toBe(true);
  });

  it("keeps response unions closed", () => {
    expect(
      emailGateResponseSchema.safeParse({
        schemaVersion: 1,
        result: "verification_succeeded",
        verified: true,
        email: "forbidden@example.com",
      }).success,
    ).toBe(false);
    expect(
      emailGateResponseSchema.safeParse({
        schemaVersion: 1,
        result: "retry_later",
        retryAfterSeconds: 60,
      }).success,
    ).toBe(false);
  });

  it("has no frontend, Worker binding, provider, Pattern, PNG, or Shopify dependency", () => {
    const source = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "email-gate-contract.ts",
      ),
      "utf8",
    );
    expect(source).not.toMatch(
      /from ["'](?:react|cloudflare:|.*(?:worker\/email-gate|pattern|png|shopify|resend|turnstile))/i,
    );
    expect(source.match(/^import /gm)).toHaveLength(1);
    expect(source).toContain('from "zod"');
  });
});
