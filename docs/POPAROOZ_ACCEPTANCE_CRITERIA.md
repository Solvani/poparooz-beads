# Poparooz Acceptance Criteria

Status: **Frozen Phase 0 gates**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Universal gate

Every task must stay within one roadmap item, preserve accepted decisions, contain no unrelated changes or sensitive/local data, run every check configured at that point, document unavailable checks honestly, and receive a separate acceptance decision before the next phase.

## Phase 0 acceptance

- [x] Target local repository root and configured Remote identified.
- [x] Branch, absence of HEAD, initial worktree state, and inability to calculate ahead/behind recorded.
- [x] Structure, capabilities, runtime configuration, build/test state, and repository hygiene audited without modifying files first.
- [x] Existing implementation accurately recorded as absent; no technology or successful check fabricated.
- [x] A single Source of Truth and referenced product, contract, roadmap, acceptance, and audit documents established.
- [x] README points to the Source of Truth. No `AGENTS.md` was created because none existed.
- [x] Product positioning, MVP-A, MVP-B, deferred cart, community, mobile, and iframe strategy are non-conflicting.
- [x] MARD identity, sellable filter, provenance, special finishes, fixtures, and truth-label rules are frozen without creating a fake palette.
- [x] Board schema and two-dimensional board formula are frozen without inventing a production board.
- [x] Pattern and material structures and version strategy are defined.
- [x] Image input, orientation, containment, transparency, quantization, color conversion, CIEDE2000, tie-break, determinism, and no-dither baseline are defined.
- [x] PNG, CSV, metadata, privacy, analytics denylist, and iframe protocol/security contracts are defined.
- [x] Phases 1–5, Community Backlog, Phase 1 dependencies, and next task are defined.
- [x] No image generator, production color engine/palette, Canvas workspace, Worker runtime, PNG/CSV runtime, account, database, Cart API, deployment, or community implementation was added.

Phase 0 is **Accepted with follow-up** because externally verified Remote state, production palette/inventory, physical board, Shopify, Vercel/domain, and target-browser facts remain unresolved. These are recorded dependencies and do not invalidate the documentation baseline.

## Phase 1 gate

Phase 1 requires a configured React/TypeScript/Vite baseline, reproducible dependency installation, build/type/lint/unit checks, runtime-validated domain schemas, labeled fixtures, palette import validation, deterministic image/color pipeline, CIEDE2000 reference tests, stable tie tests, Worker cancellation and parity tests, exact counts/layout tests, performance/memory evidence on representative devices, and no full workspace UI.

Production data is not required to test the algorithm core, but fixture boundaries must be visible in file names, code, and UI paths. No fixture may ship as a production palette or board default.

## Phase 2 gate

Phase 2 requires the accepted Phase 1 core; accessible upload/settings/result/material/summary flows; desktop and true canvas-first mobile layouts; pointer, keyboard, and touch operation; loading/cancel/error/memory states; component tests; and no export, deployment, or Cart API work pulled forward.

## Phase 3 / MVP-A gate

Phase 3 requires deterministic and metadata-complete PNG/CSV output; tested download failures/limits; exact iframe origin/window/message validation; secure CSP/sandbox; Shopify content/fallback/full-screen flow; configured Vercel and custom domain; privacy-safe analytics; E2E and target mobile-browser evidence; verified production palette/sellable range and physical board; and final MVP-A acceptance.

## Phase 4 and Phase 5 gates

Phase 4 begins only after MVP-A acceptance and keeps edits deterministic, reversible, performant, and locally private. Phase 5 begins only with verified Shopify mappings, pack and reserve policy, inventory behavior, parent-page Cart API design, partial failure behavior, and explicit commerce/privacy acceptance.
