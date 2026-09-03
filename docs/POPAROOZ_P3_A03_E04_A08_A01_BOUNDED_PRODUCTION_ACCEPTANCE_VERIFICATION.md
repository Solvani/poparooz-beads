# Poparooz P3-A03-E04-A08-A01 Bounded Production Acceptance Verification

Stage: `P3-A03-E04-A08-A01`

Status: **IN PROGRESS / WORKING EVIDENCE RECORD / NOT YET ACCEPTED**

Parent: **P3-A03-E04-A08 — Email Gate Production Acceptance & Governance Reconciliation**

Parent status: **REVIEW**

This file is not yet a final A01 acceptance record. It must not be used to
declare A08 completed, accepted, frozen or closed.

## Authority and current stage state

- Published premature governance commit / correction base: `0878c8b5551d01f93adf00ea860db25f7936c8d6`.
- Current implementation HEAD: `ca49d9f05a49a39d09e57ff86c909864f8dfb856`.
- Implementation commit: **fix: use manual resend redirect handling**.
- `0878c8b` is **PUBLISHED PREMATURE GOVERNANCE / NOT ACCEPTED / REQUIRES FORWARD CORRECTION**. It changes documentation only; publication does not constitute governance acceptance.
- Forward correction status at R01-A02: **PREPARED / NOT YET COMMITTED; PENDING R02 REVIEW / COMMIT / NORMAL PUSH**. The correction is based on the published predecessor above and becomes canonical only after independent review, a separately authorized forward docs-only commit, and normal push. R01 does not amend or rewrite published history.

`0878c8b` published this record prematurely as a completion/acceptance record.
Publication does not constitute acceptance. This corrected working copy
supersedes those claims only once a later correction commit is reviewed and
published. The R01 remote-baseline reauthorization defines the current states
below; no new product acceptance result is created by this document.

| Stage | Current governance status |
| --- | --- |
| P3-A03-E04-A08 — Email Gate Production Acceptance & Governance Reconciliation | REVIEW |
| P3-A03-E04-A08-A01 — Bounded Production Acceptance Verification | IN PROGRESS / NOT YET ACCEPTED |
| P3-A03-E04-A08-A01-A00 — Production Acceptance Preflight & Evidence Inventory | COMPLETED / READ-ONLY / NON-MUTATING / ACCEPTED |
| P3-A03-E04-A08-A01-A01 — Published Shopify & Live Browser Non-Email Acceptance | NOT COMPLETED / NOT RESUMED |
| P3-A03-E04-A08-A01-A01-H01 — Production Version Alignment Verification | NOT COMPLETED / BLOCKED PENDING GOVERNANCE RECONCILIATION |
| P3-A03-E04-A08-A01-A02 | NOT STARTED |

A01-A00 historical execution HEAD: `7fe26d0bf6a75b14b86c91d8a9be111e7d61e77d`.
This accepted read-only predecessor did not execute at `ca49d9f`.
Real transactional acceptance: **NOT STARTED**.
R00/R01 are governance-repair gates, not production acceptance evidence.

## Current acceptance matrix

| Acceptance item | Current accepted state | Evidence boundary |
| --- | --- | --- |
| PA-01 — Production Deployment Identity | OPEN / REVERIFICATION REQUIRED | A01-A00 verified the then-current baseline; implementation later advanced to ca49d9f. The stopped H01 observation is not a completed H01 verification. |
| PA-02 — Published Shopify iframe | OPEN | The repository/reference contract requires allow-forms; current published live DOM acceptance under A01-A01 has not been accepted. |
| PA-03 — Real customer E2E | OPEN | No accepted complete Download -> Email Gate -> Turnstile -> real email -> OTP -> verification -> original Pattern PNG chain exists. |
| PA-04 — Resend | SERVING-DEPLOYMENT REVALIDATION PENDING H01 / REAL DELIVERY OPEN | The implementation retains User-Agent poparooz-email-gate/1.0 and changes redirect: "error" to redirect: "manual"; serving identity and real delivery remain separate gates. |
| PA-05 — H12 | CLOSED / EXPLAINED READ-ONLY | A correctly serialized later request returned version_unsupported. Original online request bytes were not captured; the precise quoting/root-cause mechanism is not established. |
| PA-06 — Infrastructure | READ-ONLY EVIDENCE ACCEPTED WITH QUALIFICATIONS | A01-A00 Worker, Route, D1, migration/schema, Cron, required secret-name presence and cleanup aggregate observations are accepted within their historical read-only scope. |
| PA-07 — Live Browser Acceptance | OPEN | Standalone / Shopify iframe and Desktop / Mobile production acceptance under A01-A01 is not completed. |

