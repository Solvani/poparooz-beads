# Poparooz Generator Project State

This document records the latest accepted project state. It is a handoff record, not a substitute for verifying the live repository before every task. Current unaccepted work must not be promoted into the accepted baseline.

## Repository

```text
Repository: poparooz-beads
Root: D:\Projects\poparooz-beads
Remote: https://github.com/Solvani/poparooz-beads.git
Branch: main
A02 entry / pre-freeze repository baseline: 0a85392fb48798234fb4a46243bf1de449de63fe
A02 entry baseline commit: docs: synchronize product scope governance
Live HEAD at P3-A03-SCOPE-A01 entry: 71e601ff3d1e17a779d8d01aa906eb6816af4697
Live worktree at P3-A03-SCOPE-A01 entry: clean
Upstream: origin/main
Published governance correction base: 0878c8b5551d01f93adf00ea860db25f7936c8d6
Current implementation HEAD: ca49d9f05a49a39d09e57ff86c909864f8dfb856
Push state at entry: local main and origin/main synchronized
```

`9b2c98e0a1d716243025359d4070ff8c7582a4e3` is the P3-A01.3-U01 ExcelJS dependency-gate commit. `a3d11880603b430d8dc476b202968eb1b0accc62` is the accepted P3-A01.3 formal Palette compilation commit. `4fdac1d8f4e119c03736e02b999b9c6363d2461e` is the historical A08 deployment-hotfix implementation baseline. Later accepted production, evidence, closure, developer-tooling, and governance commits advanced the pushed post-A01 repository baseline to `0a85392fb48798234fb4a46243bf1de449de63fe`. This was the entry / pre-freeze baseline on which P3-A03-SCOPE-A02 was reviewed and frozen. The A02 closure was later committed as `77d7f5443b4be3ffccc82c8508157a04a09d1ab4` (`docs: freeze results and materials governance`).

Every task must verify the actual Git branch, HEAD, worktree, remote, and upstream state. When a formal task prompt provides an Expected HEAD, that explicitly specified task baseline governs. A live HEAD that differs from the accepted implementation baseline is not a conflict by itself; Codex must evaluate the commit history and the task baseline together.

## Product

The core customer journey is:

```text
upload image
-> generate pattern locally
-> inspect dimensions, colors, bead quantities, and board requirements
-> download pattern
-> purchase materials
```

User images are processed only in the browser. They are not uploaded, remotely persisted, logged, or sent to analytics services.

## Completed and Frozen

### Phase 1

The frozen computation foundation includes:

- image normalization;
- EXIF Orientation;
- contain sizing and transparent/white-background handling;
- RGB, XYZ, and Lab conversion;
- CIEDE2000;
- deterministic quantization;
- Worker protocol, cancellation, lifecycle, and safe-error foundations;
- Pattern Matrix;
- bead statistics;
- Board Layout; and
- Public/Internal data separation.

Freeze commit:

```text
024e29d22df35385d7420b53e0dbb5c54126bc58
```

### Phase 2

The complete generator experience, responsive behavior, lifecycle state machine, Canvas, results, and Bottom Sheet contracts are frozen.

Freeze commit:

```text
747aabd48c20928407a81855b0094df6e6952294
```

### Phase 3 accepted work

The entries below preserve their historical stage-local states. The later
accepted production and governance state is summarized under **Current Phase**
and does not rewrite those historical checkpoints.

```text
P3-D01 Formal Palette Contract
Status: Accepted and Frozen
```

```text
P3-A01.1 Formal Palette Schema Compatibility Foundation
Status: Accepted and Frozen
Commit: 81f1fc12a958b7c330b3d4e4ce3411505aa3d87c
Tests after task: 64 files / 697 tests passed
```

```text
P3-A01.2 Formal Palette Source Model Foundation
Status: Accepted and Frozen
Commit: 920d342bd04eef2a10fc19bf3691d668eec92e5c
Tests after task: 67 files / 751 tests passed
Build: passed
TypeScript app/node/test: passed
ESLint: passed
Prettier: passed
```

```text
P3-G01.1 Repository Codex Workflow Bootstrap
Status: Accepted
Purpose: Established AGENTS.md and docs/PROJECT_STATE.md as the repository governance and accepted-state boundaries.
```

```text
P3-G01.2 Read-only Codex Integration Check
Status: Accepted
Result: Repository governance, state loading, Git baseline interpretation, and read-only task execution verified.
```

```text
P3-D02 Runtime Generation Policy
Status: Policy Contract Frozen
Production Runtime Activation: Blocked
```

```text
P3-D02-E01 BoardProfile Evidence Collection
Status: Accepted and Frozen
Result: Formal BoardProfile v1 specifications approved from supplied product information, photographs, and physical measurements.
```

```text
P3-A01.3 Formal 221-color Palette Compilation
Status: Accepted
Commit state: Committed
Freeze state: Frozen
Commit: a3d11880603b430d8dc476b202968eb1b0accc62
Commit message: feat: compile formal Poparooz palette source
```

```text
P3-A01.4 Runtime Palette Artifact and Production Gate
Status: Completed / Frozen
Runtime Artifact SHA-256: 86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70
Runtime Lock SHA-256: 36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648
Runtime Palette: 221 records / 221 active / 221 auto-match eligible
Build Gate: All Vite build modes execute the fail-closed Production Gate.
Startup Gate: The approved Provider is validated synchronously before React render.
Browser boundary: The approved Runtime Artifact is the only Palette-generated data source reachable from the production module graph.
Production GenerationRuntime: Unavailable
```

```text
P3-A01.4-D01 Runtime Palette Contract Freeze
Status: Accepted and Frozen
Result: Runtime Artifact, ordering, derivation, active and auto-match eligibility, versioning, determinism, Gate, fail-closed, and legacy-contract boundaries are frozen.
```

```text
P3-A01.4-A01 Deterministic Runtime Compiler
Status: Completed and Frozen
Runtime Artifact: src/runtime/palette/artifacts/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.json
Artifact SHA-256: 86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70
Records: 221
Active: 221
Auto-match eligible: 221
```

```text
P3-A01.4-A02 Node-only Runtime Palette Lock
Status: Completed and Frozen
Runtime Lock: data-source/runtime-locks/poparooz-standard/formal-1.0.0/runtime-1.0.0/runtime-palette.lock.json
Runtime Lock SHA-256: 36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648
Runtime Artifact SHA-256: 86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70
Formal identity: poparooz-standard / 1.0.0 / POPAROOZ
Source SHA-256: 5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e
Palette Canonical SHA-256: 1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4
Derivation Audit SHA-256: f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020
Records: 221
Active: 221
Auto-match eligible: 221
```

```text
P3-A01.4-A03 Build-time Production Gate
Status: Completed and Frozen
Production Gate config: scripts/palette/runtime/runtime-palette-production-gate.config.ts
Approved Runtime Lock SHA-256: 36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648
Approved Runtime Artifact SHA-256: 86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70
Build behavior: All Vite build commands execute the fail-closed Production Gate during configuration resolution.
Serve behavior: Vite dev and serve do not execute the Production Build Gate.
Browser Provider: Not implemented
Startup Gate: Not implemented
Production GenerationRuntime: Unavailable
```

