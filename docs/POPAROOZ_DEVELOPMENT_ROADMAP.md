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
- [x] P1-A03: canonical offline palette files, clearly labeled synthetic fixtures, and import validation.
- [x] P1-A04: browser-local image signatures, decode boundary, orientation, transparency, contain, and deterministic RGBA scaling.
- [x] P1-A05: sRGB, XYZ D65, and Lab conversion.
- [x] P1-A06: CIEDE2000 and deterministic tie-breaker.
- [x] P1-A07: deterministic quantization and maximum colors.
- [x] P1-A08: versioned Web Worker protocol, Transferable ownership, cancellation, supersede, and stale-result rejection.
- [x] P1-A09: eligible-palette mapping, merged pattern matrix, exact material/package counts, and complete-matrix board layout.
- [x] P1-A10: end-to-end performance benchmark, browser evidence preparation, and Phase 1 final audit/freeze.

Phase 1 does not build the complete workspace UI. Missing real palette/board data may be represented only by unmistakable test fixtures.

## Phase 2 — MVP workspace

UI direction: **Poparooz Guided Canvas Commerce**. Design system: **Poparooz Craft UI v1**.

- [x] P2-D01: desktop and mobile UI direction selection.
- [x] P2-D02: design-system and responsive-layout freeze.
- [x] P2-I01: repository baseline and UI implementation plan.
- [x] P2-I02: Design Tokens, semantic App Shell, and responsive layout skeleton.
- [x] P2-I03: local upload, original-image preview, Object URL lifecycle, and settings panel.
- [x] P2-I04: generation, Abort, error, dirty, and regeneration state flow.
- [x] P2-I05: Pattern Canvas, zoom, grid, and fit.
- [x] P2-I06: public color, bead-count, summary, and board-layout results.
- [x] P2-I07: disabled action contract, result identity, and customer journey completion.
- [x] P2-I08: mobile Bottom Sheet and tablet workspace layout.
- [ ] P2-I09: accessibility, compatibility, performance, and full regression.
- [ ] P2-I10: Phase 2 final audit and freeze.

The older capability list below remains a product-scope crosswalk. The P2-I task sequence above controls implementation order.

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

Current recommendation after accepted P2-I08: perform P2-I09 only—execute final accessibility, keyboard/screen-reader, browser compatibility, real iPhone Safari and Android Chrome layout/gesture, tablet/desktop visual, memory/performance, and complete regression acceptance against the frozen P2-I02–P2-I08 implementation. P2-I09 should fix evidence-backed defects only; it must not add pinch zoom, editing, sticky actions, real download, commerce/navigation, production Palette/BoardProfile/package data, or redesign the accepted workflow.

P2-I08 completed container-width Workspace Modes, Compact result-first information architecture, compact public summary, four panel launchers, a dependency-free modal Bottom Sheet with focus/background/scroll/close cleanup, unique responsive mounting of existing business components, and the Medium tablet layout. Automated DOM, lifecycle, cleanup, responsive, and boundary coverage is complete for this task; final real-browser/device acceptance remains P2-I09. Download and Get Beads remain disabled, and production generation remains unavailable.

Historical recommendation after accepted P2-I07: perform P2-I08 only—implement the accepted mobile Bottom Sheet and tablet workspace layout around the existing flow. Preserve P2-I07 native-disabled action semantics and result identity; do not enable download or commerce, add a sticky mobile action bar, introduce pinch zoom or editing, assume production Palette/BoardProfile/package data, or pull P2-I09 validation work forward.

P2-I07 completed the stable Pattern Options region, native-disabled Download Pattern and Get Beads placeholders, production capability defaults, lifecycle/result-identity mapping, responsive action layout, and the continuous local customer flow. It added no export, navigation, commerce adapter, package calculation, production data, or Bottom Sheet. The production generation runtime remains unavailable.

Historical recommendation after accepted P2-I06: define and perform P2-I07 only—the disabled action contract and remaining customer-journey completion for the existing Download Pattern and Get Beads placeholders. Before enabling either action, freeze its exact output/navigation contract and supply every required verified production input. Do not introduce Shopify cart behavior, unverified package conversion, price/inventory claims, Bottom Sheet, editing, production Palette/BoardProfile assumptions, or P2-I08 work.

P2-I06 completed customer-safe Pattern Summary, stable public color/bead quantities, bounded color expansion, exact small Board layouts, compressed large Board previews, responsive Results presentation, retained-result lifecycle messaging, and isolated result-view errors. Production generation remains unavailable; pack size and physical BoardProfile remain unverified.

Current recommendation after accepted P2-I05: perform P2-I06 only—render customer-safe public color and bead-count results, material summary, and board-layout results from `PublicPatternResult`. Do not add downloads, Shopify/Get Beads behavior, Bottom Sheet, Original/Pattern comparison, editing, production data, or later tasks.

P2-I05 completed the Public Pattern-only Canvas, raster/cache path, Fit/Zoom/Grid controls, bounded pointer/wheel pan, resize response, DPR clamp, accessible semantics, and last-success lifecycle integration. Automated structural/performance coverage is complete for this task; real browser visual/performance validation remains pending P2-I09. The production runtime remains unavailable.

Current recommendation after accepted P2-I04: perform P2-I05 only—render the accepted Public Pattern matrix in a Pattern Canvas and add zoom, grid, and fit controls. It must not pull color/material summaries, board-layout results, downloads, Shopify, production data, or later mobile Bottom Sheet work forward. Earlier recommendations below remain historical entry records.

Current recommendation after accepted P2-I03: perform P2-I04 only—generation orchestration, lifecycle states, Abort, supersede, errors, dirty, and regeneration. It must preserve the existing local image/settings contracts and must not pull Canvas drawing, result panels, downloads, Shopify, or production data forward.

Current recommendation after accepted P2-I02: perform P2-I03 only—upload, original preview, and settings. Do not pull generation, Worker orchestration, Canvas, results, export, Shopify, or production data forward. The historical recommendation below records the earlier Phase 2 entry gate.

P1-A10 is complete and Phase 1 is frozen. Real browser/mobile validation remains documented follow-up, not a passed claim. Before Phase 2 implementation, present 3–5 distinct desktop/mobile UI approaches with trade-offs and obtain explicit user selection. Formal palette and physical-board production acceptance remain blocked until verified data is supplied.
