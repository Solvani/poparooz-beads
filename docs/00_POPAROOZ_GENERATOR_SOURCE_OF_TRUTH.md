# Poparooz Generator Source of Truth

Status: **Production active; synchronized through P3-A03-SCOPE-A04 Export Terminology / Material Contract closure**

Baseline version: **3.3**

Last reviewed: **2026-08-24**

## Authority

This document is the single governing baseline for the current Poparooz Generator. If a requirement, prototype, screenshot, task, or older document conflicts with this baseline, this document and the formal decision documents it references take precedence.

- Pindoo Creator Hub is competitor and workflow reference only. Its pages, code, copy, branding, images, and complete feature set must not be copied.
- MARD is retained only as an internal color reference system for truthful source mapping and audit.
- Poparooz is the only customer-visible product, color-display, sales, and website brand. Customer content never displays MARD or another third-party brand name, logo, or icon.
- Scope may not expand without an explicit product decision and a corresponding update to this baseline.
- Every phase is implemented and accepted independently. Passing one phase is required before entering the next.
- The current production scope has no account, database, cloud project storage,
  community system, or Shopify Cart API bridge. Historical MVP-A decisions are
  retained below as historical baselines, not as a complete description of the
  later accepted product.

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

The formal MVP deployment architecture is **an independently deployed static generator embedded in a Shopify page by iframe**. A08 freezes Cloudflare Pages as the production host:

```text
https://poparooz.com/pages/fuse-bead-pattern-maker
└── Shopify content and iframe container
    └── https://generator.poparooz.com
        └── Poparooz Fuse Bead Pattern Generator
```

The generator remains a standalone application with its complete core generation flow when opened directly at `https://generator.poparooz.com`. Production uses React, TypeScript, Vite, Canvas, a lazy Web Worker, and browser-local image processing.

Shopify owns its header, navigation, SEO and explanatory copy, FAQ, privacy explanation, product entry points, cart, iframe container, resize handling, full-screen fallback, and any future same-origin Cart API bridge. The independently deployed generator owns upload, local image processing, internal-reference matching, pattern generation, the Canvas workspace, bead/board statistics, the current local PNG download, and controlled messages to the parent. CSV expansion remains deferred unless separately authorized.

The current production generator and Shopify parent communicate through a
versioned `postMessage` protocol with exact origin validation. Production
messages are limited to `generator.ready` and `generator.resize`; raw images,
Pattern content, and image-derived material data do not cross that boundary.
A future, separately reviewed Commerce contract may authorize an
explicit-customer-action-only payload containing approved public Poparooz color
codes and approved commerce quantities. That exception is a candidate only and
is not authorized or implemented by this document. Source images, pixels,
filenames, paths, file metadata, Pattern Matrix data, image or Pattern hashes,
internal/reference/supplier color identity, and arbitrary generator state remain
prohibited.

Current production does not use a Shopify App, Embedded App, Admin App, App
Proxy, Shopify CLI project, server-side image processing, authentication, a
database, or Cart API integration. Shopify integration does not change this
repository into a Shopify App. Any future Cart bridge requires a separately
approved Commerce contract and remains parent-owned.

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
- [`POPAROOZ_CRAFT_UI_V1_CONTRACT.md`](POPAROOZ_CRAFT_UI_V1_CONTRACT.md): authoritative Phase 2 Design Tokens, responsive layout, semantic shell, accessibility, and customer-visible UI boundary.
- [`POPAROOZ_PHASE_2_COMPLETION_AND_FREEZE.md`](POPAROOZ_PHASE_2_COMPLETION_AND_FREEZE.md): Phase 2 completion record, frozen contracts, open gates, and Phase 3 entry boundary.
- [`POPAROOZ_P3_A03_SCOPE_FREEZE_DECISION.md`](POPAROOZ_P3_A03_SCOPE_FREEZE_DECISION.md): current product-completeness scope closure, evidence limitations, exclusions, and conditional next-stage sequence.
- [`POPAROOZ_P3_A03_SCOPE_A02_RESULTS_MATERIALS_DECISION.md`](POPAROOZ_P3_A03_SCOPE_A02_RESULTS_MATERIALS_DECISION.md): authoritative Results and Materials terminology, recommendation applicability, material authority, board boundary, derived projection, and Commerce boundary.
- [`POPAROOZ_P3_A03_SCOPE_A04_EXPORT_TERMINOLOGY_MATERIAL_CONTRACT_DECISION.md`](POPAROOZ_P3_A03_SCOPE_A04_EXPORT_TERMINOLOGY_MATERIAL_CONTRACT_DECISION.md): authoritative active customer-facing terminology, local-PNG material mapping, A03 Material Authority application, and A04 evidence qualifications.
- [`reviews/P2_I10_PHASE_2_FINAL_AUDIT.md`](reviews/P2_I10_PHASE_2_FINAL_AUDIT.md): final repository, history, regression, scope, privacy, brand, and resource audit evidence.