```text
P3-A01.4-A04 Browser Runtime Schema and Provider
Status: Completed and Frozen
Browser Runtime Artifact Schema: Frozen
Approved Artifact validation: Synchronous and strict
Immutable Runtime Palette Provider: Implemented
Provider Snapshot: 221 / 221 / 221
Browser data boundary: Only the approved Runtime Artifact is imported. Runtime Lock, Runtime Policy, Formal data, XLSX, and Substitute data do not enter the Provider module graph.
Startup Gate: Not implemented
src/main.tsx wiring: Not implemented
Matcher migration: Not implemented
Production GenerationRuntime: Unavailable
```

```text
P3-A01.4-A05 Startup Palette Gate Integration
Status: Completed and Frozen
Startup behavior: The approved Runtime Palette Provider is initialized synchronously before React render.
Provider success: 221 / 221 / 221
Provider failure: Fail closed
App runtime: Explicitly injected unavailable GenerationRuntime
Provider lifecycle: Created outside React render and StrictMode lifecycle
Generation Service: Not created
Worker: Not created
Chrome smoke verification: Passed
Matcher migration: Not implemented
BoardProfile production wiring: Not implemented
ProcessingPolicy production wiring: Not implemented
Production GenerationRuntime: Unavailable
```

```text
P3-A01.4-A06 Production Bundle Boundary and Final Gate Review
Status: Completed and Frozen
Production module graph: Verified from the real Vite config and src/main.tsx entry.
Required browser Palette path: Startup Bootstrap -> approved Provider -> strict Browser Schema -> approved Runtime Artifact
Excluded from browser graph and emitted assets: ExcelJS, XLSX, Formal Package, Derivation Audit, Runtime Lock, Runtime Policy, Substitute data, provenance, MARD, and supplier information
Emitted bundle inspection: Passed in isolated temporary output with success and failure cleanup verified
Artifact field whitelist: Passed recursively
Build Gate: Passed for npm run build, vite build, and vite build --mode development
Startup Gate: Fail closed before React render; no Generation Service or Worker is created
Tests after task: 83 files / 997 tests passed
Accepted Minor: favicon.ico 404 remains deferred to a separate UI or public-asset task
Production GenerationRuntime: Unavailable
```

```text
P3-A02-D01 Production Generation Runtime Activation Contract Freeze
Status: Accepted and Frozen
Accepted contract commit: da631da7e58ed43815a27a90b7de386fa2742007
Nature: Documentation and governance contract only
Production implementation: Not started and not authorized
Production GenerationRuntime: Unavailable
```

```text
P3-A02-A01 Generation Palette Contract and Runtime-to-Generation Adapter
Status: Completed
Commit: 48465ec3ba202a4c4823dc91022e514bd5a65e68
Commit message: feat: add generation palette adapter
```

```text
P3-A02-A02 Matcher Core Contract and Eligibility
Status: Completed
Commit: b8e1e574d7f1b752946cfea14df641f182b17a7c
Commit message: refactor: add generation-safe matcher core
```

```text
P3-A02-A03 Pattern Color Identity and Generation Palette Wiring
Status: Completed
Commit: 9457d0683d61529a7fbb014f4985b95ef2762e80
Commit message: refactor: wire generation palette into pattern pipeline
```

```text
P3-A02-A04 BoardProfile Provider and Generation Input Wiring
Status: Completed and Frozen
Authority: POPAROOZ_P3_A02_A04_BOARD_PROFILE_PROVIDER_AND_GENERATION_INPUT_CONTRACT.md
Final implementation HEAD: aecdc575ca244cd4b2f6ef1c9a237b0a812fb3e5
Commit chain:
- 2cbca5e docs: freeze board profile provider contract
- 93cb571 docs: format board profile provider contract
- c9c60c7 feat: wire approved board profile into generation
- aecdc57 fix: complete board profile generation wiring
Production GenerationRuntime: Unavailable
```

```text
P3-A02-A05 Fixed Color Set Profiles
Status: Completed / Frozen
Authority: POPAROOZ_P3_A02_A05_FIXED_COLOR_SET_PROFILE_DATA_CONTRACT.md
Source workbook SHA-256: a32aac97868a8740c4e4d5bf981f434997708beea710a6493abaf15848179f0c
Canonical Memberships SHA-256: 0010d6e5084074a62869ea44abc4da874131177ac4c7c52375ae60ccd87f1639
Published Profile Definitions SHA-256: 2d5338fe221cf21de68175edf93ac8d2705969f4c4139ca370b5b6fd6937a18b
Published v1 Profiles: 24 / 48 / 72 / 120 / 168 / 221
Unpublished cumulative boundaries: 96 / 144 / 192
Runtime Artifact: src/runtime/color-set/artifacts/poparooz-fixed-color-sets/1.0.0/color-set-profiles.json
Runtime Artifact SHA-256: d3198bfd9a9507236946f5417354c7278b151d572bef7cd376fed5bbfa54b4d7
Runtime Lock: data-source/runtime-locks/poparooz-fixed-color-sets/1.0.0/color-set-profiles.lock.json
Runtime Lock SHA-256: fbad3ba0e2efcea0f1ac07e42b946e097778ca98904dc9e6433be55e4b3c1d79
Candidate counts: 24 / 48 / 72 / 120 / 168 / 221
Implementation: Accepted and production verified through the A08 generation flow
Production GenerationRuntime: Available
```

```text
P3-A02-A07-H02 Conservative Transparent Background Cleanup
Status: Completed / Frozen / commit pending
ProcessingPolicy: poparooz-processing-policy / 1.1.0
Transparent occupancy threshold: 32
Quantization alpha threshold: 16 (unchanged)
Source behavior: Transparent mode uses conservative edge-connected source masking, bounded opaque matte refinement, deterministic resize, one-layer post-resize cleanup, and transparent occupancy canonicalization.
Accepted limitation: Ambiguous tinted matte contamination may remain when it cannot be distinguished safely from legitimate subject color.
Option D: Stopped; no safe parameter window was established and no reconstruction or decontamination was implemented.
A08 Production Deployment: Completed / Frozen / Production Active
```

