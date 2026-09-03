# Poparooz P3-A03-E04-A08-A01 Bounded Production Acceptance Verification

Stage: `P3-A03-E04-A08-A01`

Status: **COMPLETED / PRODUCTION VERIFIED / ACCEPTED**

Parent: `P3-A03-E04-A08` — Email Gate Production Acceptance & Governance
Reconciliation

Parent status: **COMPLETED / PRODUCTION VERIFIED / FROZEN / CLOSED**

## 1. Authority and closure

This record closes the bounded production-acceptance work left open by
`P3-A03-E04-A08-A00`. A00 remains an unchanged historical record of what was
known during its read-only governance reconciliation. This A01 record
supersedes A00 only for the later production-acceptance qualifications resolved
by the evidence below.

The closure recorded here becomes canonical only after this docs-only
governance change is independently reviewed, committed, and pushed.

## 2. Accepted implementation and production baseline

```text
Repository branch: main
Latest accepted implementation HEAD: ca49d9f05a49a39d09e57ff86c909864f8dfb856
Implementation subject: fix: use manual resend redirect handling
Production Worker version: 428f410a-a6ce-496d-b5b2-75e40c2edbdf
Production traffic: 100%
Previous Worker version retained: e681db7d-1239-4004-8cd2-0d8c94e6363c
Previous Worker active traffic: 0%
```

The active candidate was verified to have these binding names:

- `EMAIL_GATE_DB`
- `OTP_DERIVATION_KEY`
- `RESEND_API_KEY`
- `TURNSTILE_SECRET`

No secret value is recorded here.

## 3. Observed production acceptance evidence

### Shopify embed and gate entry

The live Shopify pattern-maker integration included:

```html
sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
```

The `allow-forms` production correction restored actual Email Gate form
submission inside the sandboxed iframe. Popup and top-navigation permissions
remained absent.

In a fresh locked browser, attempting Download entered the real Email Gate. No
bypass path was observed before successful verification.

### Turnstile and Siteverify

The real production request passed the browser challenge and server
verification stages sufficiently to create a D1 challenge and reach provider
delivery. The earlier Siteverify redirect-policy correction had resolved the
historical Siteverify transport failure.

### Resend provider transport

Before the final redirect correction, production evidence showed fresh D1
provider attempts with `provider_attempt_count = 1`, while the challenge did
not activate. The newly rotated valid Resend r2 key remained at zero uses, and
Resend contained no request log. At that point the production adapter still
used `redirect: "error"`.

The final approved single-variable production change in
`ca49d9f05a49a39d09e57ff86c909864f8dfb856` was:

```diff
-    redirect: "error",
+    redirect: "manual",
```

Production retained the exact `https://api.resend.com/emails` endpoint, `POST`, `Authorization`,
`Content-Type`, `Idempotency-Key`, `User-Agent: poparooz-email-gate/1.0`, the
request body, timeout, `AbortSignal`, bounded provider-response parsing, and
the fail-closed result model. It did not add `redirect: "follow"`, `Location`
processing, manual redirect following, or a second provider fetch.

After that exact Worker version was deployed at 100%, the current r2 Resend API
key showed real Last used activity, Resend Logs recorded `POST /emails`, Resend
returned HTTP 200, the real verification email was delivered, and the OTP flow
completed.

Classification: **Production Resend transport failure resolved by replacing
explicit `redirect: "error"` with `redirect: "manual"`.**

The earlier User-Agent change remains required provider-compatibility
hardening and is retained. The available evidence does not establish it as the
unique historical root cause.

### OTP, verification, and PNG

The human entered the received eight-digit OTP only in the real webpage.
Verification succeeded, the original pending Pattern resumed, and the expected
Poparooz Pattern PNG downloaded. No OTP, token, email content, or secret is
recorded here.

Image, Pattern, and PNG generation remained browser-local. Email verification
did not turn image processing into a server-side upload flow.

### D1 verified-state post-check

A SELECT-only aggregate production post-check returned exactly:

| Aggregate field                | Value           |
| ------------------------------ | --------------- |
| `state`                        | `verified`      |
| `provider_attempt_count`       | `1`             |
| `attempt_count`                | `0`             |
| `row_count`                    | `1`             |
| `activated_in_window`          | `1`             |
| `verified_in_window`           | `1`             |
| `verified_terminal_consistent` | `1`             |
| `earliest_created_at_ms`       | `1788424380329` |
| `earliest_activated_at_ms`     | `1788424380841` |
| `earliest_verified_at_ms`      | `1788424429250` |

Query metadata was `rows_read = 7` and `rows_written = 0`. This confirms the
canonical verified-state contract: `activated_at` exists, `verified_at`
exists, and `terminal_at = verified_at`.

The aggregate did not select or expose a normalized email, challenge ID,
provider send event ID, OTP, Turnstile token, or secret.

### Local unlock and fresh-session behavior

In the same browser and same private session after verification, another
Download proceeded without presenting the Email Gate again. This verifies the
intended browser-local unlock convenience.

After every private/incognito window was closed, a completely new private
session was opened. Generator -> Generate -> Download presented the Email Gate
again. No second verification email was requested. This confirms that the
unlock is not a permanent account entitlement and that fresh browser storage
remains locked.

## 4. Historical H12 smoke qualification

The original Windows `curl` reproduction was a command-quoting false negative.
A subsequent Node `JSON.stringify` reproduction returned the expected HTTP 400
with `schemaVersion: 1` and `result: version_unsupported`. The original `curl`
invocation therefore does not support an open parser-defect claim. This record
does not infer evidence beyond that established reproduction.

## 5. Frozen privacy and security boundaries

- Email verification is required for Download.
- Marketing consent is separate and optional.
- Email Gate creates no account and uses no password.
- User images, Pattern data, and PNG generation remain browser-local.
- No Shopify customer is created and no Shopify marketing transfer occurs.
- A08 implements no Marketing Consent capability.
- D1 remains bounded Email Gate persistence.
- OTP verification remains server-authoritative.
- Local unlock is normal-flow convenience, not DRM.
- Secrets remain Cloudflare bindings and are not stored in the repository.
- No secret value appears in this governance record.

## 6. Non-blocking operational qualifications

This bounded acceptance proves the real customer Email Gate path; it does not
claim that every infrastructure dimension was re-tested. Scheduled cleanup over
time, future key rotation, future provider outages, and future browser/platform
changes remain normal long-horizon operational concerns. They do not keep A08
open.

## 7. Marketing Consent and Ops Dashboard

Marketing Consent v1 `MC-A00` Product / Data / Privacy Contract remains
**APPROVED / FROZEN**. Its implementation was held while Email Gate production
acceptance remained open. With A08 production acceptance complete, Marketing
Consent v1 becomes **ELIGIBLE FOR A SEPARATE EXPLICIT IMPLEMENTATION RELEASE**.
No Marketing Consent code, D1 schema change, or provider connection is part of
this task. Implementation still requires the explicit instruction
`MARKETING CONSENT — RELEASE FOR IMPLEMENTATION`.

Ops Dashboard v1 remains **HOLD** and is not released by this closure.

## 8. Final classification

```text
P3-A03-E04-A08-A01: COMPLETED / PRODUCTION VERIFIED / ACCEPTED
P3-A03-E04-A08: COMPLETED / PRODUCTION VERIFIED / FROZEN / CLOSED
```
