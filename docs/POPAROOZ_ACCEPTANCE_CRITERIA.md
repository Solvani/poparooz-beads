# Poparooz Acceptance Criteria

Status: **Frozen Phase 0 gates**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Universal gate

Every task must stay within one roadmap item, preserve accepted decisions, contain no unrelated changes or sensitive/local data, run every check configured at that point, document unavailable checks honestly, and receive a separate acceptance decision before the next phase. Poparooz is the only customer-visible brand: public models and customer content must not expose internal reference-system names, fields, codes, logos, provenance, or commerce mappings, while internal audit and license evidence must retain truthful sources.

## Phase 0 acceptance

- [x] Target local repository root and configured Remote identified.
- [x] Branch, absence of HEAD, initial worktree state, and inability to calculate ahead/behind recorded.
- [x] Structure, capabilities, runtime configuration, build/test state, and repository hygiene audited without modifying files first.
- [x] Existing implementation accurately recorded as absent; no technology or successful check fabricated.
- [x] A single Source of Truth and referenced product, contract, roadmap, acceptance, and audit documents established.
- [x] README points to the Source of Truth. No `AGENTS.md` was created because none existed.
- [x] Product positioning, MVP-A, MVP-B, deferred cart, community, mobile, and iframe strategy are non-conflicting.
- [x] Internal MARD reference identity, sellable filter, provenance, special finishes, fixtures, and truth-label rules are frozen without creating a fake palette or making MARD a customer-visible brand.
- [x] Board schema and two-dimensional board formula are frozen without inventing a production board.
- [x] Pattern and material structures and version strategy are defined.
- [x] Image input, orientation, containment, transparency, quantization, color conversion, CIEDE2000, tie-break, determinism, and no-dither baseline are defined.
- [x] PNG, CSV, metadata, privacy, analytics denylist, and iframe protocol/security contracts are defined.
- [x] Phases 1–5, Community Backlog, Phase 1 dependencies, and next task are defined.
- [x] Independent Vercel deployment, Shopify parent/generator responsibility split, production domains, centralized URL/origin configuration, resize, and full-screen architecture are frozen.
- [x] Upstream/Fork/license evidence is audited as absent; unknown licensing is a hard gate against importing external production code.
- [x] No image generator, production color engine/palette, Canvas workspace, Worker runtime, PNG/CSV runtime, account, database, Cart API, deployment, or community implementation was added.

Phase 0 is **Accepted with follow-up** because externally verified Remote state, production palette/inventory, physical board, Shopify, Vercel/domain, and target-browser facts remain unresolved. These are recorded dependencies and do not invalidate the documentation baseline.

## Phase 1 gate

Phase 1 requires a configured React/TypeScript/Vite baseline, reproducible dependency installation, build/type/lint/unit checks, runtime-validated domain schemas, labeled fixtures, palette import validation, deterministic image/color pipeline, CIEDE2000 reference tests, stable tie tests, Worker cancellation and parity tests, exact counts/layout tests, performance/memory evidence on representative devices, and no full workspace UI. Palette acceptance also requires strict separation of internal reference fields from Poparooz display fields, independent normalized uniqueness for both code systems, a strict Public Palette Schema, an explicit whitelist mapper, and serialization tests proving no internal reference name or field reaches the public model.

P1-A03 palette-import acceptance requires a frozen exact header with explicit order/case policy, separate strict metadata, standards-compliant BOM/LF/CRLF/quoted-field parsing, unambiguous primitive conversion, final reuse of both Domain schemas, actual row/column errors, distinguishable duplicate-code errors, multi-error aggregation, synthetic non-production fixtures outside the frontend bundle, a read-only offline CLI with tested exit codes, and explicit rejection of visual charts as production data sources.

