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

## Current Phase

```text
Phase: Phase 3
Status: active
Current governance task: P3-G01.2 Read-only Codex Integration Check
```

P3-G01.2 is a read-only verification task and has not yet been accepted.

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
- Runtime Policy is not frozen.
- Download, Get Beads, and Shopify remain blocked.

## Current Roadmap

```text
P3-D01   Formal Palette Contract             Frozen
P3-A01.1 Schema Compatibility Foundation     Frozen
P3-A01.2 Formal Palette Source Model         Frozen
P3-G01.1 Repository Workflow Bootstrap       Accepted
P3-G01.2 Read-only Codex Integration Check   Ready
P3-D02   Runtime Generation Policy           Not started
P3-D03   Pattern Annotation and Export        Not started
P3-D04   Get Beads and Catalog Boundary       Not started
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
