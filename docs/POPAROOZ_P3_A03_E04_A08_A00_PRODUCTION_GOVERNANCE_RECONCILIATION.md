# P3-A03-E04-A08-A00 Production Governance Reconciliation

Date: **2026-09-03**

Parent: **P3-A03-E04-A08 — Email Gate Production Acceptance & Governance Reconciliation**

Parent status: **REVIEW**

Substage: **P3-A03-E04-A08-A00 — Governance State Catch-up Audit**

A00 status: **COMPLETED / READ-ONLY / GOVERNANCE RECONCILED**

## 1. Authority and scope

This record applies the user's explicit canonical governance decision following
the approved read-only catch-up audit and the incremental audit of
`119adc1062c0506cbe2f4edf9c74a2c7c6d1c202`. A00's READ-ONLY classification
describes the audit. Recording its approved result is a docs-only governance
change; it does not assert deployment, delivery, or final production acceptance.

[`PROJECT_STATE.md`](PROJECT_STATE.md) and
[`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)
are synchronized with this record. Earlier freezes preserve their original
authorizations, side effects, evidence, and qualifications as historical facts.
Later implementation must not be retroactively attributed to those stages.

## 2. Exact audited implementation range

- Reconciliation baseline, exclusive: `d02f1433eddbdb11b9b8a2ade92652264103ead8`
- Previous audited implementation HEAD: `a5d39baf5f761e4d65678743aaef91e7d1cd42eb`
- Latest audited implementation HEAD, inclusive: `119adc1062c0506cbe2f4edf9c74a2c7c6d1c202`
- Git proved exactly one incremental commit and exactly six post-baseline
  implementation commits. The later governance commit is not part of this
  implementation range.

| Commit                                     | Subject                                        | Verified implementation effect                                                                                                                |
| ------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `3a8f0bafb51b6b31efd1af55331e7e9cbc9401c2` | chore: configure email gate production worker  | Adds production D1 binding and hourly Cron configuration; synchronizes generated binding types.                                               |
| `5c33fd86c6bfdb5c49beda926eeb74dded160162` | feat: activate production email gate           | Injects real production capability; adds Turnstile integration, bounded CSP allowances, modal lifecycle/accessibility corrections, and tests. |
| `0150bccb104e2a321fd6f86d2f9e0c5edc2f1939` | fix: recover retryable turnstile failures      | Uses Cloudflare-owned browser retries with bounded retryable-error handling and fail-closed cancellation.                                     |
| `0090fbb73fec187e2b153b5e9dced4ac931187cb` | fix: correct siteverify redirect policy        | Removes explicit Siteverify redirect rejection and changes provider contract tests.                                                           |
| `a5d39baf5f761e4d65678743aaef91e7d1cd42eb` | fix: allow email gate submit in Shopify iframe | Adds allow-forms to the reference iframe contract/snippet and exact sandbox assertions.                                                       |
| `119adc1062c0506cbe2f4edf9c74a2c7c6d1c202` | fix: add required resend user agent            | Adds fixed User-Agent poparooz-email-gate/1.0 and stronger outbound request assertions.                                                       |

## 3. Incremental Resend audit and decision

The sixth commit changes exactly two files:
`worker/email-gate/providers/resend.ts` and
`worker/email-gate/tests/contracts-crypto-providers.worker.ts`.
The implementation delta is one fixed header:
`User-Agent: poparooz-email-gate/1.0`.

Resend's [official missing-User-Agent guidance](https://resend.com/docs/knowledge-base/403-error-1010),
checked on 2026-09-03, states that requests lacking User-Agent are blocked before
the API with HTTP 403/error 1010. Resend requires the header; the exact
`poparooz-email-gate/1.0` value is this repository's chosen transport identity.
This source explains the compatibility requirement, not proof that a particular
production failure was diagnosed or that this change has been deployed.

The revised mocked provider tests assert one fetch, the Resend emails URL,
POST, the exact normalized header set, the representative parsed JSON body,
`redirect: "error"`, and an AbortSignal. The URL, authorization/idempotency
scheme, body mapping (including Reply-To), timeout, result classification, and
redirect policy remain unchanged in implementation.

| Boundary                                                 | Incremental conclusion                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Email Gate product contract and verification flow        | Unchanged                                                           |
| OTP representation, derivation, expiry, and verification | Unchanged                                                           |
| Sender / Reply-To and delivery payload semantics         | Unchanged                                                           |
| Privacy / data boundary                                  | No new customer data; only a fixed application transport identifier |
| Local unlock and original-Pattern completion             | Unchanged                                                           |
| Shopify boundary                                         | Unchanged                                                           |
| Turnstile boundary                                       | Unchanged                                                           |
| Frozen decisions superseded by commit 6                  | None                                                                |

Classification: **Provider transport compatibility / production delivery
reliability fix**. The approved A08 REVIEW / A00 reconciliation / A01 next-stage
decision remains valid. No material product or governance change was found.

One specific qualification is retained within the existing delivery acceptance
scope: **confirm real Resend delivery succeeds with the production User-Agent
contract**. Mocked response acceptance cannot prove real delivery. This
clarifies the existing end-to-end gate; it does not authorize execution or
materially expand that scope. The commit does not close the H12 smoke discrepancy.

## 4. Current repository facts and evidence

- [Production entry](../src/main.tsx) injects the
  [real capability](../src/email-gate/production-email-gate-capability.ts).
  Email Gate is production-configured.
- [App download coordination](../src/app/App.tsx) opens the gate for a locked
  browser; a valid local unlock permits the existing browser-local PNG download.
  Successful verification resumes only the original pending Pattern.
- Image, Pattern, and PNG processing stay browser-local. The versioned minimal
  unlock marker is a normal-flow convenience, not DRM or an account credential.
- [Wrangler configuration](../wrangler.jsonc) represents one standalone
  production Worker, EMAIL_GATE_DB D1 binding, migration directory, and hourly
  Cron. [The Worker entry](../worker/email-gate/index.ts) exposes fetch and
  scheduled handlers, Production Delivery Renderer V1, and OTP key version 1.
- The path-scoped Route remains externally managed, not declared in Wrangler
  configuration. Configuration is not proof of current remote inventory,
  applied migrations, provisioned secrets, or successful Cron/cleanup execution.

Repository composition and boundary tests support these implementation
statements. Tests were inspected, not rerun for this docs-only record. No new
application test, browser, deployment, or delivery pass is claimed.

## 5. Hotfix and hosting boundary reconciliation

Turnstile retry recovery changes reliability/implementation behavior, not the
Email Gate product contract. The first two classified browser errors may wait
for Cloudflare-owned retry; terminal failure and cancellation remain fail closed.
This does not authorize server retry of consumed proof or automatic email resend.

Siteverify no longer explicitly rejects redirects. Its prior redirect-rejection
transport guarantee must not be claimed. Timeout, bounded parsing, success,
hostname, and action validation remain. No actual redirect or disclosure incident
is established. Resend and browser-client redirect rejection are separate and
remain unchanged by the Siteverify hotfix.

The [iframe contract](POPAROOZ_IFRAME_AND_SHOPIFY_CONTRACT.md) and reference
snippet narrowly expand the sandbox permission set with `allow-forms`.
Popup and top-navigation permissions remain absent. This hotfix does not
change CSP, including `form-action 'none'`, or the existing data boundaries.
The earlier activation commit separately added Turnstile script/frame CSP
allowances while retaining `connect-src 'self'`.
The repository snippet does not prove the current published Shopify theme.
No Shopify marketing integration or transfer of email, challenge, token, unlock,
Pattern, or download data is authorized; the existing readiness/resize protocol
remains bounded metadata only.

## 6. Historical facts and still-valid frozen decisions

The old statements "production implementation not started", "renderer
intentionally empty", "production capability unavailable", "Download ungated",
and "production inactive" are superseded as descriptions of the current
repository. Worker/Cron/schema absence remains only a historical stage-entry
inventory, not a current remote finding. Earlier stages still truthfully record
what they did not deploy or mutate.

Retained authorities include the
[product contract](POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md),
[provider/topology/retention decision](POPAROOZ_P3_A03_E04_A02_PROVIDER_TOPOLOGY_RETENTION_DECISION.md),
[schema/security/API contract](POPAROOZ_P3_A03_E04_A02_A02_SCHEMA_SECURITY_API_CONTRACT.md),
[frontend freeze](POPAROOZ_P3_A03_E04_A06_FRONTEND_FREEZE.md),
[Renderer V1 freeze](POPAROOZ_P3_A03_E04_A05_A03_A00_RENDERER_V1_FREEZE.md), and
[OTP key production contract](POPAROOZ_P3_A03_E04_A07_A02_OTP_KEY_PRODUCTION_CONTRACT.md).

Browser-local processing, verification-gate semantics, the minimal unlock
marker, original-Pattern identity, stale-response rejection, cancellation,
exactly-once completion, D1-only persistence direction, server-authoritative
verification, bounded schemas/rates, transactional delivery identity/copy,
independent marketing consent, and OTP v1 text representation/versioning remain.
Overlapping OTP key rotation requires separate implementation authorization.
No image upload, general account system, commerce bridge, or Shopify marketing/
customer-data transfer is introduced.

## 7. Production evidence and open acceptance qualifications

The approved A00 audit distinguished committed implementation from archived
execution reports of earlier Pages activation and Worker deployment. Those
reports are historical evidence; they are not fresh verification of the current
production state or an accepted deployment-to-latest-HEAD attestation.

The following remain open:

1. Current deployment-to-`119adc1062c0506cbe2f4edf9c74a2c7c6d1c202` verification.
2. Current published Shopify iframe snippet verification.
3. Complete real-email -> verification -> original PNG download acceptance,
   including real Resend delivery with the production User-Agent contract.
4. Closure of the historical H12 `invalid_request` versus
   `version_unsupported` smoke discrepancy. This record neither diagnoses its
   cause nor declares a confirmed current parser defect.
5. Current Route, migration, Cron, secret, provider, cleanup, and live-browser
   evidence. None may be inferred solely from repository configuration or mocks.
6. Retained browser/accessibility and storage-partitioning qualifications;
   earlier local or mocked checks do not prove current real embedded behavior.

No production mutation, secret access, real email, or live acceptance
execution occurred in this governance task.

## 8. Canonical result and next stage

```text
P3-A03-E04-A08
Email Gate Production Acceptance & Governance Reconciliation
Status: REVIEW

P3-A03-E04-A08-A00
Governance State Catch-up Audit
Status: COMPLETED / READ-ONLY / GOVERNANCE RECONCILED

P3-A03-E04-A08-A01
Bounded Production Acceptance Verification
Status: NOT STARTED
Authorization: REQUIRED SEPARATELY AFTER A00 GOVERNANCE COMMIT REVIEW
```

A00 records the approved reconciliation. It does not declare production
acceptance complete, freeze/close A08, start A01, or authorize Feishu import.
The next step is review of the A00 governance commit; any A01 execution requires
a separate bounded authorization.
