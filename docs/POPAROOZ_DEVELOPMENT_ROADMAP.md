# Poparooz Development Roadmap

Status: **Phase 0 frozen roadmap**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

No phase starts until the previous phase's acceptance gate passes. Tasks do not borrow work from later phases.

## Phase 0 — business freeze and development preparation

- P0-A01: current repository audit.
- P0-A02: product baseline and scope freeze.
- P0-A03: data, algorithm, export, privacy, analytics, and iframe contracts.
- P0-A04: roadmap and acceptance gates.
- P0-A05: Vercel/Shopify iframe architecture and upstream-license supplement.

Deliverable: documentation only. No production generator runtime.

## Phase 1 — application foundation and color engine

- [x] P1-A01: frontend baseline and engineering checks.
- [x] P1-A02: domain schemas and runtime validation.
- [x] P1-A02.1: internal reference-system and Poparooz customer-visible branding isolation.
- P1-A03: clearly labeled MARD test fixture and import validation.
- P1-A04: image decode, orientation, transparency, fit, and scaling pipeline.
- P1-A05: sRGB, XYZ D65, and Lab conversion.
- P1-A06: CIEDE2000 and deterministic tie-breaker.
- P1-A07: deterministic quantization and maximum colors.
- P1-A08: versioned Web Worker protocol and cancellation.
- P1-A09: pattern matrix and material counts.
- P1-A10: two-dimensional board calculation.
- P1-A11: algorithm tests, main/Worker parity, performance baseline, and phase acceptance.

Phase 1 does not build the complete workspace UI. Missing real palette/board data may be represented only by unmistakable test fixtures.

## Phase 2 — MVP workspace

- P2-A01: upload/start page.
- P2-A02: settings panel and validation.
- P2-A03: Canvas pattern rendering.
- P2-A04: zoom, pan, and reset controls.
- P2-A05: materials panel.
- P2-A06: summary and board layout.
- P2-A07: desktop responsive layout.
- P2-A08: canvas-first mobile layout.
- P2-A09: empty, loading, cancellation, and error states.
- P2-A10: accessibility, keyboard, touch, and reduced motion.
- P2-A11: component tests and phase acceptance.

## Phase 3 — export, deployment, and Shopify embed

- P3-A01: PNG export.
- P3-A02: CSV export.
- P3-A03: iframe message implementation.
- P3-A04: resize observer, throttled height messages, parent bounds, and cleanup.
- P3-A05: Vercel deployment configuration and independent version/rollback evidence.
- P3-A06: `generator.poparooz.com`, HTTPS, and production/preview separation.
- P3-A07: Shopify Custom Liquid parent page, SEO content, and collection navigation.
- P3-A08: CSP, exact origins, sandbox, capabilities, and iframe security.
- P3-A09: full-screen entry, loading failure, and download fallback.
- P3-A10: privacy-safe analytics events.
- P3-A11: Playwright end-to-end tests.
- P3-A12: iPhone Safari and Android Chrome device tests.
- P3-A13: final MVP-A acceptance.

MVP-A is complete only after P3-A13.

## Phase 4 — MVP-B basic editing

Brush, eraser, eyedropper, rectangle fill, replace color, undo/redo, local project files, simple crop, optional dithering, and editing performance. This work is not permitted in Phases 1–3.

## Phase 5 — Shopify one-click cart

Verified MARD-to-product/variant mapping, handles, variant IDs, pack sizes, reserve/waste policy, pack conversion, inventory and unavailable states, a versioned material-requirement message, explicit user gesture, parent-side validation/mapping, same-origin Shopify Cart API, partial-add behavior, bounded feedback, cart navigation, and conversion funnel. The iframe never operates the cart directly.

## Community Backlog — unscheduled

Accounts, cloud projects, publishing, gallery, search, favorites, comments, author pages, moderation, and copyright complaint workflow.

## Phase 1 entry dependencies

Track and resolve as early as possible:

- whether Poparooz purchases/sells MARD 221, MARD 291, or a subset;
- official supplier MARD color table and normal/special-finish classification;
- first sellable Poparooz color range;
- actual bead diameter and board rows/columns;
- Shopify collection URL, official store domain, and allowed parent origins;
- Vercel project/domain access and readiness of `generator.poparooz.com`;
- target mobile browsers and minimum supported versions.
- any proposed upstream repository URL/commit, actual license, notices, source-publication duties, commercial-use permission, same-license duties, and third-party dependency licenses before code reuse.

Phase 1 algorithm foundation may proceed without real palette or board data only with labeled test fixtures. Supplier values, sellable colors, commerce mappings, physical board defaults, and physical-color claims block production release, not isolated fixture-based engineering.

## Recommended next task

After P1-A02.1 acceptance, perform P1-A03 only: create the clearly labeled internal-reference import test fixture and import validation without introducing a production palette, production Poparooz display-code list, color algorithms, image processing, Worker, Canvas, or full UI. All future customer-visible consumers must use the Public Presentation Model. Before choosing production defaults, request the supplier, inventory, board, Shopify, browser, Vercel, and domain facts listed above.
