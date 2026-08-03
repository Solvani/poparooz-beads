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
P3-A01.4-D01 Runtime Palette Contract Freeze
Status: Accepted and Frozen
Result: Runtime Artifact, ordering, derivation, active and auto-match eligibility, versioning, determinism, Gate, fail-closed, and legacy-contract boundaries are frozen.
```

## Current Phase

```text
Phase: Phase 3
Status: active
Current task: P3-A01.4-D01 Runtime Palette Contract Freeze
Next task: P3-A01.4-A01 Deterministic Runtime Compiler
```

The P3-A01.4-D01 contract is frozen. The Runtime Artifact and Runtime Lock have not been generated, the Build Production Gate and Startup Palette Gate have not been implemented, and Production `GenerationRuntime` remains unavailable. P3-A01.4 remains in progress and must not be described as complete.

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
- A Production Runtime Palette has not been generated or enabled.
- Runtime Policy uses a versioned local Palette Provider.
- Production availability uses a fail-closed gate.
- Test palettes cannot be used as a production fallback.
- Generation availability is independent from catalog inventory.
- Runtime Policy is versioned, and each generation uses an immutable Runtime Snapshot.
- Production inputs require strict build-time validation and lightweight browser-startup validation.
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

ExcelJS is used only by Node offline compilation tooling and is excluded from the browser production bundle. No Runtime Palette has been generated or enabled.

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
- The formal 221-color Palette has not been imported.

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
P3-A01.4   Runtime Palette Artifact and Production Gate In progress
P3-A01.4-D01 Runtime Palette Contract Freeze      Frozen
P3-A01.4-A01 Deterministic Runtime Compiler       Ready
P3-D03     Pattern Annotation and Export          Not started
P3-D04     Get Beads and Catalog Boundary         Not started
```

The provisional next-stage scope is:

```text
Formal Palette
-> Runtime Palette artifact
-> active / auto-match eligibility policy
-> Production Gate integration
```

P3-A01.4 remains planning only. Catalog sellability, `packSize`, Shopify fields, Download, and Get Beads remain outside the authorized scope and must not be implemented early.

## Known Issues

- Upstream is `origin/main [gone]`.
- Accepted work has not been pushed.
- Production Runtime remains unavailable.
- Firefox, Safari, iOS, Android, and screen-reader gates remain open.

## Update Rules

Accepted state may be updated only after all of these conditions are satisfied:

1. Codex has returned an implementation report.
2. Chat project control has completed its review.
3. The user has explicitly accepted the work.
4. Test failures have been resolved or explicitly accepted.
5. An accepted HEAD or formal handoff state is known.

Never update frozen or accepted status solely because Codex reports a task as completed.
