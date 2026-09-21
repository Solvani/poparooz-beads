# Poparooz Generator — Current Accepted State

This is the compact handoff snapshot for the next governed task. Verify mutable
live state before action. Historical project evidence remains preserved in
[`history/PROJECT_STATE_PRE_TOOLING_G01.md`](history/PROJECT_STATE_PRE_TOOLING_G01.md)
and the linked frozen authority documents.

## Repository and production authority

```text
Project: POPAROOZ_GENERATOR
Repository: D:\Projects\poparooz-beads
Remote: https://github.com/Solvani/poparooz-beads.git
Production branch: main
Repository authority entering P05 docs reconciliation: a547d01ffad9294de934f00c9a20cbc7105ecd99
Marketing functional implementation authority: a547d01ffad9294de934f00c9a20cbc7105ecd99
Accepted P05 lifecycle Pages deployment: b5425c91-110f-448e-9758-f06cc7f28d8e
Active Worker version: 956f81e7-2539-4615-a48d-4b1f571c3af3
```

The docs-only reconciliation commit containing this snapshot becomes the
repository and production source authority after its authorized normal push to
`main`. It does not replace or relabel the Marketing functional implementation
authority. Repository authority, functional implementation authority,
historical stage authority, deployment identity, and production evidence remain
distinct.

## Active Email Gate OTP V2 execution candidate

`EMAIL-GATE-OTP-UX-P01` is authorized to retain frozen OTP V1 as the strict
eight-digit legacy protocol and introduce strict six-digit OTP V2 for new flows.
The candidate uses separate `/api/email-gate/v1/*` and
`/api/email-gate/v2/*` routes plus trusted D1 `delivery_payload_version`
discrimination. No D1 migration is required or authorized.

The V2 authority is documented in
[`POPAROOZ_EMAIL_GATE_OTP_V2_CONTRACT.md`](POPAROOZ_EMAIL_GATE_OTP_V2_CONTRACT.md).
The commit containing this snapshot establishes repository implementation
authority; it does not establish deployment, production verification, master
acceptance, or closure. The production Worker and Pages IDs below therefore
remain the verified pre-change rollback anchors.

## Marketing stage disposition

```text
Parent stage: MC-A02-E02

P03: COMPLETED / ACCEPTED / CLOSED
Historical disposition: WITHDRAWAL ENABLED / GRANT DISABLED / REAL LIFECYCLE PENDING

P04: CLOSED / HISTORICAL WITHDRAWAL-ONLY FINAL DISPOSITION
Historical disposition: WITHDRAWAL-ONLY PRODUCTION BASELINE PRESERVED

P05: PASS / MARKETING GRANT + WITHDRAWAL PRODUCTION LIFECYCLE VERIFIED
Current disposition: READY FOR FINAL GOVERNANCE CLOSURE
Full lifecycle: G1 -> W1 -> G2 -> W2 / PROVEN / PASS
Rollback count: 0

Ops Dashboard v1: HOLD
```

P04 remains closed as an accurate historical withdrawal-only result. P05 is the
later accepted production lifecycle authority and supersedes P04 only for the
current Marketing production posture. It does not rewrite P03, P04, or frozen
contract history.

## Current Marketing production state

### Cloudflare Pages

```text
State: P05 LIFECYCLE VERIFIED / GRANT ENABLED / WITHDRAWAL ENABLED
Accepted lifecycle deployment: b5425c91-110f-448e-9758-f06cc7f28d8e
Lifecycle deployment source commit: a547d01ffad9294de934f00c9a20cbc7105ecd99
VITE_MARKETING_CONSENT_ENABLED=true
VITE_MARKETING_WITHDRAWAL_ENABLED=true
```

The authorized docs-only reconciliation push may advance the Pages deployment
and production source authority without changing runtime, source, configuration,
tests, environment values, or the Marketing functional implementation authority.

### Worker, D1, and routes

```text
Worker: poparooz-email-gate-prod
Active Worker version: 956f81e7-2539-4615-a48d-4b1f571c3af3
Worker deployment: b782954c-c66e-4645-b125-920af7cba457
Rollout: 100%

D1 database: poparooz-email-gate-prod
D1 UUID: 6a2833a3-3825-43cf-8a76-9ac0943bc93b
D1 binding: EMAIL_GATE_DB
Migration ledger: exactly 0001_email_gate_v1.sql and 0002_marketing_consent_v1.sql applied

Email Gate route: generator.poparooz.com/api/email-gate/*
Email Gate Route ID: 6587cd4a1c434d95ad74731b3e11a147
Marketing route: generator.poparooz.com/api/marketing-consent/*
Marketing Route ID: cf27ac513dc542f6943349738b38cf34
Target Worker: poparooz-email-gate-prod
Broad generator.poparooz.com/api/* route: ABSENT
Overlapping duplicate Marketing route: ABSENT
```

