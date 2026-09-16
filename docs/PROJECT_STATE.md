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
Current repository authority before this governance reconciliation: b33bdb2ab1f6008c2c27dcc68324d5028dee6662
Accepted P03 source/release HEAD: ec61d56f4db9e5957f415171635c6b01eb47e5b0
P03-R01 reconciliation parent: ec61d56f4db9e5957f415171635c6b01eb47e5b0
Current production source authority: b33bdb2ab1f6008c2c27dcc68324d5028dee6662
Current production evidence authority: a162876a8dd7445883c1902f100fa0bf2e87d901302a8738dfc099d9ce4f34ea
```

The task-specific baseline governs when explicitly supplied. A normal push to
`main` triggers the Git-connected Cloudflare Pages production deployment and is
a production-affecting action. Repository authority, historical P03 source,
current production source, and production evidence authority are distinct and
must not be substituted for one another.

## Current stage

```text
Parent stage: MC-A02-E02
Completed stage: MC-A02-E02-P04 — Controlled Marketing Lifecycle E2E
P04 status: CLOSED
Final disposition: WITHDRAWAL-ONLY PRODUCTION BASELINE PRESERVED /
  MARKETING GRANT DISABLED / WITHDRAWAL ENABLED
Full Marketing lifecycle G1 -> W1 -> G2 -> W2: NOT PROVEN / DEFERRED
Further P04 production retry: NOT AUTHORIZED
Current status: CLOSED
Next action: Fresh GEN-COST-PATTERN-EXPORT-V2-D00 readiness rerun requires
  separate authorization after repository-governance reconciliation
Ops Dashboard v1: HOLD
```

P04 closed under the accepted withdrawal-only final production disposition.
The final controlled retry did not prove the full Marketing lifecycle and must
not be represented as a lifecycle PASS. Future Marketing Grant enablement
requires a new separately authorized stage.

## Accepted final P04 production state

### Cloudflare Pages

```text
State: SAFE RESTORATION VERIFIED / WITHDRAWAL-ONLY
Final production deployment: e01f7436-d29c-4f3d-b65b-619bf6f0f53a
Production source commit: b33bdb2ab1f6008c2c27dcc68324d5028dee6662
VITE_MARKETING_CONSENT_ENABLED=false
VITE_MARKETING_WITHDRAWAL_ENABLED=true
```

P04/R06 produced no OTP issuance or acceptance, Marketing transition, D1
business mutation, Worker write, Route write, or Git write. The two accepted
Pages writes belong to the activation/restoration history. The CDP controller
session and the full Marketing lifecycle remain unproven.

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

## Current PatternCosting cross-module dependency

```text
Contract: PatternCostingExportV2 v2.1.0
Status: COMPLETED / COST MASTER APPROVED / FROZEN / CLOSED
Freeze authority SHA-256: 3030f8ed06b786f914dda8dab5b39a879b806d691f672183584fed6df97079e1
Freeze scope: V2.1 CONTRACT SEMANTICS ONLY
Generator P04 prerequisite: SATISFIED / RELEASED
```

This cross-module freeze records contract semantics only. It does not authorize
Generator implementation, Generator repository implementation writes,
`canonicalize@2.1.0` installation, an implementation branch or worktree,
Central Table or Feishu business-data writes, deployment, or a fresh D00 rerun.
Historical PatternCostingExportV2 v2.0 authority remains historical and is not
modified by the v2.1 freeze.

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

- retry P04 or run another real OTP lifecycle;
- change either production Marketing flag;
- deploy Pages or Worker;
- mutate D1, Worker Routes, secrets, providers, Shopify, or Feishu;
- send an OTP;
- activate Marketing grant; or
- implement PatternCostingExportV2;
- install `canonicalize@2.1.0`;
- create a PatternCosting implementation branch or worktree;
- rerun GEN-COST-PATTERN-EXPORT-V2-D00 without separate authorization; or
- release Ops Dashboard.

P04 is closed. The next PatternCosting action is a fresh
`GEN-COST-PATTERN-EXPORT-V2-D00` readiness rerun only after separate
authorization.