These documents are subordinate to this index but normative where referenced. A change is not approved until conflicting sections across the formal decision set are updated together.

## Historical Phase 0 scope boundary

The following records the repository's Phase 0 boundary. It is retained as
history and must not be read as the current implementation state or as
permission to disregard later accepted and frozen behavior.

Phase 0 includes only:

- P0-A01 current repository and project-state audit;
- P0-A02 product scope and business decision freeze;
- P0-A03 data, algorithm, export, privacy, analytics, and iframe contract freeze;
- P0-A04 roadmap and acceptance-gate freeze.
- P0-A05 Vercel deployment, Shopify iframe, and upstream-license supplement.

Phase 0 explicitly excludes implementation of image upload, a Canvas workspace, image generation, a production palette, quantization or color matching runtime, Web Workers, PNG/CSV export runtime, deployment, Shopify integration, accounts, databases, Cart API, community features, AI extraction, and advanced editing.

## Current implementation status

Phase 1 tasks P1-A01 through P1-A10 are implemented, reviewed, and frozen. P1-A08 runs the accepted P1-A07 whole-image quantizer only in a native module Worker through protocol version 1. P1-A09 synchronously maps that result through accepted palette matching into a merged pattern matrix, exact materials, complete-matrix board tiles, and a Poparooz-only public result. P1-A10 records the Yellow performance classification, Worker Decision C, full regression, and final audit. There is no synchronous main-thread re-quantization, Worker protocol extension, or fake progress.

P2-D01 and P2-D02 selected **Poparooz Guided Canvas Commerce** and froze **Poparooz Craft UI v1**. P2-I01 completed the repository and UI implementation plan. P2-I02 established the Design Tokens, semantic App Header, empty three-region workspace, and responsive shell. P2-I03 added local single-image selection, drag and drop, ephemeral original preview, Replace/Remove, and controlled Pattern Settings. P2-I04 adds dependency-injected Phase 1 generation orchestration, a pure lifecycle reducer, immutable job snapshots, Abort/Supersede/stale-result protection, dirty/regenerating behavior, and safe status UI. The production App remains generation-unavailable until approved Palette, BoardProfile, and processing policy inputs exist. It adds no Canvas drawing, result details, production palette, verified physical board, export, Shopify integration, or deployment.

## P2-I05 acceptance update

P2-I04 is complete. P2-I05 adds a `PublicPatternResult`-only Canvas with cached raster rendering, visible-region cropping, Fit/Zoom/Grid controls, bounded pointer and wheel pan, resize handling, DPR clamping, accessible semantics, and retention of the last successful Canvas and viewport through Dirty and regeneration states. It adds no public result summary, production palette, verified board data, export, Shopify behavior, or deployment. The production App remains generation-unavailable until approved Palette, BoardProfile, and processing policy inputs exist.

## P2-I06 acceptance update

P2-I06 adds customer-safe Pattern Summary, public color/bead quantities, and abstract Board Layout results from the last successful `PublicPatternResult`. It uses authoritative public totals, a stable count/index/code color order, an eight-row collapsed list with a 512-row ceiling, exact CSS board tiles through 100 boards, and a single compressed preview above that threshold. It excludes unverified package quantities, price, inventory, Shopify, downloads, Bottom Sheet, editing, production Palette, and verified physical-board claims. Result view errors remain separate from Generator success and preserve a valid Canvas. The production runtime remains unavailable.

## P2-I07 acceptance update

