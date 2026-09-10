# Poparooz Generator — Current Accepted State

This is the compact handoff snapshot for the next coding task. Verify live state
before action. Historical project evidence is preserved in
[`history/PROJECT_STATE_PRE_TOOLING_G01.md`](history/PROJECT_STATE_PRE_TOOLING_G01.md)
and the linked frozen authority documents.

## Repository

```text
Project: POPAROOZ_GENERATOR
Repository: D:\Projects\poparooz-beads
Remote: https://github.com/Solvani/poparooz-beads.git
Branch: main
Accepted P03 source/release HEAD: ec61d56f4db9e5957f415171635c6b01eb47e5b0
P03-R01 reconciliation parent: ec61d56f4db9e5957f415171635c6b01eb47e5b0
Sync state at P03-R01 entry: local HEAD = local origin/main = live origin/main;
  ahead/behind 0/0
Worktree at P03-R01 entry: CLEAN
```

The task-specific baseline governs when explicitly supplied. A normal push to
`main` triggers the Git-connected Cloudflare Pages production deployment and is
a production-affecting action.

## Current stage

```text
Parent stage: MC-A02-E02
Completed stage: MC-A02-E02-P03 — Withdrawal-Only Activation
P03 status: COMPLETED / PUSHED / CLOUDFLARE PAGES AUTO-DEPLOYED /
  PRODUCTION VERIFIED / ACCEPTED / CLOSED
Current status: HOLD
Next action: MC-A02-E02-P04 — Controlled Marketing Lifecycle E2E
P04 status: NOT STARTED / BLOCKED
P04 blocker: AUTHORIZED CONTROLLED QA MAILBOX REQUIRED BEFORE REAL OTP E2E
Ops Dashboard v1: HOLD
```

P03 changed Cloudflare Pages only. It did not modify the Worker, D1, or Routes.
P04 remains blocked and must not start without the required controlled-QA authority
and test identity.

## Accepted production state from P03

### Cloudflare Pages

```text
State: CLOUDFLARE PAGES AUTO-DEPLOYED / PRODUCTION VERIFIED
Production source commit: ec61d56f4db9e5957f415171635c6b01eb47e5b0
VITE_MARKETING_CONSENT_ENABLED=false
VITE_MARKETING_WITHDRAWAL_ENABLED=true
```

### Worker and D1

```text
Worker: poparooz-email-gate-prod
Active Worker version: 956f81e7-2539-4615-a48d-4b1f571c3af3
Worker deployment: b782954c-c66e-4645-b125-920af7cba457
Rollout: 100%
D1 database: poparooz-email-gate-prod
D1 UUID: 6a2833a3-3825-43cf-8a76-9ac0943bc93b
D1 binding: EMAIL_GATE_DB
Migration ledger: exactly 0001_email_gate_v1.sql and 0002_marketing_consent_v1.sql applied
Marketing subscriptions: 0
Marketing consent events: 0
```

### Routes

```text
Email Gate: generator.poparooz.com/api/email-gate/*
Email Gate Route ID: 6587cd4a1c434d95ad74731b3e11a147
Marketing: generator.poparooz.com/api/marketing-consent/*
Marketing Route ID: cf27ac513dc542f6943349738b38cf34
Target Worker: poparooz-email-gate-prod
Broad generator.poparooz.com/api/* route: ABSENT
Overlapping duplicate Marketing route: ABSENT
```

## Current customer-facing state

- Production Generator and Email Gate are active; Email verification remains
  required for Download.
- Marketing backend routes are reachable and reject invalid authority safely.
- Marketing grant UI is disabled; no Marketing checkbox is shown.
- Marketing withdrawal self-service is active through `/unsubscribe`.
- Marketing collection is disabled. No Marketing provider integration is active
  or implied.
- User image, Pattern, and PNG processing remain browser-local.

## Known non-blocking qualifications

- P02's live GitHub verification encountered a connection reset; its controlling
  task used the designated authoritative origin baseline. TOOLING-G01 later
  independently verified live `origin/main` at the same SHA.
- The existing Cloudflare Insights beacon is blocked by CSP. P02 classified this
  as non-blocking for the accepted route and Email Gate checks.
- Conservative Transparent-mode cleanup may retain indistinguishable tinted matte
  contamination.
- Firefox, Safari, iOS, Android, and screen-reader gates remain open unless a
  later task supplies accepted evidence.
- Live Shopify theme state is external and is not represented automatically by
  this repository.

## Durable invariants and authority

- Poparooz is the only customer-facing brand.
- User images stay in the browser.
- Email Gate v1 remains unchanged; Marketing uses separate APIs.
- Marketing failure never blocks OTP, verification, unlock, or Download.
- Grant and withdrawal flags and capabilities remain independent.
- Withdrawal must be production-capable before grant activation.

Primary frozen authorities:

- [`POPAROOZ_MARKETING_CONSENT_V1_MC_A00_PRODUCT_DATA_PRIVACY_CONTRACT.md`](POPAROOZ_MARKETING_CONSENT_V1_MC_A00_PRODUCT_DATA_PRIVACY_CONTRACT.md)
- [`POPAROOZ_MARKETING_CONSENT_V1_MC_A02_RUNTIME_API_PERSISTENCE_CONTRACT.md`](POPAROOZ_MARKETING_CONSENT_V1_MC_A02_RUNTIME_API_PERSISTENCE_CONTRACT.md)
- [`POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md`](POPAROOZ_P3_A03_E04_EMAIL_DOWNLOAD_GATE_CONTRACT.md)
- [`POPAROOZ_P3_A03_E04_A08_A01_BOUNDED_PRODUCTION_ACCEPTANCE_VERIFICATION.md`](POPAROOZ_P3_A03_E04_A08_A01_BOUNDED_PRODUCTION_ACCEPTANCE_VERIFICATION.md)

## Explicitly forbidden next-step actions

Until a later task explicitly authorizes them, MUST NOT:

- start P04 or run a real OTP lifecycle without an authorized controlled QA mailbox;
- change either production Marketing flag;
- deploy Pages or Worker;
- mutate D1, Worker Routes, secrets, providers, Shopify, or Feishu;
- send an OTP;
- activate Marketing grant; or
- release Ops Dashboard.

The recorded next action is
`MC-A02-E02-P04 — Controlled Marketing Lifecycle E2E`. It remains
`NOT STARTED / BLOCKED` by
`AUTHORIZED CONTROLLED QA MAILBOX REQUIRED BEFORE REAL OTP E2E`.