```text
P3-A02-A08 Production Deployment and Shopify Embed
Status: Completed / Frozen / Production Active
Hosting: Cloudflare Pages static hosting
Production branch: main
Build command: npm run build
Build output: dist
Production URL: https://generator.poparooz.com/
Shopify page: https://poparooz.com/pages/fuse-bead-pattern-maker
Shopify integration: Dedicated pattern-maker page template and poparooz-generator theme section
Desktop smoke: Passed
Mobile smoke: Passed
Generation flow: Production verified
Production smoke: HTTPS, Poparooz branding, upload, White and Transparent generation at 40 x 40, 80 x 80, and 104 x 104, 221-color generation, Maximum Colors, Pattern preview, material totals, package display, PNG download, Worker execution, direct refresh, Shopify navigation, and responsive embedding passed
Browser-local privacy: Preserved
Image path: Upload -> browser decode -> resize/normalization -> local Worker -> Pattern -> local preview -> local PNG download
iframe bridge: Protocol v1 ready/resize metadata only; no image or Pattern content
Backend required: No
Commit: 2d384f49277fd17b99e70a88c0ca6010a4920d18 feat: prepare cloudflare pages shopify embed
Hotfix: cf08a7b8ffda9ae336db623e01e61020b3f3c875 fix: normalize lab white endpoint
Hotfix: 4fdac1d8f4e119c03736e02b999b9c6363d2461e fix: canonicalize white edge background
A08-H01: Closed; corrected exact-white RGB-to-Lab L-star floating-point endpoint overshoot with a narrow 1e-5 theoretical endpoint normalization, without changing matcher or CIEDE2000 semantics
A08-H02: Closed; corrected opaque near-white source-background contamination by canonicalizing strict four-connected edge-identified eligible White-mode source pixels to RGBA(255,255,255,255), without changing subject-color matching
```

## Current Phase

Historical Email Gate checkpoints retain their original scope and side-effect limits.
This is the R01 forward-correction candidate, not a completed production acceptance.

- Published governance correction base: `0878c8b5551d01f93adf00ea860db25f7936c8d6`.
- Current implementation HEAD: `ca49d9f05a49a39d09e57ff86c909864f8dfb856`.
- Implementation commit: **fix: use manual resend redirect handling**.
- `0878c8b` is **PUBLISHED PREMATURE GOVERNANCE / NOT ACCEPTED / REQUIRES FORWARD CORRECTION**. It changes documentation only; publication does not constitute governance acceptance.
- Forward correction status at R01-A02: **PREPARED / NOT YET COMMITTED; PENDING R02 REVIEW / COMMIT / NORMAL PUSH**. The correction is based on the published predecessor above and becomes canonical only after independent review, a separately authorized forward docs-only commit, and normal push. R01 does not amend or rewrite published history.

Current parent stage: **P3-A03-E04-A08**.
Stage name: **Email Gate Production Acceptance & Governance Reconciliation**.
Parent status: **REVIEW**.

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

P3-A03-E04-A08-A00 Governance State Catch-up Audit remains
COMPLETED / READ-ONLY / GOVERNANCE RECONCILED. Its historical reconciliation
baseline is `d02f1433eddbdb11b9b8a2ade92652264103ead8`, previous audited
implementation HEAD `a5d39baf5f761e4d65678743aaef91e7d1cd42eb`, and latest
A08-A00 audited implementation HEAD `119adc1062c0506cbe2f4edf9c74a2c7c6d1c202`.
The six post-baseline implementation commits remain that audit's historical
range, distinct from the later A01-A00 preflight.

Implementation classification: **PROVIDER TRANSPORT COMPATIBILITY /
REDIRECT-HANDLING RELIABILITY FIX**. Resend `redirect: "error"` changes to
`redirect: "manual"`; `User-Agent: poparooz-email-gate/1.0` is retained.
The endpoint, POST, Authorization, Content-Type, Idempotency-Key, request body,
timeout, AbortSignal, bounded response parsing and fail-closed model remain.
No redirect follower, Location processing or second provider fetch is added.
This implementation evidence does not establish serving identity, real delivery
or a uniquely proven production root cause.

Email Gate remains production-configured in repository code. A locked-browser
Download enters the gate; valid local unlock permits browser-local PNG.
Image and Pattern processing remain browser-local; the gate is not DRM.
Configuration represents a standalone Worker, EMAIL_GATE_DB, hourly Cron,
fetch/scheduled handlers, Production Renderer V1 and OTP v1; the Route remains
externally managed. Current remote execution cannot be inferred from config.
The reference Shopify sandbox requires allow-forms without popup/top-navigation
permissions; current live Shopify acceptance remains open.

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

**LATEST OBSERVED / REQUIRES H01 REVALIDATION / NOT YET ACCEPTED**

The stopped H01 preflight observed Worker `poparooz-email-gate-prod`,
deployment `da38e982-8fed-43b2-aebe-8ee981090fa1`,
v13 `428f410a-a6ce-496d-b5b2-75e40c2edbdf` at **100%**,
and previous v12 `e681db7d-1239-4004-8cd2-0d8c94e6363c` at **0%**.
H01 did not perform a promotion or complete its formal verification.
H01 must re-read current deployment, serving source and required continuity
after an approved clean baseline is restored; this observation alone cannot close PA-01.

The accepted H12 later correctly serialized check returned HTTP 400,
`schemaVersion: 1`, `result: version_unsupported`. Historical
`invalid_request` is not a confirmed current parser defect. Original online
body bytes were not captured; the exact quoting/root cause remains unproven.

Historical catch-up evidence remains in
[A08-A00 governance reconciliation](POPAROOZ_P3_A03_E04_A08_A00_PRODUCTION_GOVERNANCE_RECONCILIATION.md).
The [A08-A01 working evidence record](POPAROOZ_P3_A03_E04_A08_A01_BOUNDED_PRODUCTION_ACCEPTANCE_VERIFICATION.md) separates accepted A01-A00
evidence, qualified observations and unique production claims.
Live Shopify, provider/key use, email/OTP/PNG, D1 values and unlock assertions
from the premature batch are preserved there as
**UNVERIFIED / NOT ACCEPTED / PROVENANCE REQUIRED**. They do not establish acceptance.

The frozen privacy boundary is retained: images, Pattern data and PNG generation
remain browser-local; no account or Shopify customer is created; marketing
consent is optional and separate; OTP verification remains server-authoritative;
secret values remain outside the repository.

Immediate next action: Review the corrected governance candidate; after separate R02 authorization,
create and publish a forward corrective docs-only commit without rewriting
`0878c8b`, establish an approved clean main baseline, then complete
P3-A03-E04-A08-A01-A01-H01 Production Version Alignment Verification.
Only after its gate passes and separate authorization is given may A01-A01
zero-email live browser acceptance resume; A01-A02 transactional acceptance
requires later separate authorization. None of these later actions is executed by R01.

No Marketing Consent implementation or Ops Dashboard release is authorized by
this correction or by the premature closure in `0878c8b`.
Their independent governance is unchanged; no downstream release is inferred.

## Historical accepted phase checkpoints through A07-A02

The following entries and explanatory paragraphs preserve their stage-local
facts. Terms such as current, inactive, not started, unavailable, ungated,
empty registry, or absent resources below refer to those historical
checkpoints, not the Current Phase recorded above.

