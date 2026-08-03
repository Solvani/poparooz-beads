# Poparooz Generator Project State

This document records the latest accepted project state. It is a handoff record, not a substitute for verifying the live repository before every task. Current unaccepted work must not be promoted into the accepted baseline.

## Repository

```text
Repository: poparooz-beads
Root: D:\Projects\poparooz-beads
Remote: https://github.com/Solvani/poparooz-beads.git
Branch: main
Accepted implementation HEAD: 920d342bd04eef2a10fc19bf3691d668eec92e5c
Accepted implementation commit: feat: establish formal palette source model
Live repository HEAD: verify before every task
Live worktree: verify before every task
Worktree at handoff: clean
Upstream at handoff: origin/main [gone]
Push status: not pushed
```

`920d342bd04eef2a10fc19bf3691d668eec92e5c` is the latest accepted product implementation baseline. Documentation or governance commits may advance the live repository HEAD without changing that implementation baseline.

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

## Current Phase

```text
Phase: Phase 3
Status: active
Current planning task: P3-A01.3 Formal 221-color Palette Compilation
```

P3-A01.3 is currently a planning task. No formal palette import or Runtime activation is authorized yet.

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
- The formal `Poparooz色卡.xlsx` has not been read by the compilation flow.
- The formal 221-color Palette has not been imported.
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
- Production Runtime has not been activated, and the formal 221-color Palette has not been imported.
- Download, Get Beads, and Shopify remain blocked.

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
P3-A01.3   Formal 221-color Palette Compilation  Planning
P3-D03     Pattern Annotation and Export          Not started
P3-D04     Get Beads and Catalog Boundary         Not started
```

## Known Issues

- Upstream is `origin/main [gone]`.
- Accepted work has not been pushed.
- The formal 221-color Excel source has not entered the compilation flow.
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
