# Poparooz Generator Source of Truth

Status: **Phase 0 frozen baseline**

Baseline version: **1.3**

Last reviewed: **2026-07-29**

## Authority

This document is the single governing baseline for the current Poparooz Generator. If a requirement, prototype, screenshot, task, or older document conflicts with this baseline, this document and the formal decision documents it references take precedence.

- Pindoo Creator Hub is competitor and workflow reference only. Its pages, code, copy, branding, images, and complete feature set must not be copied.
- MARD is retained only as an internal color reference system for truthful source mapping and audit.
- Poparooz is the only customer-visible product, color-display, sales, and website brand. Customer content never displays MARD or another third-party brand name, logo, or icon.
- Scope may not expand without an explicit product decision and a corresponding update to this baseline.
- Every phase is implemented and accepted independently. Passing one phase is required before entering the next.
- MVP-A has no account, database, cloud project storage, community system, or Shopify Cart API.

## Product definition

Poparooz Generator is a browser-based fuse bead pattern generation and material-planning tool for users of the Poparooz Shopify store. Its business loop is:

1. Select an image locally.
2. Generate a buildable bead pattern.
3. Label the pattern using eligible Poparooz display color codes backed by internally traced reference data.
4. Calculate bead and board requirements.
5. Download the pattern and material list.
6. Continue to the configured Poparooz bead collection.

Pattern generation is an enabling capability. The commercial outcome is to reduce the difficulty of planning a project and turn a verified material requirement into a Poparooz shopping journey.

The generator is not a general image editor, AI image platform, bead-art community, social network, cloud project manager, or Pindoo clone.

## Frozen architecture direction

The formal MVP deployment architecture is **an independently deployed Vercel generator embedded in a Shopify page by iframe**:

```text
https://www.poparooz.com/pages/fuse-bead-pattern-maker
└── Shopify content and iframe container
    └── https://generator.poparooz.com
        └── Poparooz Fuse Bead Pattern Generator
```

The generator remains a standalone application with its complete core generation flow when opened directly at `https://generator.poparooz.com`. The intended implementation direction is React, TypeScript, Vite, Canvas, Web Worker, and browser-local image processing. This is a Phase 0 architecture decision, not an assertion that those technologies currently exist in the repository.

Shopify owns its header, navigation, SEO and explanatory copy, FAQ, privacy explanation, product entry points, cart, iframe container, resize handling, full-screen fallback, and any future same-origin Cart API bridge. Vercel owns upload, local image processing, internal-reference matching, pattern generation, the Canvas workspace, bead/board statistics, PNG/CSV downloads, and controlled messages to the parent.

The generator and Shopify parent communicate through a versioned `postMessage` protocol with exact origin validation. Images and image-derived content never cross that boundary.

MVP-A does not use a Shopify App, Embedded App, Admin App, App Proxy, Shopify CLI project, deep theme customization, Docker, WSL, server-side image processing, authentication, a database, or Cart API integration. Shopify integration does not change this repository into a Shopify App.

Production uses `https://generator.poparooz.com`; a `vercel.app` deployment is limited to development or deployment verification and is not the long-term public entry. Preview origins are not automatically trusted by production.

## Phase 0 repository finding

At audit time the local Git repository was an empty, initialized repository on an unborn `main` branch. It contained no project files, commits, application, package manifest, dependency lock, configuration, tests, build output, prototype, or legacy documentation. Phase 0 therefore establishes documentation only; it does not infer or fabricate an existing technical implementation.

See [`reviews/P0_A01_CURRENT_STATE_AUDIT.md`](reviews/P0_A01_CURRENT_STATE_AUDIT.md) for the evidence and limitations.

## Formal decision set

- [`POPAROOZ_PRODUCT_DECISIONS.md`](POPAROOZ_PRODUCT_DECISIONS.md): product positioning, MVP boundaries, page structure, mobile behavior, and Shopify journey.
- [`POPAROOZ_PUBLIC_BRANDING_CONTRACT.md`](POPAROOZ_PUBLIC_BRANDING_CONTRACT.md): authoritative separation between internal reference data and all customer-visible Poparooz presentation.
- [`POPAROOZ_MARD_PALETTE_CONTRACT.md`](POPAROOZ_MARD_PALETTE_CONTRACT.md): authoritative MARD palette fields, runtime validation, provenance levels, fixture rules, and production-data entry conditions.
- [`POPAROOZ_PALETTE_IMPORT_CONTRACT.md`](POPAROOZ_PALETTE_IMPORT_CONTRACT.md): authoritative offline CSV/metadata format, conversion, source, error-reporting, and import-tool boundary.
- [`POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md`](POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md): authoritative browser-local image signatures, limits, orientation, contain, RGBA normalization, cleanup, cancellation, and privacy boundary.
- [`POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md`](POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md): authoritative RGB8, normalized sRGB, linear RGB, XYZ D65, and CIELAB D65 units, formulas, validation, precision, and Alpha boundary.
- [`POPAROOZ_COLOR_MATCHING_CONTRACT.md`](POPAROOZ_COLOR_MATCHING_CONTRACT.md): authoritative CIEDE2000, eligible-candidate filtering, deterministic nearest-color tie-breaking, errors, and internal/public result boundary.
- [`POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md`](POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md): authoritative Alpha threshold, exact RGB Histogram, weighted Lab Median Cut, actual-entry Medoid, no-dither, indices, counts, and deterministic output boundary.
- [`POPAROOZ_WEB_WORKER_PROCESSING_CONTRACT.md`](POPAROOZ_WEB_WORKER_PROCESSING_CONTRACT.md): authoritative module Worker protocol, Transferable ownership, cancellation, supersede, stale-result rejection, lifecycle, and safe-error boundary.
- [`POPAROOZ_PATTERN_MATERIAL_AND_BOARD_CONTRACT.md`](POPAROOZ_PATTERN_MATERIAL_AND_BOARD_CONTRACT.md): authoritative quantized-to-palette mapping, merged pattern matrix, exact materials, complete-matrix board layout, internal/public result, and invariant boundary.
- [`POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md`](POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md): palette, board, pattern, materials, image, color, export, privacy, analytics, and message data contracts.
- [`POPAROOZ_IFRAME_AND_SHOPIFY_CONTRACT.md`](POPAROOZ_IFRAME_AND_SHOPIFY_CONTRACT.md): deployment boundary, iframe lifecycle, origins, resize, CSP, sandbox, full-screen fallback, and deferred cart bridge.
- [`POPAROOZ_DEVELOPMENT_ROADMAP.md`](POPAROOZ_DEVELOPMENT_ROADMAP.md): phased delivery plan and entry dependencies.
- [`POPAROOZ_ACCEPTANCE_CRITERIA.md`](POPAROOZ_ACCEPTANCE_CRITERIA.md): acceptance gates for Phase 0 and later phases.