```text
Phase: Phase 3
Status: production active
A02 entry / pre-freeze repository baseline: 0a85392fb48798234fb4a46243bf1de449de63fe
A02 closure commit: 77d7f5443b4be3ffccc82c8508157a04a09d1ab4
P3-A03-SCOPE-A03: COMPLETED / FROZEN / COMMITTED / PUSHED / CLOSED WITH FROZEN EVIDENCE APPLICABILITY QUALIFICATION
A03 implementation commit: 4be9ce43477a7ced7764620ea05c61d0ee433186
A03 implementation subject: refactor: unify derived material requirements
P3-A03-SCOPE-A04: COMPLETED / FROZEN / CLOSED WITH EVIDENCE APPLICABILITY QUALIFICATIONS
A04-A01 implementation commit: 2e5d7e2bf7c45bb0e269c6bbf299099a0347fa1f
A04-A01 implementation subject: fix: clarify generation color set terminology
A04 classification: MINIMAL TERMINOLOGY IMPLEMENTATION / NO MATERIAL CONTRACT DEFECT
A04 governance authority: docs/POPAROOZ_P3_A03_SCOPE_A04_EXPORT_TERMINOLOGY_MATERIAL_CONTRACT_DECISION.md
P3-A03-E05-A00: COMPLETED / READ-ONLY
A00 decision: CURRENT AUTOMATIC RECOMMENDATION DIRECTION BLOCKED
P3-A03-E05-A01: COMPLETED / CUSTOMER RECOMMENDATION PRESENTATION INACTIVE
A01 implementation commit: 09a031d6e2a7ff1e44374807d665bcadeb667f15
A01 implementation subject: fix: hide blocked recommendation presentation
A01 governance authority: docs/POPAROOZ_P3_A03_E05_A01_RECOMMENDATION_CLOSURE.md
P3-A03-E04-A01: COMPLETED / FROZEN / PRODUCTION IMPLEMENTATION NOT STARTED
E04-A01 entry baseline: 3dc0fd57865a2bce3c79d8622c464c82719cb35d
E04 production implementation: NOT STARTED / NOT AUTHORIZED BY A01
P3-A03-E04-A02-A01: COMPLETED / FROZEN / PRODUCTION IMPLEMENTATION NOT STARTED
E04-A02-A01 entry baseline: 36b529fecba2af108560a37c68e3afe450667f0a
E04-A02-A01 frozen direction: SAME-ORIGIN PATH-SCOPED WORKERS ROUTE / D1 ONLY / TURNSTILE / RESEND TRANSACTIONAL VERIFICATION / ONE-TIME CODE
E04-A02-A01 qualification: FROZEN GOVERNANCE DIRECTION ONLY / RESOURCES NOT CREATED / PROVIDER NOT INTEGRATED / PROVIDER-DEFAULT AUDIT UNPERFORMED
E04-A02-A01 authority: docs/POPAROOZ_P3_A03_E04_A02_PROVIDER_TOPOLOGY_RETENTION_DECISION.md
P3-A03-E04-A02-A02-A01: COMPLETED / FROZEN / PRODUCTION IMPLEMENTATION NOT STARTED
E04-A02-A02-A01 entry baseline: 4898d1eec987283fdf4faedb73f6058cde3a7644
E04-A02-A02 authority: docs/POPAROOZ_P3_A03_E04_A02_A02_SCHEMA_SECURITY_API_CONTRACT.md
E04-A02-A02 qualification: PROVIDER-DEFAULT AUDIT UNPERFORMED / RESOURCES NOT CREATED / PRODUCTION IMPLEMENTATION NOT STARTED
P3-A03-E04-A04-A00: COMPLETED / INDEPENDENTLY REVIEWED / FROZEN / COMMITTED / PRODUCTION INACTIVE
E04-A04-A00 implementation commit: 2e333d6016f104fda2737c3c5e9901898a05b5fb
E04-A04-A00 implementation subject: feat: add email gate backend foundation
E04-A04-A00 authority: docs/POPAROOZ_P3_A03_E04_A04_A00_BACKEND_FOUNDATION_FREEZE.md
E04-A04-A00 architecture: ONE STANDALONE EMAIL GATE WORKER / PRODUCTION RENDERER INTENTIONALLY EMPTY
E04-A04-A00 qualification: FRONTEND NOT IMPLEMENTED / DOWNLOAD UNGATED / NO RESOURCES OR PRODUCTION ACTIVATION
P3-A03-E04-A05-A01: COMPLETED / COPY V1 FROZEN / RENDERER IMPLEMENTATION BLOCKED / PRODUCTION INACTIVE
E04-A05-A01 authority: docs/POPAROOZ_P3_A03_E04_A05_A01_DELIVERY_COPY_V1_FREEZE.md
E04-A05-A01 subject: Your Poparooz verification code
E04-A05-A01 renderer: BLOCKED PENDING SENDER ACCEPTANCE / PRODUCTION REGISTRY REMAINS EMPTY
E04-A05-A01 qualification: PRODUCTION SENDER NOT ACCEPTED / FRONTEND UNCHANGED / NO PROVIDER OR RESOURCE MUTATION
P3-A03-E04-A05-A02-A01: COMPLETED / SENDER ACCEPTED / REPLY-TO FROZEN / RENDERER V1 READY FOR IMPLEMENTATION / PRODUCTION INACTIVE
E04-A05-A02-A01 authority: docs/POPAROOZ_P3_A03_E04_A05_A02_A01_SENDER_REPLY_TO_DECISION.md
E04-A05-A02-A01 From: Poparooz <verification@notify.poparooz.com>
E04-A05-A02-A01 Reply-To: poparooz2026@gmail.com
E04-A05-A02-A01 policy: RESEND RECEIVING DISABLED / OPEN TRACKING DISABLED / CLICK TRACKING DISABLED / NO TRACKING SUBDOMAIN
E04-A05-A02-A01 renderer: READY FOR SEPARATELY AUTHORIZED IMPLEMENTATION / PRODUCTION REGISTRY REMAINS EMPTY
E04-A05-A02-A01 qualification: NO EMAIL / DEPLOYMENT / RESOURCE / SECRET / DNS / FRONTEND / PRODUCTION-BEHAVIOR CHANGE
P3-A03-E04-A05-A03-A00: COMPLETED / INDEPENDENTLY REVIEWED / RENDERER V1 FROZEN / COMMITTED / PRODUCTION INACTIVE
E04-A05-A03-A00 implementation commit: 5fe514e1728a3dbd0631d21e5cb4f603645a6a9c
E04-A05-A03-A00 implementation subject: feat: add email gate delivery renderer v1
E04-A05-A03-A00 authority: docs/POPAROOZ_P3_A03_E04_A05_A03_A00_RENDERER_V1_FREEZE.md
E04-A05-A03-A00 renderer: REPOSITORY IMPLEMENTED / REGISTERED / FROZEN / DEPLOYED INACTIVE
E04-A05-A03-A00 verification recovery: NON-DETERMINISTIC RESOURCE-CONTENTION / NOT REPRODUCED UNDER SEQUENTIAL VERIFICATION
E04-A05-A03-A00 qualification: FRONTEND NOT IMPLEMENTED / DOWNLOAD UNGATED / NO EMAIL, DEPLOYMENT, RESOURCE, SECRET, DNS, OR PRODUCTION-BEHAVIOR CHANGE
P3-A03-E04-A06: COMPLETED / CODE REVIEWED / VISUALLY APPROVED / FROZEN / COMMITTED / PRODUCTION INACTIVE
E04-A06 implementation commit: 676241c8307c525bca98521ad4a984897920eed7
E04-A06 implementation subject: feat: add email download gate frontend
E04-A06 authority: docs/POPAROOZ_P3_A03_E04_A06_FRONTEND_FREEZE.md
E04-A06 browser QA: DESKTOP AND MOBILE USER APPROVED / V1 FOCUS AND STATUS DEFECTS CLOSED
E04-A06 qualification: PRODUCTION CAPABILITY UNAVAILABLE / DOWNLOAD UNGATED / V2 VISUAL OBSERVATIONS ACCEPTED AS-IS / NO BACKEND OR PRODUCTION ACTIVATION
P3-A03-E04-A07-A02: COMPLETED / OTP KEY PRODUCTION CONTRACT FROZEN / CONTROLLED PROVISIONING NOT PERFORMED / PRODUCTION INACTIVE
E04-A07-A02 authority: docs/POPAROOZ_P3_A03_E04_A07_A02_OTP_KEY_PRODUCTION_CONTRACT.md
E04-A07-A02 key contract: 32 CSPRNG BYTES -> 43 UNPADDED BASE64URL ASCII CHARACTERS -> CURRENT WORKER UTF-8 BYTES / VERSION 1
E04-A07-A02 implementation delta: NO CODE CHANGE REQUIRED FOR INITIAL V1 / VERSION-AWARE RUNTIME CHANGE REQUIRED BEFORE V2 ROTATION
E04-A07-A02 remote entry state: INTENDED D1 AND PRODUCTION TURNSTILE WIDGET EXIST / WORKER, ROUTE, CUSTOM DOMAIN, CRON, TARGET SECRETS, AND D1 USER SCHEMA ABSENT
E04-A07-A02 qualification: NO REAL KEY / SECRET WRITE / DEPLOYMENT / D1 MUTATION / ROUTE / CRON / EMAIL / FRONTEND ACTIVATION
Canonical active customer-facing term: Generation Color Set
Production GenerationRuntime: Available and production verified
Cloudflare Pages: Active
Shopify embed: Active
Production implementation resume: Conditional
Historical E04 governance state at the A07-A02 checkpoint: P3-A03-E04-A06 frontend implemented / code reviewed / visually approved / frozen / committed / production inactive
Next E04 gates recorded at that historical checkpoint: PROVIDER, INFRASTRUCTURE, AND PRODUCTION ACTIVATION GATES REMAIN SEPARATELY AUTHORIZED / OPEN
```