P2-I07 replaces the generic action placeholder with a stable Pattern Options region and a pure lifecycle/result-identity mapper. Download Pattern and Get Beads for This Pattern remain native disabled actions with readable “Coming later” and unavailable explanations; both production capability flags are frozen to false. Actions follow the exact last successful result displayed by Canvas and Results through Success, Dirty, Regenerating, update Abort/Error, replacement Success, and Remove. The full local customer flow is now continuous, but no export, download, navigation, commerce adapter, package calculation, price/inventory behavior, Bottom Sheet, production data, or new dependency is implemented. The production generation runtime remains unavailable.

## P2-I08 acceptance update

P2-I08 adds container-width Workspace Modes, a Compact result-first structure, four Settings/Colors/Boards/Original launchers, and a dependency-free Portal Bottom Sheet with modal semantics, tabs, focus containment/restore, background isolation, body scroll restoration, Escape/Close/Backdrop/96px handle-drag closure, and complete resource cleanup. Compact mounts each stateful business component in exactly one location and shares the displayed successful result identity across Canvas, Summary, detail panels, and Actions. Medium remains full-width through the Canvas and uses one column at 768–899px with internal two-column detail groups allowed at 900–1099px. Desktop/Wide remains three-column. P2-I08 adds no pinch zoom, sticky action bar, download, navigation, commerce, production data, dependency, or P2-I09 final browser/device acceptance. Production generation remains unavailable.

## P2-I09 acceptance update

P2-I09 completed automated regression, responsive boundary, controlled-Chromium, accessibility-tree, contrast, lifecycle, resource-cleanup, and stress validation. The evidence-backed visible-focus defect was fixed. Phase 2 UI code validation is **Passed with external device gates open**; rows without direct environment evidence remain `Not verified` and continue to block production launch. No production palette, runtime, export, commerce, persistence, Shopify behavior, or deployment was added.

## Historical Phase 0 data truth boundary

The opening statements in this section describe the evidence state at the
Phase 0 freeze. The later formal Palette and production Runtime state under
**Current production state** supersedes those historical availability claims;
the privacy, provenance, and public/internal separation rules remain binding.

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

## Current production state

- A02 entry / pre-freeze repository baseline:
  `0a85392fb48798234fb4a46243bf1de449de63fe`
- Accepted repository baseline at P3-A03-SCOPE-A01 entry:
  `71e601ff3d1e17a779d8d01aa906eb6816af4697`
- P3-A02-A08: **Completed / Frozen / Production Active**
- Production Launch Readiness: **Accepted for the deployed MVP scope**
- Production Generation Runtime: **Available and production verified**
- Cloudflare Pages: **Active**, static `dist` deployment from GitHub `main`
- Production generator: `https://generator.poparooz.com/`
- Shopify page: `https://poparooz.com/pages/fuse-bead-pattern-maker`
- Desktop and mobile Shopify embed smoke: **Passed**
- Browser-local privacy: **Preserved**
- Backend, database, Pages Functions, Cloudflare runtime Worker, Shopify App, App Proxy, and OAuth backend: **Not used**
- Current Cart API/material-message bridge: **Not implemented**
- Formal Generation Color Sets: **24 / 48 / 72 / 120 / 168 / 221**
- Canonical active customer-facing term: **Generation Color Set**
- Deprecated active customer-facing term: **Bead Color Set**
- A04 classification: **Minimal terminology implementation / no Material Contract defect**
- Recommendation Policy v1: **Retained / not superseded; Recommended Bead Set equals Required Bead Set while remaining semantically independent**
- Automatic Generation Color Set Recommendation: **Blocked / not activated / outside current production scope**

The production acceptance includes upload, 40/80/104 White and Transparent generation, the 221-color set, Maximum Colors, Pattern preview, bead/material totals, selected package display, local PNG download, production Worker execution, desktop/mobile Shopify embedding, direct refresh, custom-domain HTTPS, Poparooz-only customer branding, and gallery regression after the external Shopify schema correction.

User images remain browser-local through upload, browser decode, resize/normalization, local Worker execution, Pattern creation, local preview, and local PNG download. There is no image-upload backend, photo database, persistent photo storage, or deployment-introduced image logging. The production iframe bridge sends only bounded protocol-version-1 readiness and height metadata; it does not transfer images or Pattern content.