PA-06 qualifications remain: secret-name presence does not prove secret validity;
a current no-backlog observation does not prove complete historical Cron reliability;
provider success and future operational capacity are not inferred.
These observations do not close A08.

## A. ACCEPTED EVIDENCE

- **A01-A00:** accepted Production Acceptance Preflight & Evidence Inventory,
  COMPLETED / READ-ONLY / NON-MUTATING, historical execution HEAD
  `7fe26d0bf6a75b14b86c91d8a9be111e7d61e77d`. Its then-current deployment verification does not close
  PA-01 after the implementation advanced to `ca49d9f`.
- **Implementation:** `ca49d9f05a49a39d09e57ff86c909864f8dfb856`, **fix: use manual resend redirect handling**.
  Classification: **PROVIDER TRANSPORT COMPATIBILITY / REDIRECT-HANDLING RELIABILITY FIX**.
  Resend `redirect: "error"` changes to `redirect: "manual"`; the fixed
  `User-Agent: poparooz-email-gate/1.0` remains. The endpoint
  `https://api.resend.com/emails`, POST, Authorization, Content-Type,
  Idempotency-Key, request body, timeout, AbortSignal, bounded parsing and
  fail-closed result model are retained. No redirect following, Location
  processing or second provider fetch is introduced. Related repository
  contract tests cover 301/302/303/307/308 and a single outbound request;
  they are implementation evidence, not real provider delivery acceptance.
- **PA-05 / H12:** CLOSED / EXPLAINED READ-ONLY. A correctly serialized later
  check returned HTTP 400, `schemaVersion: 1`, `result: version_unsupported`.
  Historical `invalid_request` is not evidence of a confirmed current parser
  defect. Original online request body bytes were not captured; a precise
  curl-quoting/root-cause mechanism is not proven.
- **PA-06:** A01-A00 read-only Worker, Route, D1, migration/schema, Cron,
  required secret-name presence and cleanup aggregate evidence is accepted
  with the qualifications in the matrix. Secret values were not acceptance
  evidence, and name presence is not a validity check.
- **Retained contracts:** browser-local images/Pattern/PNG; normal-flow
  Download verification and local unlock, not DRM; no account/password or
  Shopify customer creation; separate optional marketing consent; OTP remains
  server-authoritative; bounded Email Gate D1 persistence; secrets remain
  bindings outside the repository. These contracts do not prove live behavior.

These accepted states are supplied by the current task authorization and its
accepted A01-A00 result. This correction does not reconstruct missing production
logs, introduce a new probe, or credit A01-A00 with later execution.

## B. LATEST OBSERVATIONS REQUIRING REVALIDATION

**LATEST OBSERVED / REQUIRES H01 REVALIDATION / NOT YET ACCEPTED**

The stopped H01 preflight observed Worker `poparooz-email-gate-prod`,
deployment `da38e982-8fed-43b2-aebe-8ee981090fa1`,
v13 `428f410a-a6ce-496d-b5b2-75e40c2edbdf` at **100%**,
and previous v12 `e681db7d-1239-4004-8cd2-0d8c94e6363c` at **0%**.
H01 did not perform a promotion or complete its formal verification.
H01 must re-read current deployment, serving source and required continuity
after an approved clean baseline is restored; this observation alone cannot close PA-01.

The observation is retained from the stopped H01 control-plane read; no fresh
production verification was performed by R01. No observation timestamp is
invented. The v13 candidate binding/source assertions in the original draft
remain quarantined below until H01 establishes active-source identity and
current continuity.

## C. UNACCEPTED EVIDENCE REQUIRING PROVENANCE

Every quoted entry below is **UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED**.
They are retained to avoid losing potentially valid production evidence.
They need provenance/evidence reconstruction or later separately authorized
acceptance before they may support A01/A08 closure. Numeric specificity does
not establish provenance. No log, screenshot, query, task URL or message ID is
invented here.