The production Runtime and the A08 deployment remain active. The formal
Generation Color Set profiles are `24 / 48 / 72 / 120 / 168 / 221`; `96`,
`144`, and `192` are not formal profiles. Background Removal v1 Conservative
and production area-average sampling remain the production baselines.

P3-A03-E05-D02 froze Recommendation Policy v1:

```text
Recommended Bead Set = Required Bead Set
```

Required and Recommended remain semantically independent. P3-A03-E05-D04
later evaluated automatic Generation Color Set Recommendation and concluded
that deterministic recommendation is not reliable enough. That separate
automatic recommendation remains blocked, not activated, and outside the
current production scope; it does not supersede Recommendation Policy v1.

P3-A03-E05-A00 completed the current read-only architecture and evidence audit:

```text
CURRENT AUTOMATIC RECOMMENDATION DIRECTION BLOCKED
```

P3-A03-E05-A01 keeps manual Generation Color Set selection active and keeps
Required Bead Set, Bead Requirements, and Additional Refill Packs visible. It
removes Recommended Bead Set from active customer rendering and does not expose
Auto or Recommended for Your Image. Recommendation Policy v1 and its tests remain
retained as a separate post-generation semantic contract. Future reopening
requires a new mechanism-level hypothesis, independent evidence, and separate
authorization.

P3-A03-E04-A01 defines the bounded Email Download Gate product, privacy,
verification, persistence, consent, backend, security, accessibility, and
implementation-entry contract. It supersedes the historical statement that the
entire Email Gate topic is deferred, but only at the governance-contract level.
The existing PNG remains browser-local; no gate UI, endpoint, provider,
Cloudflare infrastructure, or production behavior has been implemented.

P3-A03-E04-A02-A01 freezes the provider, topology, and retention governance
direction while keeping the static application on Cloudflare Pages. It selects
a narrow same-origin path-scoped standalone Workers Route, D1-only storage,
Turnstile abuse challenge, Resend transactional verification delivery, and
one-time-code verification. Production implementation and provider acceptance
remain blocked; the provider-default audit is unperformed, and no account,
Worker, D1 database, Turnstile widget, DNS record, secret, scheduled aggregation,
or downstream report has been created. P3-A03-E04-A02-A02-A01 freezes the
schema, security, and API contract. P3-A03-E04-A04-A00 implements and freezes
the repository-only standalone Worker/D1 backend foundation at commit
`2e333d6016f104fda2737c3c5e9901898a05b5fb`. Its production renderer remains
intentionally empty, the frontend is not implemented, Download remains ungated,
and provider acceptance and every resource-entry and activation gate remain open.
P3-A03-E04-A05-A01 freezes the exact Delivery Copy V1 subject and plain-text
copy plus the minimal-HTML semantic, OTP, expiry, transactional-only, privacy,
and no-links/tracking/marketing boundaries. The production sender is not
accepted, so Renderer V1 remains blocked, unimplemented, and unregistered.

P3-A03-E04-A05-A02-A01 accepts the verified `notify.poparooz.com` Resend
sending-domain state and freezes `Poparooz
<verification@notify.poparooz.com>` as From and `poparooz2026@gmail.com` as
Reply-To. Resend Receiving, open tracking, and click tracking remain disabled,
with no tracking subdomain. Renderer V1 must add immutable provider-neutral
`replyTo` identity and reproduce it for same-event retries. It is ready for a
separately authorized implementation but remains unimplemented and
unregistered; the production registry stays empty and production remains
inactive.

P3-A03-E04-A05-A03-A00 implements, independently reviews, and freezes
Production Delivery Renderer V1 at commit
`5fe514e1728a3dbd0631d21e5cb4f603645a6a9c`. The repository Worker registers
the exact deterministic V1 payload, including immutable From, Reply-To,
subject, text, HTML, and provider `reply_to` mapping. The earlier three
concurrent-run timeouts did not reproduce across repeated isolated runs, the
two affected files together, or the sequential 132-file / 1522-test repository
suite. No Worker is deployed; the frontend remains unchanged and Download
remains ungated. Provider/account acceptance, resources, secrets, deployment,
route, Cron, real delivery, and production activation remain open.

P3-A03-E04-A06 implements and freezes the repository Email Download Gate
frontend at commit `676241c8307c525bca98521ad4a984897920eed7`. A06-A01 final
code review passed; the actual lazy dialog, CSS, Poparooz Logo, and approved
floral asset were rendered in Chrome at Desktop `1440 x 1000` / `1440 x 800`
and Mobile `390 x 844` / `375 x 667`. The V1 focus and status-semantic defects
were closed, and the user approved Desktop and Mobile while accepting the two
recorded V2 visual qualifications as-is. Local unlock, original-Pattern
identity, stale-response rejection, exactly-once completion, lazy presentation,
and canonical server-import containment are frozen by
`docs/POPAROOZ_P3_A03_E04_A06_FRONTEND_FREEZE.md`. Production still injects
`UNAVAILABLE_EMAIL_GATE_CAPABILITY`; current Download remains ungated. No
Worker, D1, Turnstile, real email, provider, route, secret, Shopify protocol, or
manual deployment was activated.