P3-A03-SCOPE found no P0 blocker in the repository-level audit, code contracts,
or accepted evidence. It did not perform new real-device, keyboard/screen-reader,
performance, Shopify Cart/variant/inventory, or complete live-production
acceptance. Production implementation resume remains conditional.

P3-A03-SCOPE-A02 applies Recommendation Policy v1 only after generation to the
already-generated current Pattern. It does not select a Generation Color Set or
trigger regeneration. Generation Color Set, Required Bead Set, and Recommended
Bead Set are separate concepts. The E05 evidence used `poparooz-set-221` and
must not be generalized into proof of equal profile-specific generation quality
across all six formal Generation Color Sets.

Pattern-domain `MaterialRequirement`, `PublicMaterialRequirement`, and
`buildMaterialRequirements()` remain authoritative for per-color `beadCount`.
The active production/application projection starts from
`PublicPatternResult.materials` and returns `DerivedMaterialRequirementV1` with
exactly `patternColorIndex`, `color`, `beadCount`, `nominalBeadsPerColor`,
`totalPacksRequired`, and `additionalRefillPacks`. It must pass through
`PublicMaterialRequirement.beadCount` rather than recount the Pattern Matrix or
use `pattern.colors[].beadCount` as quantity authority. The frozen derivation is:

```text
nominalBeadsPerColor = 1000
totalPacksRequired = ceil(beadCount / 1000)
additionalRefillPacks = max(0, totalPacksRequired - 1)
```

The local PNG Export derives quantities once, maps material and display color by
`patternColorIndex`, and preserves `pattern.colors` legend display order. The
Generation Color Set metadata comes from the successful-generation snapshot.
Required Bead Set, Recommended Bead Set, Bead Requirements, and Additional
Refill Packs remain separate concepts.

`totalPacksRequired` is a nominal 1,000-bead pack equivalent and is not
`commerceQuantity`; Commerce identity, quantity, catalog, inventory, cart, and
purchase strategy remain outside Pattern/material truth. `Pattern.boardLayout`
is authoritative Pattern layout truth. `recommendBoardSetup()` remains the
separate, unchanged production board-purchase recommendation behavior.

The pre-existing independent formula in
`scripts/evidence/e05-recommendation-policy-evaluation.ts` remains an accepted
frozen historical evidence exception, not an active production/application
material consumer. A04 did not modify it. A04 froze source-level terminology and
Export contract invariance, but did not complete pixel-level PNG visual or
clipping acceptance.

## Historical Phase 1 and Phase 2 freeze

- Phase 2 UI Implementation: **Completed and Frozen**
- Phase 2 Code Validation: **Passed with external device gates open**
- Production Launch Readiness at the Phase 2 freeze: **Blocked**
- Production Generation Runtime at the Phase 2 freeze: **Unavailable**

P2-D01/P2-D02 and P2-I01 through P2-I10 are complete. The accepted experience includes the responsive shell, local upload and preview, settings, generation lifecycle, `PublicPatternResult` Canvas and results, disabled Pattern Options, Compact Bottom Sheet, Medium tablet workspace, and P2-I09 hardening. Download and Get Beads remain disabled placeholders without behavior. External browser/device/accessibility evidence, verified production data, the production generation runtime, export, commerce, Shopify, and deployment remain outside this freeze and must not be inferred as accepted.

The Phase 1 computation, domain, Worker, algorithm, assembly, and public-result contracts remain frozen and unchanged by Phase 2. Any future change to a frozen Phase 2 contract requires a separately accepted task, an updated governing contract and regression evidence, and a new explicit freeze record.

Historical Phase 2 entry condition recorded at the Phase 1 freeze:

P1-A01 through P1-A10 were complete and the Phase 1 computation foundation was frozen under [`POPAROOZ_PHASE_1_COMPLETION_AND_FREEZE.md`](POPAROOZ_PHASE_1_COMPLETION_AND_FREEZE.md). Overall performance was Yellow and Pattern Assembly Worker Decision was C pending representative browser/mobile evidence. At that historical point Phase 2 had not started, and the required UI-direction selection gate was still open; it was subsequently satisfied by P2-D01/P2-D02.