These documents are subordinate to this index but normative where referenced. A change is not approved until conflicting sections across the formal decision set are updated together.

## Current scope boundary

Phase 0 includes only:

- P0-A01 current repository and project-state audit;
- P0-A02 product scope and business decision freeze;
- P0-A03 data, algorithm, export, privacy, analytics, and iframe contract freeze;
- P0-A04 roadmap and acceptance-gate freeze.
- P0-A05 Vercel deployment, Shopify iframe, and upstream-license supplement.

Phase 0 explicitly excludes implementation of image upload, a Canvas workspace, image generation, a production palette, quantization or color matching runtime, Web Workers, PNG/CSV export runtime, deployment, Shopify integration, accounts, databases, Cart API, community features, AI extraction, and advanced editing.

## Current implementation status

Phase 1 tasks P1-A01 through P1-A09 are implemented and independently reviewed. P1-A08 runs the accepted P1-A07 whole-image quantizer only in a native module Worker through protocol version 1. P1-A09 synchronously maps that result through accepted palette matching into a merged pattern matrix, exact materials, complete-matrix board tiles, and a Poparooz-only public result. There is no synchronous main-thread re-quantization, Worker protocol extension, or fake progress.

P1-A10 and later work remain unimplemented: no performance/device acceptance, production palette, verified physical board, Canvas workspace, customer UI, export, Shopify integration, or deployment is present. Production palette and board truth remain unresolved dependencies.

## Data truth boundary

No production internal reference palette, Poparooz display-code list, or sellable range is defined. Publicly available color values may later be used internally only as clearly labeled reference values; they must not be presented as exact physical matches or verified Poparooz inventory. Internal palette fields are governed by [`POPAROOZ_MARD_PALETTE_CONTRACT.md`](POPAROOZ_MARD_PALETTE_CONTRACT.md), canonical file ingestion by [`POPAROOZ_PALETTE_IMPORT_CONTRACT.md`](POPAROOZ_PALETTE_IMPORT_CONTRACT.md), and every customer-visible consumer by [`POPAROOZ_PUBLIC_BRANDING_CONTRACT.md`](POPAROOZ_PUBLIC_BRANDING_CONTRACT.md). Visual reference charts are not valid production palette sources.

Only colors satisfying all three flags may enter production automatic matching:

```text
isActive === true
AND isSellable === true
AND isAutoMatchEnabled === true
```

Special-finish colors are excluded from normal-photo automatic matching by default. Missing supplier or commerce data remains empty; it must never be invented.

## Privacy and security boundary

- Original images, file names, file paths, pixels, thumbnails, Base64, fingerprints, embeddings, and content-revealing features are never uploaded or logged.
- Original image data is not persisted to LocalStorage and is discarded on refresh or unload.
- Production messaging never uses `*` as `targetOrigin`; both child and parent validate the versioned protocol.
- Shop navigation must arise from an explicit user action and from a configured collection key, never an arbitrary message URL.

## Source and license boundary

No upstream project, Fork relationship, LICENSE, or third-party dependency is present or evidenced in the audited repository. No license family—including AGPL—may be assumed. Before external code is used, its repository URL, exact commit, license text, copyright notices, commercial-use terms, network/source-disclosure obligations, same-license requirements, and dependency licenses must be recorded. Missing or unclear permission blocks that code from becoming a production basis. Existing author notices must never be removed.

## Change control

Before implementation begins, read this file and every formal document relevant to the task. A task must remain within one accepted roadmap stage, include tests proportionate to its risk, and pass that stage's acceptance gate. Unknown supplier, board, Shopify, browser-support, domain, or deployment facts remain tracked dependencies rather than guessed defaults.

## Phase 1 freeze

P1-A01 through P1-A10 are complete and the Phase 1 computation foundation is frozen under [`POPAROOZ_PHASE_1_COMPLETION_AND_FREEZE.md`](POPAROOZ_PHASE_1_COMPLETION_AND_FREEZE.md). Overall performance is Yellow and Pattern Assembly Worker Decision is C pending representative browser/mobile evidence. Phase 2 is not started; before any UI implementation, 3–5 desktop/mobile approaches must be presented and the user must explicitly select one.