P3-A03-E04-A07-A02 freezes initial production OTP key version 1 as exactly 32
CSPRNG source bytes encoded into 43 unpadded Base64url ASCII characters. The
current Worker performs no Base64url decode: it uses `TextEncoder` and imports
the UTF-8 bytes of that exact text as the HMAC-SHA-256 key. D1 persists the
version for every challenge, and both same-event delivery recovery and
verification need the recorded historical key. Initial v1 provisioning requires
no code change, but the current production entry point registers only version 1;
dual-version overlap must be implemented and reviewed before any v2 rotation.
No real key, Worker secret, deployment, migration, route, Cron, email, or
frontend activation was created by this governance stage.

P3-A03-SCOPE-A02 retains Recommendation Policy v1 only as a post-generation
material-policy result for the already-generated current Pattern. It does not
select the Generation Color Set, change `selectedColorSetProfileId`, score image
quality, choose a palette automatically, or trigger regeneration. Its source
evidence used `poparooz-set-221` and does not prove equal profile-specific
generation quality across all six formal Generation Color Sets.

`MaterialRequirement`, `PublicMaterialRequirement`, and
`buildMaterialRequirements()` remain authoritative for final Pattern per-color
`beadCount`. P3-A03-SCOPE-A03 froze `PublicPatternResult.materials` as the input
to the active production/application `DerivedMaterialRequirementV1` projection.
That contract passes `beadCount` through, uses a nominal capacity of 1,000,
derives `totalPacksRequired = ceil(beadCount / 1000)`, and derives
`additionalRefillPacks = max(0, totalPacksRequired - 1)`.

P3-A03-SCOPE-A04 froze **Generation Color Set** as the active customer-facing
term in Settings, Results Pattern Summary, and local PNG metadata. **Bead Color
Set** is deprecated for active customer-facing use. The local PNG maps derived
materials by `patternColorIndex`, retains `pattern.colors` display order, and
does not change Pattern Matrix, quantity authority, or Export geometry.
`Pattern.boardLayout` remains Pattern layout truth, while
`recommendBoardSetup()` remains the separate, unchanged production
board-purchase recommendation. Commerce quantity and purchase strategy remain
unfrozen.

P3-A03-SCOPE completed a repository-level product-completeness audit. It found
no P0 blocker in repository code contracts or accepted evidence, subject to
governance corrections. This is not new iPhone/Android, keyboard or screen
reader, performance, Shopify Cart/variant/inventory, or complete live-production
acceptance. P3-A03-SCOPE-A02 subsequently completed and froze the Results /
Materials Decision. A03 then unified the derived material contract, and A04
completed the minimal Export/Settings terminology implementation without finding
a Material Contract defect. A04 evidence does not claim pixel-level PNG visual
or clipping acceptance. Any later work requires separate explicit authorization.

P3-A01.4 and its D01 and A01 through A06 tasks are completed and frozen. The Runtime Artifact and Runtime Lock are deterministic and approved, every Vite build passes the fail-closed Production Gate during configuration resolution, and application startup synchronously validates and initializes the approved immutable Provider before React render. The real production module graph and emitted bundle expose only the approved Runtime Artifact as Palette-generated data. Build or Startup Gate failures do not fall back.

P3-A02-D01 freezes the accepted production Runtime activation contract and implementation boundaries in [`POPAROOZ_PRODUCTION_GENERATION_RUNTIME_ACTIVATION_CONTRACT.md`](POPAROOZ_PRODUCTION_GENERATION_RUNTIME_ACTIVATION_CONTRACT.md) at contract commit `da631da7e58ed43815a27a90b7de386fa2742007`. The accepted implementation chain now composes the approved Palette, Color Set, BoardProfile, ProcessingPolicy, generation service, and lazy Worker into the production `GenerationRuntime`. A08 production acceptance verified the complete browser-local generation flow directly and through the Shopify iframe.

### P3-A02-D01 frozen contract

The frozen P3-A02-D01 contract records:

- a permanent `RuntimePaletteSnapshot -> Runtime-to-Generation Palette Adapter -> GenerationPaletteSnapshot` boundary;
- a Generation Palette limited to `code`, `hex`, `rgb`, `lab`, `sortOrder`, `active`, and `autoMatchEligible`;
- a separate Public Color record limited to the literal brand `Poparooz`, approved customer-facing `code`, approved `hex`, and an optional approved customer-facing `name`;
- omission of `name` when no approved customer-facing name exists, without internal, supplier, series, code, `MARD`, or third-party-brand fallback;
- matcher eligibility as `active && autoMatchEligible`, independent from Catalog sellability, inventory, or product status;
- the existing CIEDE2000 calculation and deterministic `distance -> sortOrder -> code` tie-break;
- omission of unverified finish data rather than inference, `false`, or an `unknown` placeholder;
- an approved BoardProfile artifact, Provider, adapter, and immutable generation snapshot using `poparooz-board-104` version `1.0.0`;
- `278 / 103 mm` as the authoritative derived internal peg pitch and `2.70 mm` as its rounded display value;
- a versioned ProcessingPolicy with contain sizing, no upscale, Alpha threshold byte `16`, and Maximum Colors `2..64` with default `32`;
- the unchanged Worker protocol and Quantizer engineering range of `1..512`;
- synchronous, fail-closed Runtime composition before React render;
- one immutable Runtime and Service per successful application startup, with no Worker created at startup;
- lazy Worker creation during quantization, deterministic disposal, and no automatic retry; and
- atomic result publication through the existing Phase 2 controller and state-machine boundary.

Production Generation does not read, populate, calculate, or output `packSize` or `packsRequired`. P3-A02 does not delete the complete legacy commerce schema and does not authorize sellability, inventory, Shopify, Substitute, shortage replacement, Download, Get Beads, multi-Palette selection, or UI redesign work.

### P3-A02-A04 frozen implementation contract

[`POPAROOZ_P3_A02_A04_BOARD_PROFILE_PROVIDER_AND_GENERATION_INPUT_CONTRACT.md`](POPAROOZ_P3_A02_A04_BOARD_PROFILE_PROVIDER_AND_GENERATION_INPUT_CONTRACT.md)
is the field and boundary authority for P3-A02-A04. The stage targets one sole
approved BoardProfile Artifact, a browser-safe Provider, a
BoardProfile-to-Generation adapter, an immutable
`GenerationBoardProfileSnapshot`, Generation Service and Pattern input
migration, and bootstrap composition wiring. Production `GenerationRuntime`
must remain unavailable throughout A04.

P3-A02-A04 does not authorize BoardProfile value changes, candidate profile
activation, ProcessingPolicy, Runtime activation, Worker wiring, UI redesign,
physical finished-size calculations, Runtime Palette changes, matcher or
CIEDE2000 changes, Download/PDF/PNG, or Commerce, Shopify, inventory, and
Substitute work.

