# Poparooz Generator Project State

This document records the latest accepted project state. It is a handoff record, not a substitute for verifying the live repository before every task. Current unaccepted work must not be promoted into the accepted baseline.

## Repository

```text
Repository: poparooz-beads
Root: D:\Projects\poparooz-beads
Remote: https://github.com/Solvani/poparooz-beads.git
Branch: main
Accepted implementation HEAD: a3d11880603b430d8dc476b202968eb1b0accc62
Accepted implementation commit: feat: compile formal Poparooz palette source
Live HEAD: a3d11880603b430d8dc476b202968eb1b0accc62
Live worktree: clean
Upstream: origin/main [gone]
Push: not executed
```

`9b2c98e0a1d716243025359d4070ff8c7582a4e3` is the P3-A01.3-U01 ExcelJS dependency-gate commit. `a3d11880603b430d8dc476b202968eb1b0accc62` is the accepted P3-A01.3 formal Palette compilation commit and the latest accepted product implementation baseline. Documentation or governance commits may advance the live repository HEAD without changing that implementation baseline.

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
Status: Runtime implementation complete / review pending
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
Implementation: Completed locally and awaiting review; not yet accepted or frozen
Production GenerationRuntime: Unavailable
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
A08 Production Deployment: Not started
```

## Current Phase

```text
Phase: Phase 3
Status: active
Current implementation task: P3-A02-A07-H02 Final Freeze / Governance / Pre-Commit Gate
H02 status: Completed / Frozen / commit pending
ProcessingPolicy: poparooz-processing-policy / 1.1.0
Option D: Stopped / not implemented
Next planned boundary: A08 Production Deployment; not started or authorized
```

P3-A01.4 and its D01 and A01 through A06 tasks are completed and frozen. The Runtime Artifact and Runtime Lock are deterministic and approved, every Vite build passes the fail-closed Production Gate during configuration resolution, and application startup synchronously validates and initializes the approved immutable Provider before React render. The real production module graph and emitted bundle expose only the approved Runtime Artifact as Palette-generated data. Build or Startup Gate failures do not fall back. Chrome smoke verification passed with generation remaining safely unavailable.

P3-A02-D01 freezes the accepted production Runtime activation contract and implementation boundaries in [`POPAROOZ_PRODUCTION_GENERATION_RUNTIME_ACTIVATION_CONTRACT.md`](POPAROOZ_PRODUCTION_GENERATION_RUNTIME_ACTIVATION_CONTRACT.md) at contract commit `da631da7e58ed43815a27a90b7de386fa2742007`. P3-A02-A01 through P3-A02-A04 have completed the Generation Palette adapter, generation-safe matcher core, Pattern color-identity wiring, and BoardProfile production wiring without activating Production `GenerationRuntime`. P3-A02-A05 freezes nine canonical membership groups, six published v1 fixed Color Set Profiles, and three unpublished cumulative boundaries; its local Runtime implementation now deterministically compiles the approved membership Artifact and Lock, exposes an immutable browser Provider and Generation eligibility projection, and awaits review. ProcessingPolicy production wiring, Worker wiring, and complete generator activation remain unfinished. P3-A02 as a whole is not completed or activated.

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
- The deterministic Runtime Palette Artifact and startup Palette Provider are enabled only for strict Palette validation; Production `GenerationRuntime` remains unavailable.
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
- Production Runtime has not been activated.
- Download, Get Beads, and Shopify remain blocked.

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
- Production Runtime has not been activated.
- The formal 221-color Palette is compiled and frozen, but the Formal Package does not enter the browser production graph directly.

## Current Roadmap

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
P3-A02-A05 Fixed Color Set Profiles            — Runtime implementation review pending
P3-A02     Production Generation Runtime Activation — implementation in progress / not activated
P3-A02-A07-H02 Conservative Transparent Background Cleanup - Completed / Frozen / commit pending
P3-A08     Production Deployment                  Not started
P3-D03     Pattern Annotation and Export          Not started
P3-D04     Get Beads and Catalog Boundary         Not started
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

P3-A01.4 and the P3-A02-D01 contract are frozen. P3-A02-A01 through P3-A02-A04 are completed, and P3-A02-A04 is frozen at final implementation HEAD `aecdc575ca244cd4b2f6ef1c9a237b0a812fb3e5`. The P3-A02-A05 fixed Color Set data contract is frozen; its local Artifact, compiler, Lock, build Gate, browser Provider, Generation adapter, eligibility projection, and bootstrap dependency exposure are implemented and awaiting review. No UI selection, Worker wiring, or Production Runtime activation was added. ProcessingPolicy also remains unimplemented. P3-A02 and Runtime activation are not completed or activated. Catalog sellability, `packSize`, Shopify fields, Download, and Get Beads remain outside the authorized scope and must not be implemented early.

## Known Issues

- Upstream is `origin/main [gone]`.
- Accepted work has not been pushed.
- Production Runtime remains unavailable.
- Conservative Transparent-mode cleanup may retain tinted matte contamination when removing it cannot be distinguished safely from removing legitimate subject color.
- Firefox, Safari, iOS, Android, and screen-reader gates remain open.

## Update Rules

Accepted state may be updated only after all of these conditions are satisfied:

1. Codex has returned an implementation report.
2. Chat project control has completed its review.
3. The user has explicitly accepted the work.
4. Test failures have been resolved or explicitly accepted.
5. An accepted HEAD or formal handoff state is known.

Never update frozen or accepted status solely because Codex reports a task as completed.
