# Poparooz Email Gate OTP V2 Contract

Status: **AUTHORIZED / IMPLEMENTED / REPOSITORY AUTHORITY ESTABLISHED BY THIS COMMIT / NOT YET DEPLOYED / NOT YET ACCEPTED**

Workstream: `GEN Email Gate OTP UX`

Stage: `EMAIL-GATE-OTP-UX-P01`

Primary authority: `GEN｜生成器总控`

## 1. Authority relationship

This document introduces a separate Email Gate OTP V2 authority. It does not
amend, broaden, or replace OTP V1.

- OTP V1 remains frozen at exactly eight ASCII digits and remains available for
  legacy clients and legacy challenges.
- OTP V2 is exactly six ASCII digits and is the authority for newly issued OTPs
  requested by the new client after the compatible Worker is live.
- A V1 contract must not accept V2 input, and a V2 contract must not accept V1
  input.

## 2. V2 protocol

V2 uses explicit versioned routes and strict request schemas:

```text
POST /api/email-gate/v2/challenges
POST /api/email-gate/v2/verifications
schemaVersion = 2
OTP regex = ^[0-9]{6}$
```

The retained V1 routes and `schemaVersion = 1` continue to require exactly eight
ASCII digits. Route and schema-version mismatches fail closed. Submitted code
length never selects the protocol or OTP algorithm.

## 3. Trusted challenge discrimination

The existing D1 `delivery_payload_version` value is the trusted challenge marker:

- value `1` selects the retained V1 derivation, renderer, and eight-digit
  comparison;
- value `2` selects the V2 derivation, renderer, and six-digit comparison;
- an existing challenge without a valid V2 marker is not reinterpreted as V2.

Verification loads the challenge first and requires its trusted delivery version
to match the explicitly requested protocol version before OTP derivation or
attempt mutation. No D1 schema migration is required or authorized.

## 4. V2 derivation

V2 retains the existing production OTP key material while using a distinct
derivation identity:

```text
Algorithm identifier: POPAROOZ_EMAIL_GATE_OTP_V2
Domain separator: poparooz-email-gate:otp:v2
Output modulus: 1,000,000
Rejection threshold: 4,294,000,000
Output format: six zero-padded ASCII decimal digits
```

The input remains deterministically bound to the challenge ID. Rejection
sampling removes modulo bias; V2 is not a truncation of the V1 decimal output.
Timing-safe comparison remains required for equal-format values.

Normative V2 vectors for key bytes
`000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f`:

```text
00000000-0000-4000-8000-000000000000 -> 622702
00000000-0000-4000-8000-000000000003 -> 089031
00000000-0000-4000-8000-000000000008 -> 123091
00000000-0000-4000-8000-000000000026 -> 458489
```

The frozen V1 vectors remain unchanged.

## 5. Lifecycle and rollout

Existing TTL, Turnstile, resend throttling, maximum-attempt locking,
supersession, expiry, retention, and server-authoritative verification semantics
remain in force. An incompatible recoverable `delivery_pending` challenge may be
terminalized after its provider lease and existing issuance cooldown permit a
fresh version-compatible challenge. Active V1 challenges retain their normal V1
authority until expiry, consumption, or existing lifecycle transition.

Production order is mandatory:

1. commit the reviewed V1/V2 authority and compatible implementation;
2. deploy and verify the V1+V2 Worker;
3. only then push/deploy the Pages V2 client;
4. perform bounded production verification.

The commit containing this document establishes repository implementation
authority. Worker deployment, Pages deployment, production verification, master
acceptance, closure, and Feishu synchronization are not established by that
commit.

## 6. Preserved boundaries

- Email verification remains required for Download.
- Marketing Consent remains optional and independent.
- Marketing failures do not block or reverse verification, unlock, or Download.
- The accepted P05 Marketing lifecycle is not replayed or rewritten.
- User images and Pattern/PNG processing remain browser-local.
- OTP values, challenge secrets, Turnstile tokens, and customer PII are not
  logged or persisted in plaintext.