### Accepted P05 lifecycle evidence

```text
G1: PASS
W1: PASS
G2: PASS
W2: PASS
Final QA subscription state: withdrawn
Final state_version: 4
Event count: 4
Event sequence: granted -> withdrawn -> granted -> withdrawn
Stale-authority negative cases: PASS
Rollback count: 0
```

The final withdrawn QA record is retained under the frozen retention contract.
No Marketing provider, sending, audience, commerce, or CRM state is implied by
D1 persistence.

## Current customer-facing state

- Production Generator and Email Gate are active; Email verification remains
  required for Download in a browser without a valid local unlock.
- Marketing consent is optional and independently enabled through the explicit
  Marketing checkbox.
- Marketing withdrawal self-service is enabled through `/unsubscribe`.
- Grant and withdrawal APIs are production-capable and reject stale authority.
- Marketing failure must not block or reverse Email Gate verification, unlock,
  or browser-local Download.
- Images, Pattern data, and PNG processing remain browser-local.
- Marketing provider/sending integration is not implemented or authorized: no
  Resend Contacts/Audiences, campaigns, Shopify Marketing mutation, or CRM sync.

## Current PatternCosting state

```text
Contract: PatternCostingExportV2 v2.1.0
Costing contract status: COMPLETED / COST MASTER APPROVED / FROZEN / CLOSED
Generator implementation status: CLOSED
Generator implementation authority: a0005ecf885db2d458679b20ec7c6006d7b12b79
Freeze authority SHA-256: 3030f8ed06b786f914dda8dab5b39a879b806d691f672183584fed6df97079e1
```

PatternCosting V2.1 is closed on the Generator side. A fresh
`GEN-COST-PATTERN-EXPORT-V2-D00` rerun is not the current next action. Any
reopening, new implementation, contract change, dependency change, deployment,
or Central Table/Feishu business-data write requires separate authority.
Historical PatternCostingExportV2 v2.0 authority remains historical and is not
modified by the V2.1 closure.

## Known non-blocking qualifications

- The existing Cloudflare Insights beacon is blocked by CSP; prior governance
  classified this as non-blocking for accepted route and Email Gate checks.
- Conservative Transparent-mode cleanup may retain indistinguishable tinted
  matte contamination.
- Firefox, Safari, iOS, Android, and screen-reader gates remain open unless a
  later task supplies accepted evidence.
- Live Shopify theme state is external and is not represented automatically by
  this repository.

## Durable invariants and frozen authorities

- Poparooz is the only customer-facing brand.
- User images stay in the browser.
- Email Gate OTP V1 remains frozen at exactly eight digits for legacy
  compatibility; the separately versioned OTP V2 candidate is exactly six
  digits for new issuance and client UX.
- Marketing consent remains optional and separate from Download authority.
- Grant and withdrawal flags and capabilities remain independent.
- Withdrawal must remain production-capable while grant is enabled.

Primary frozen authorities:

- [`POPAROOZ_MARKETING_CONSENT_V1_MC_A00_PRODUCT_DATA_PRIVACY_CONTRACT.md`](POPAROOZ_MARKETING_CONSENT_V1_MC_A00_PRODUCT_DATA_PRIVACY_CONTRACT.md)
- [`POPAROOZ_MARKETING_CONSENT_V1_MC_A02_RUNTIME_API_PERSISTENCE_CONTRACT.md`](POPAROOZ_MARKETING_CONSENT_V1_MC_A02_RUNTIME_API_PERSISTENCE_CONTRACT.md)
- [`POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md`](POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md)
- [`POPAROOZ_EMAIL_GATE_OTP_V2_CONTRACT.md`](POPAROOZ_EMAIL_GATE_OTP_V2_CONTRACT.md)
- [`POPAROOZ_P3_A03_E04_A08_A01_BOUNDED_PRODUCTION_ACCEPTANCE_VERIFICATION.md`](POPAROOZ_P3_A03_E04_A08_A01_BOUNDED_PRODUCTION_ACCEPTANCE_VERIFICATION.md)

## Explicitly forbidden next-step actions

Until separately authorized, MUST NOT:

- rerun G1/W1/G2/W2 or send another real OTP;
- change either production Marketing flag;
- deploy or mutate the Worker, D1, routes, secrets, or provider configuration;
- integrate Resend Contacts/Audiences, campaigns, Shopify Marketing, or CRM;
- delete the final withdrawn QA record outside the frozen retention contract;
- reopen or modify PatternCosting V2.1;
- mutate Central Table, Shopify, Ops Dashboard, or Feishu; or
- represent P05 as final governance-closed before the authorized closure sync.

P05 lifecycle QA is accepted and ready for final Feishu governance closure.