The top-level `P3-A02` and `P3-A04` identifiers in the historical
`POPAROOZ_DEVELOPMENT_ROADMAP.md` are legacy roadmap numbers. They do not refer
to the nested current stage `P3-A02-A04`. That historical roadmap is not
cleaned up or reinterpreted by this governance patch.

## Frozen Phase 3 Decisions

- The formal internal identity is `referenceSystem = "POPAROOZ"`.
- `MARD` remains only as a historical internal reference.
- Customer color codes use a letter and number, such as `A1`, `B16`, and `M15`.
- The first formal version may omit English color names.
- When a name is absent, customers see only the Poparooz color code.
- HEX is the numeric color source.
- RGB and Lab are deterministic derived values.
- Digital color status is `source_declared`.
- Physical color status is `unverified`.
- Source Manifest, Normalized Schema, Canonical Serialization, and separate source/canonical SHA-256 boundaries are established.
- The formal 221-color source Palette is compiled, accepted, committed, and frozen as `poparooz-standard` version `1.0.0`.
- The deterministic Runtime Palette Artifact and startup Palette Provider feed the available, fail-closed Production `GenerationRuntime`.
- Runtime Policy uses a versioned local Palette Provider.
- Production availability uses a fail-closed gate.
- Test palettes cannot be used as a production fallback.
- Generation availability is independent from catalog inventory.
- Runtime Policy is versioned, and each generation uses an immutable Runtime Snapshot.
- Production inputs require strict build-time validation and lightweight browser-startup validation.
- ProcessingPolicy `poparooz-processing-policy` version `1.1.0` freezes a Transparent-mode occupancy threshold of `32` while retaining the independent quantization alpha threshold of `16`.
- Transparent-mode background cleanup is deterministic and browser-local: conservative edge-connected source masking, bounded opaque matte refinement, contain resize, one post-resize fringe layer, then occupancy canonicalization.
- Tinted matte contamination that cannot be separated safely from legitimate subject color is an accepted v1 limitation. Option D reconstruction was stopped and is not implemented.
- The alpha threshold is fixed at `16/255`.
- Upscaling is deterministic and local only.
- Maximum Colors has a minimum of `2`, a default of `32`, and a hard maximum of `64`.
- Runtime v1 does not automatically retry Worker failures.
- Partial results never enter public state; successful results are published atomically.
- Internal technical details never enter customer errors.
- Logs must not contain user images or pixel data.
- Production Runtime is activated and production verified.
- Local PNG download and the Shopify iframe are active. Get Beads commerce remains outside this acceptance.
- White-mode exact-white Lab endpoint normalization is frozen at the narrow `1e-5` theoretical endpoint tolerance.
- Eligible fully opaque White-mode sources reuse the strict four-connected edge identity and canonicalize only identified pixels to exact opaque white. Thresholds remain `alpha = 255`, minimum RGB channel `248`, and maximum channel spread `6`, with existing no-background and all-background fail-open behavior.

### Formal Palette v1

```text
paletteId = poparooz-standard
paletteVersion = 1.0.0
referenceSystem = POPAROOZ
status = approved
recordCount = 221
```

The approved series counts are:

```text
A: 26
B: 32
C: 29
D: 26
E: 24
F: 25
G: 21
H: 23
M: 15
Total: 221
```

The authoritative formal source is:

```text
data-source/palettes/poparooz-standard/1.0.0/source/Poparooz色卡.xlsx
```

The frozen source and artifact hashes are:

```text
Source SHA-256: 5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e
Palette Canonical SHA-256: 1474d8587f9959be876e5bdfc6f29373c68dd427b0c84ac1b474944d672872a4
Derivation Audit SHA-256: f070bc32e80dd3a3885ee3caad4085b1752ed6376cba865597788d655fed9020
Substitute Canonical SHA-256: 5582d15099ed4e623b0af325e884f6567cc405cecb72af2efdf587ceed5693a7
```

Color evidence status is frozen as:

```text
displayNameStatus = not_provided
digitalColorStatus = source_declared
physicalColorStatus = unverified
```

HEX is the numeric color source. RGB and Lab are derived deterministically through the frozen conversion path. The internal `color-derivation-audit.json` records:

```text
recordCount = 221
algorithm = rgb8ToLab-v1
decimalPrecision = 12
```

Audit serialization rounding does not change future Runtime color-matching inputs.

### Substitute reference dataset

```text
substituteDatasetId = poparooz-substitute-reference
substituteDatasetVersion = 1.0.0
relationCount = 67
high = 9
regular = 22
small_area_only = 36
status = reference_only
physicalValidationStatus = unverified
applicationPolicy = disabled
directionPolicy = worksheet_declared_bidirectional
```

The substitute reference dataset does not merge formal color codes, enter default color matching, automatically change a pattern, act as an inventory-outage replacement, or belong to the Runtime Palette.

### Formal source lifecycle

- The formal version directory is authoritative.
- `data-source/incoming/` is only a local intake directory, and its contents are excluded by `.gitignore` except for the tracked `.gitkeep` placeholder.
- The compiler does not automatically delete, move, or overwrite incoming content.
- An incoming copy is not a second formal source of truth.
- An incoming source with a different hash fails closed with `SOURCE_INPUT_CONFLICT`.
- Formal version identity is determined by the version directory, Manifest, and approved hashes.

### P3-A01.3 verification baseline

```text
Test files: 71 passed
Tests: 795 passed
TypeScript: passed
Build: passed
Lint: passed
Prettier: passed
git diff --check: passed
Production Bundle boundary: passed
```

ExcelJS is used only by Node offline compilation tooling and is excluded from the browser production bundle. The approved Runtime Palette Artifact is loaded only by the strict Browser Provider during startup; the browser does not load the Formal Package, Runtime Lock, Runtime Policy, Derivation Audit, or Substitute data, and Production `GenerationRuntime` remains unavailable.

### BoardProfile v1

```text
BoardProfile ID: poparooz-board-104
BoardProfile version: 1.0.0
Status: approved
Shape: square
Columns: 104
Rows: 104
Outer width: 280 mm
Outer height: 280 mm
Board thickness: 2 mm
First-to-last peg center span: 278 mm
Internal peg pitch: 2.70 mm
Connectable: true
Shared edge pegs: false
Seam peg-center distance: 2.3 mm
Seam spacing: non-uniform
Default for v1: true
```

- The internal peg pitch is derived from `278 mm / 103 intervals`.
- Seam spacing does not change the Pattern Matrix cell count.
- Board counts continue to use `104 × 104` cells per board.
- `78 × 78` (`210 × 210 × 2 mm`) and `52 × 52` (`140 × 140 × 2 mm`) are future candidates only and are not enabled in v1.
- Production Runtime is activated and production verified.
- The formal 221-color Palette is compiled and frozen, but the Formal Package does not enter the browser production graph directly.

## Current Roadmap

Email Gate rows through A07-A02 preserve historical stage-local availability
and side-effect limits. The dedicated A00 record preserves the catch-up audit;
the corrected A01 working record preserves open/qualified acceptance gates.
The following roadmap is a forward-correction candidate, not a completion claim.