P1-A04 image-normalization acceptance requires content signatures plus MIME conflict handling, pre/post-decode limits, bounded EXIF Orientation 1–8 parsing and transforms, an explicit no-double-rotation browser strategy, exact deterministic contain geometry, default upscale rejection, alpha-aware deterministic resize with pixel golden tests, transparent/white output rules, stable safe errors, AbortSignal coverage, complete ImageBitmap/Object URL/temporary Canvas cleanup, synthetic fixtures only, no persistence/network behavior, and an explicit real-browser validation follow-up.

P1-A05 color-space-conversion acceptance requires strict RGB8 and intermediate runtime validation, explicit 0-through-255 and 0-through-1 units, the standard sRGB inverse transfer branches, the frozen sRGB-to-XYZ D65 matrix, D65 2-degree CIELAB constants and branches, JavaScript double precision without intermediate rounding, exact negative-zero canonicalization only, stable safe errors, golden and property tests, composition through shared primitives, and no Delta E, matching, palette, image-batch, Worker, Canvas, or UI work.

Production data is not required to test the algorithm core, but fixture boundaries must be visible in file names, code, and UI paths. No fixture may ship as a production palette or board default.

## Phase 2 gate

Phase 2 requires the accepted Phase 1 core; accessible upload/settings/result/material/summary flows; desktop and true canvas-first mobile layouts; pointer, keyboard, and touch operation; loading/cancel/error/memory states; component tests; and no export, deployment, or Cart API work pulled forward. UI, Canvas labels, materials, accessibility text, errors, empty/loading states, and customer-copyable diagnostics must consume only Public Presentation models and contain no third-party brand name, logo, icon, or internal reference field.

## Phase 3 / MVP-A gate

Phase 3 requires deterministic and metadata-complete PNG/CSV output; tested download failures/limits; exact iframe origin/window/message validation; secure CSP/sandbox; Shopify content/fallback/full-screen flow; configured Vercel and custom domain; privacy-safe analytics; E2E and target mobile-browser evidence; verified production palette/sellable range and physical board; and final MVP-A acceptance. PNG, customer CSV, file names, legends, downloads, Shopify pages/messages, SEO, titles/descriptions, page metadata, public analytics labels, and public responses must use Poparooz display fields and contain no third-party brand/name/logo, internal reference field/code, source version, supplier/audit field, product handle, or variant ID.

### Desktop iframe acceptance

- Shopify page, header, navigation, SEO content, and generator load normally without a horizontal scrollbar or avoidable double scrolling.
- Upload, generation, Canvas, PNG, CSV, configured collection navigation, dynamic height, and full-screen entry work.
- Initial load, generation, error, Settings, Materials, and viewport changes update height without clipping.

### Mobile iframe acceptance

- iPhone Safari and Android Chrome complete upload and generation on supported versions.
- Canvas zoom/pan, Settings, Materials, downloads or documented fallback, collection navigation, and full-screen entry work with usable target sizes.
- The UI is genuinely responsive, not a scaled desktop layout, and Shopify fixed chrome does not cover critical actions.

### Security and deployment acceptance

- Shopify production references `https://generator.poparooz.com`; custom-domain HTTPS succeeds and `vercel.app` is not the lasting user entry.
- Production never uses `targetOrigin="*"`; parent and child reject unknown origins, windows, versions, types, and invalid payloads.
- Resize height is a bounded finite integer; arbitrary URLs/code and image/file-name data cannot cross the protocol.
- CSP, `frame-ancestors`, sandbox, download/new-window/full-screen capabilities, preview/development origin separation, load failure, canonical, and indexing decisions have test evidence.
- MVP-A contains no Shopify Cart API or direct iframe cart operation.

## Phase 4 and Phase 5 gates

Phase 4 begins only after MVP-A acceptance and keeps edits deterministic, reversible, performant, and locally private. Phase 5 begins only with verified Shopify mappings, pack and reserve policy, inventory behavior, parent-page Cart API design, partial failure behavior, and explicit commerce/privacy acceptance.
