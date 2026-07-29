# Poparooz Generator Source of Truth

Status: **Phase 0 frozen baseline**

Baseline version: **1.0**

Last reviewed: **2026-07-29**

## Authority

This document is the single governing baseline for the current Poparooz Generator. If a requirement, prototype, screenshot, task, or older document conflicts with this baseline, this document and the formal decision documents it references take precedence.

- Pindoo Creator Hub is competitor and workflow reference only. Its pages, code, copy, branding, images, and complete feature set must not be copied.
- MARD is the color reference system; original MARD color codes remain visible and are not rebranded as Poparooz codes.
- Poparooz is the product sales and website brand.
- Scope may not expand without an explicit product decision and a corresponding update to this baseline.
- Every phase is implemented and accepted independently. Passing one phase is required before entering the next.
- MVP-A has no account, database, cloud project storage, community system, or Shopify Cart API.

## Product definition

Poparooz Generator is a browser-based fuse bead pattern generation and material-planning tool for users of the Poparooz Shopify store. Its business loop is:

1. Select an image locally.
2. Generate a buildable bead pattern.
3. Label the pattern using eligible MARD color codes.
4. Calculate bead and board requirements.
5. Download the pattern and material list.
6. Continue to the configured Poparooz bead collection.

Pattern generation is an enabling capability. The commercial outcome is to reduce the difficulty of planning a project and turn a verified material requirement into a Poparooz shopping journey.

The generator is not a general image editor, AI image platform, bead-art community, social network, cloud project manager, or Pindoo clone.

## Frozen architecture direction

The intended MVP direction is React, TypeScript, Vite, Canvas, Web Worker, browser-local image processing, Vercel, and a standalone `generator.poparooz.com` origin embedded by a Shopify Custom Liquid parent page. This is a Phase 0 direction, not an assertion that these technologies currently exist in the repository.

The generator and Shopify parent communicate through a versioned `postMessage` protocol with exact origin validation. Images and image-derived content never cross that boundary.

MVP-A does not require Docker, WSL, Shopify CLI, server-side image processing, authentication, a database, or Cart API integration.

## Phase 0 repository finding

At audit time the local Git repository was an empty, initialized repository on an unborn `main` branch. It contained no project files, commits, application, package manifest, dependency lock, configuration, tests, build output, prototype, or legacy documentation. Phase 0 therefore establishes documentation only; it does not infer or fabricate an existing technical implementation.

See [`reviews/P0_A01_CURRENT_STATE_AUDIT.md`](reviews/P0_A01_CURRENT_STATE_AUDIT.md) for the evidence and limitations.

## Formal decision set

- [`POPAROOZ_PRODUCT_DECISIONS.md`](POPAROOZ_PRODUCT_DECISIONS.md): product positioning, MVP boundaries, page structure, mobile behavior, and Shopify journey.
- [`POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md`](POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md): palette, board, pattern, materials, image, color, export, privacy, analytics, and iframe contracts.
- [`POPAROOZ_DEVELOPMENT_ROADMAP.md`](POPAROOZ_DEVELOPMENT_ROADMAP.md): phased delivery plan and entry dependencies.
- [`POPAROOZ_ACCEPTANCE_CRITERIA.md`](POPAROOZ_ACCEPTANCE_CRITERIA.md): acceptance gates for Phase 0 and later phases.

These documents are subordinate to this index but normative where referenced. A change is not approved until conflicting sections across the formal decision set are updated together.

## Current scope boundary

Phase 0 includes only:

- P0-A01 current repository and project-state audit;
- P0-A02 product scope and business decision freeze;
- P0-A03 data, algorithm, export, privacy, analytics, and iframe contract freeze;
- P0-A04 roadmap and acceptance-gate freeze.

Phase 0 explicitly excludes implementation of image upload, a Canvas workspace, image generation, a production palette, quantization or color matching runtime, Web Workers, PNG/CSV export runtime, deployment, Shopify integration, accounts, databases, Cart API, community features, AI extraction, and advanced editing.

## Data truth boundary

No production MARD palette or Poparooz sellable range is defined in Phase 0. Publicly available color values may later be used only as clearly labeled reference values. They must not be presented as exact physical matches or as verified Poparooz inventory.

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

## Change control

Before implementation begins, read this file and every formal document relevant to the task. A task must remain within one accepted roadmap stage, include tests proportionate to its risk, and pass that stage's acceptance gate. Unknown supplier, board, Shopify, browser-support, domain, or deployment facts remain tracked dependencies rather than guessed defaults.