The archive preserves the original sections 2 through 7 from the premature
record in `0878c8b`, including original headings and assertions. Words such as
"accepted", "verified", "confirms", "resolved" and "closure" inside these quotes
are claims of that rejected draft, not current governance. The current matrix
and accepted-evidence section control. In particular, the original exact
curl-quoting explanation is over-specific, and the asserted release consequence
for Marketing Consent is not accepted. Ops Dashboard remains HOLD; no independent
downstream governance decision is altered by retaining these quotations.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ## 2. Accepted implementation and production baseline

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ```text
> Repository branch: main
> Latest accepted implementation HEAD: ca49d9f05a49a39d09e57ff86c909864f8dfb856
> Implementation subject: fix: use manual resend redirect handling
> Production Worker version: 428f410a-a6ce-496d-b5b2-75e40c2edbdf
> Production traffic: 100%
> Previous Worker version retained: e681db7d-1239-4004-8cd2-0d8c94e6363c
> Previous Worker active traffic: 0%
> ```

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The active candidate was verified to have these binding names:

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> - `EMAIL_GATE_DB`
> - `OTP_DERIVATION_KEY`
> - `RESEND_API_KEY`
> - `TURNSTILE_SECRET`

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> No secret value is recorded here.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ## 3. Observed production acceptance evidence

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ### Shopify embed and gate entry

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The live Shopify pattern-maker integration included:

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ```html
> sandbox="allow-scripts allow-same-origin allow-downloads allow-forms"
> ```

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The `allow-forms` production correction restored actual Email Gate form
> submission inside the sandboxed iframe. Popup and top-navigation permissions
> remained absent.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> In a fresh locked browser, attempting Download entered the real Email Gate. No
> bypass path was observed before successful verification.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ### Turnstile and Siteverify

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The real production request passed the browser challenge and server
> verification stages sufficiently to create a D1 challenge and reach provider
> delivery. The earlier Siteverify redirect-policy correction had resolved the
> historical Siteverify transport failure.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ### Resend provider transport

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> Before the final redirect correction, production evidence showed fresh D1
> provider attempts with `provider_attempt_count = 1`, while the challenge did
> not activate. The newly rotated valid Resend r2 key remained at zero uses, and
> Resend contained no request log. At that point the production adapter still
> used `redirect: "error"`.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The final approved single-variable production change in
> `ca49d9f05a49a39d09e57ff86c909864f8dfb856` was:

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ```diff
> -    redirect: "error",
> +    redirect: "manual",
> ```

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> Production retained the exact `https://api.resend.com/emails` endpoint, `POST`, `Authorization`,
> `Content-Type`, `Idempotency-Key`, `User-Agent: poparooz-email-gate/1.0`, the
> request body, timeout, `AbortSignal`, bounded provider-response parsing, and
> the fail-closed result model. It did not add `redirect: "follow"`, `Location`
> processing, manual redirect following, or a second provider fetch.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> After that exact Worker version was deployed at 100%, the current r2 Resend API
> key showed real Last used activity, Resend Logs recorded `POST /emails`, Resend
> returned HTTP 200, the real verification email was delivered, and the OTP flow
> completed.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> Classification: **Production Resend transport failure resolved by replacing
> explicit `redirect: "error"` with `redirect: "manual"`.**

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The earlier User-Agent change remains required provider-compatibility
> hardening and is retained. The available evidence does not establish it as the
> unique historical root cause.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ### OTP, verification, and PNG

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The human entered the received eight-digit OTP only in the real webpage.
> Verification succeeded, the original pending Pattern resumed, and the expected
> Poparooz Pattern PNG downloaded. No OTP, token, email content, or secret is
> recorded here.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> Image, Pattern, and PNG generation remained browser-local. Email verification
> did not turn image processing into a server-side upload flow.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ### D1 verified-state post-check

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> A SELECT-only aggregate production post-check returned exactly:

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> | Aggregate field                | Value           |
> | ------------------------------ | --------------- |
> | `state`                        | `verified`      |
> | `provider_attempt_count`       | `1`             |
> | `attempt_count`                | `0`             |
> | `row_count`                    | `1`             |
> | `activated_in_window`          | `1`             |
> | `verified_in_window`           | `1`             |
> | `verified_terminal_consistent` | `1`             |
> | `earliest_created_at_ms`       | `1788424380329` |
> | `earliest_activated_at_ms`     | `1788424380841` |
> | `earliest_verified_at_ms`      | `1788424429250` |

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> Query metadata was `rows_read = 7` and `rows_written = 0`. This confirms the
> canonical verified-state contract: `activated_at` exists, `verified_at`
> exists, and `terminal_at = verified_at`.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The aggregate did not select or expose a normalized email, challenge ID,
> provider send event ID, OTP, Turnstile token, or secret.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ### Local unlock and fresh-session behavior

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> In the same browser and same private session after verification, another
> Download proceeded without presenting the Email Gate again. This verifies the
> intended browser-local unlock convenience.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> After every private/incognito window was closed, a completely new private
> session was opened. Generator -> Generate -> Download presented the Email Gate
> again. No second verification email was requested. This confirms that the
> unlock is not a permanent account entitlement and that fresh browser storage
> remains locked.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ## 4. Historical H12 smoke qualification

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> The original Windows `curl` reproduction was a command-quoting false negative.
> A subsequent Node `JSON.stringify` reproduction returned the expected HTTP 400
> with `schemaVersion: 1` and `result: version_unsupported`. The original `curl`
> invocation therefore does not support an open parser-defect claim. This record
> does not infer evidence beyond that established reproduction.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ## 5. Frozen privacy and security boundaries

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> - Email verification is required for Download.
> - Marketing consent is separate and optional.
> - Email Gate creates no account and uses no password.
> - User images, Pattern data, and PNG generation remain browser-local.
> - No Shopify customer is created and no Shopify marketing transfer occurs.
> - A08 implements no Marketing Consent capability.
> - D1 remains bounded Email Gate persistence.
> - OTP verification remains server-authoritative.
> - Local unlock is normal-flow convenience, not DRM.
> - Secrets remain Cloudflare bindings and are not stored in the repository.
> - No secret value appears in this governance record.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ## 6. Non-blocking operational qualifications

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> This bounded acceptance proves the real customer Email Gate path; it does not
> claim that every infrastructure dimension was re-tested. Scheduled cleanup over
> time, future key rotation, future provider outages, and future browser/platform
> changes remain normal long-horizon operational concerns. They do not keep A08
> open.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> ## 7. Marketing Consent and Ops Dashboard

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> Marketing Consent v1 `MC-A00` Product / Data / Privacy Contract remains
> **APPROVED / FROZEN**. Its implementation was held while Email Gate production
> acceptance remained open. With A08 production acceptance complete, Marketing
> Consent v1 becomes **ELIGIBLE FOR A SEPARATE EXPLICIT IMPLEMENTATION RELEASE**.
> No Marketing Consent code, D1 schema change, or provider connection is part of
> this task. Implementation still requires the explicit instruction
> `MARKETING CONSENT — RELEASE FOR IMPLEMENTATION`.