```text
P3-D01     Formal Palette Contract               Frozen
P3-A01.1   Schema Compatibility Foundation       Frozen
P3-A01.2   Formal Palette Source Model           Frozen
P3-G01.1   Repository Workflow Bootstrap         Accepted
P3-G01.2   Read-only Codex Integration Check     Accepted
P3-D02     Runtime Generation Policy             Policy frozen
P3-D02-E01 BoardProfile Evidence Collection      Frozen
P3-A01.3   Formal 221-color Palette Compilation  Frozen
P3-A01.4   Runtime Palette Artifact and Production Gate Frozen
P3-A01.4-D01 Runtime Palette Contract Freeze      Frozen
P3-A01.4-A01 Deterministic Runtime Compiler       Frozen
P3-A01.4-A02 Node-only Runtime Lock               Frozen
P3-A01.4-A03 Build-time Production Gate           Frozen
P3-A01.4-A04 Browser Runtime Schema and Provider   Frozen
P3-A01.4-A05 Startup Gate Integration              Frozen
P3-A01.4-A06 Production Bundle Boundary and Final Gate Review Frozen
P3-A02-D01 Production Generation Runtime Activation Contract — contract frozen
P3-A02-A01 Generation Palette Adapter             Completed
P3-A02-A02 Generation-safe Matcher Core            Completed
P3-A02-A03 Pattern Color Identity and Palette Wiring Completed
P3-A02-A04 BoardProfile Provider and Generation Input Wiring — Completed / Frozen
P3-A02-A05 Fixed Color Set Profiles            — Completed / Frozen
P3-A02     Production Generation Runtime Activation — Completed / Frozen / Production Active
P3-A02-A07-H02 Conservative Transparent Background Cleanup - Completed / Frozen / Pushed
P3-A02-A08 Production Deployment and Shopify Embed - Completed / Frozen / Production Active
P3-A02-A08-H01 Lab White Endpoint Hotfix          Closed
P3-A02-A08-H02 White Opaque Background Cleanup    Closed
P3-D03     Pattern Annotation and Export           Historical roadmap entry / superseded by later accepted work
P3-D04     Get Beads and Catalog Boundary          Historical roadmap entry / commerce not implemented
P3-A03-H03 Background Removal v1 Conservative      Frozen / production baseline
P3-A03-Q02 Sampling Exploration                    Closed / area-average retained
P3-A03-E05-D02 Recommendation Policy v1            Frozen
P3-A03-E05-D04 Automatic Generation Recommendation Blocked / not activated
P3-A03-E05-A00 Recommendation Architecture Audit    Completed / read-only / direction blocked
P3-A03-E05-A01 Recommendation Customer UI Closure   Completed / customer presentation inactive
P3-A03-E04-A01 Email Download Gate Contract          Completed / frozen / production not implemented
P3-A03-E04-A02-A01 Provider/Topology/Retention Decision Completed / frozen / production implementation not started / provider acceptance pending
P3-A03-E04-A02-A02-A01 Schema/Security/API Contract Completed / frozen
P3-A03-E04-A04-A00 Email Gate Backend Foundation Completed / frozen / committed / production inactive
P3-A03-E04-A05-A01 Delivery Copy V1 Freeze       Completed / copy frozen / renderer blocked / production inactive
P3-A03-E04-A05-A02-A01 Sender / Reply-To Decision Completed / frozen / renderer ready for implementation / production inactive
P3-A03-E04-A05-A03-A00 Renderer V1 Freeze       Completed / frozen / committed / production inactive
P3-A03-E04-A06 Email Download Gate Frontend Freeze Completed / code reviewed / visually approved / frozen / committed / production inactive
P3-A03-E04-A07-A02 OTP Key Production Contract Completed / frozen / ready for controlled infrastructure provisioning / production inactive
P3-A03-SCOPE Product Completeness Audit             Complete / corrections synchronized by A01
P3-A03-SCOPE-A01 Governance Synchronization         Completed / scope closure synchronized
P3-A03-SCOPE-A02 Results / Materials Decision       Completed / frozen with applicability qualifications
P3-A03-SCOPE-A03 Unified Derived Material Requirement Contract Completed / frozen / committed / pushed / closed with frozen evidence applicability qualification
P3-A03-SCOPE-A04 Export Terminology / Material Contract Completed / frozen / closed with evidence applicability qualifications
P3-A03-E04-A08 Email Gate Production Acceptance & Governance Reconciliation REVIEW
P3-A03-E04-A08-A00 Governance State Catch-up Audit COMPLETED / READ-ONLY / GOVERNANCE RECONCILED
P3-A03-E04-A08-A01 Bounded Production Acceptance Verification IN PROGRESS / NOT YET ACCEPTED
P3-A03-E04-A08-A01-A00 Production Acceptance Preflight & Evidence Inventory COMPLETED / READ-ONLY / NON-MUTATING / ACCEPTED
P3-A03-E04-A08-A01-A01 Published Shopify & Live Browser Non-Email Acceptance NOT COMPLETED / NOT RESUMED
P3-A03-E04-A08-A01-A01-H01 Production Version Alignment Verification NOT COMPLETED / BLOCKED PENDING GOVERNANCE RECONCILIATION
P3-A03-E04-A08-A01-A02 NOT STARTED
Marketing Consent v1 implementation NO RELEASE CREATED BY A08 OR R01
Ops Dashboard v1 HOLD / NO RELEASE CREATED BY A08 OR R01
```

The frozen P3-A02-D01 implementation boundary is:

```text
approved Runtime Palette Provider
-> permanent Runtime-to-Generation Palette adapter
-> matcher contract migration
-> approved BoardProfile Provider and adapter
-> versioned ProcessingPolicy Provider
-> synchronous complete Runtime composition
-> complete Production GenerationRuntime activation review
```

P3-A01.4, the P3-A02-D01 contract, and the accepted P3-A02 implementation chain are frozen. P3-A02-A08 completed production deployment through Cloudflare Pages and the manually configured Shopify iframe. Production generation, local PNG download, desktop/mobile embedding, direct URL refresh, custom-domain HTTPS, and browser-local privacy passed production acceptance. Catalog sellability, `packSize`, inventory, Cart API, Shopify App/App Proxy, and Get Beads commerce remain outside this acceptance.

## Known Issues

- Conservative Transparent-mode cleanup may retain tinted matte contamination when removing it cannot be distinguished safely from removing legitimate subject color.
- Firefox, Safari, iOS, Android, and screen-reader gates remain open.
- The live Shopify theme is external platform state. Its dedicated template, section, navigation entry, and corrected image-gallery schema value are not represented automatically by this repository.

## Update Rules

Accepted state may be updated only after all of these conditions are satisfied:

1. Codex has returned an implementation report.
2. Chat project control has completed its review.
3. The user has explicitly accepted the work.
4. Test failures have been resolved or explicitly accepted.
5. An accepted HEAD or formal handoff state is known.

Never update frozen or accepted status solely because Codex reports a task as completed.