**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED — retained original draft text:**

> Ops Dashboard v1 remains **HOLD** and is not released by this closure.

## D. REMAINING ACCEPTANCE WORK

Review the corrected governance candidate; after separate R02 authorization,
create and publish a forward corrective docs-only commit without rewriting
`0878c8b`, establish an approved clean main baseline, then complete
P3-A03-E04-A08-A01-A01-H01 Production Version Alignment Verification.
Only after its gate passes and separate authorization is given may A01-A01
zero-email live browser acceptance resume; A01-A02 transactional acceptance
requires later separate authorization. None of these later actions is executed by R01.

No Marketing Consent implementation or Ops Dashboard release is authorized by
this correction or by the premature closure in `0878c8b`.
Their independent governance is unchanged; no downstream release is inferred.

- PA-01 and PA-04 serving-code identity: H01 must establish current active version,
  traffic, source identity, Route and required continuity through read-only checks.
- PA-02 and PA-07: separately authorized A01-A01 must assess current published
  Shopify DOM and standalone/iframe Desktop/Mobile behavior without email.
- PA-03 and PA-04 real delivery: remain OPEN for separately authorized A01-A02
  transactional acceptance; local quoted narratives are not a substitute.
- PA-06 retains its explicit historical and operational qualifications.
- Quarantined provider/D1/browser values require traceable provenance before
  they can be accepted; unavailable evidence remains unverified.

## E. AUTHORIZATION / STOP BOUNDARIES

R01 corrects only the three authorized governance files. It performs no staging,
commit, amend, push, reset, revert, rebase or history rewrite. A later R02
forward corrective docs-only commit and normal push require separate authorization.

No Feishu writes, Cloudflare mutations, Shopify operations, D1 operations,
browser acceptance, email send, OTP request/verification or Email Gate challenge
submission is performed. Do not verify production merely to justify this draft.

A08 remains REVIEW. A01 remains IN PROGRESS / NOT YET ACCEPTED.
H01 remains NOT COMPLETED / BLOCKED PENDING GOVERNANCE RECONCILIATION.
A01-A01 remains NOT COMPLETED / NOT RESUMED; A01-A02 and real transactional
acceptance remain NOT STARTED. No Marketing Consent or Ops Dashboard release
is created by R01.
