# Poparooz Product Decisions

Status: **Historical MVP-A decisions preserved; synchronized through P3-A03-E05-A01 Recommendation Closure / Customer UI Suppression**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Positioning and business loop

Poparooz Generator serves US-market visitors to the Poparooz Shopify store. It turns a locally selected image into a practical fuse bead plan, identifies Poparooz display colors and bead counts, estimates board layout, provides downloads, and links the user to Poparooz materials.

Poparooz owns the shopping, website, and customer-visible color presentation. MARD may remain in internal source mapping and audits only; it is never displayed as a customer brand or color-code prefix. Pindoo is a competitor reference only.

## Customer-visible branding

- Poparooz is the only brand in UI, mobile layouts, accessibility text, errors, empty/loading states, materials, Canvas labels, PNG, customer CSV, filenames, downloads, Shopify content/messages, SEO, metadata, public responses, and customer-copyable diagnostics.
- Customer colors use approved Poparooz `displayCode` and ordinary English `displayName` fields. They never read internal `referenceSystem`, `referenceCode`, `referenceName`, `referenceSeries`, provenance, or Shopify mapping fields.
- Every customer-visible color object is produced by the strict Public Presentation Model and whitelist mapper; UI code must not render or serialize an internal palette record.
- Internal audit, supplier mapping, source/version evidence, and license records retain truthful third-party names where required.

## Current Results and Materials decisions

P3-A03-E05-A01 supersedes only the active customer-presentation portion of the
earlier A02 decision. Current customer Results display:

```text
Pattern Summary
-> Required Bead Set
-> Bead Requirements
```

Additional Refill Packs remain within Bead Requirements. Recommended Bead Set
is temporarily hidden and inactive in customer presentation. Auto and
Recommended for Your Image are not active customer controls or labels. Manual
Generation Color Set selection remains active with exactly
`24 / 48 / 72 / 120 / 168 / 221`.

This visibility decision does not delete or reinterpret Recommendation Policy
v1 or the Recommended Bead Set semantic contract. Required and Recommended
remain independent concepts even though only Required is currently displayed.

P3-A03-SCOPE-A02 previously froze **Option B** as its customer-facing Results
target:

```text
Required Bead Set
72-Color Set
Smallest official set containing every color used.

Recommended Bead Set
Same as the required set for this pattern
```

The `72-Color Set` value above is illustrative, not a fixed product rule. The
Required value comes from the final Pattern.

The terms remain distinct:

- **Generation Color Set** is the formal color set used to generate the current
  Pattern.
- **Required Bead Set** is the smallest formal Poparooz set containing every
  color used in the final Pattern.
- **Recommended Bead Set** is the separate post-generation material-policy
  result. Recommendation Policy v1 returns Required; it is not a smart image
  recommendation, automatic generation recommendation, second quality
  algorithm, or optimal generation palette.

A Pattern may therefore have `Generation Color Set: 120` and
`Required Bead Set: 72` without contradiction. The ambiguous customer-facing or
export term **Bead Color Set** is deprecated for active customer-facing use.

P3-A03-SCOPE-A04 implements and freezes **Generation Color Set** in the Settings
selector/help, Results Pattern Summary, and local PNG metadata. The profile value
labels remain `<size>-Color Set`; the formal sizes remain exactly
`24 / 48 / 72 / 120 / 168 / 221`. `96`, `144`, and `192` remain unsupported.
This was a minimal terminology implementation; no Material Contract defect was
found. Source-level Export geometry remained unchanged, but pixel-level PNG
visual or clipping acceptance was not completed.

The A03/A04 material and Export boundary is:

```text
PublicPatternResult.materials
-> DerivedMaterialRequirementV1
-> patternColorIndex mapping
-> pattern.colors display order
-> local PNG Bead Requirements legend
```

Bead Requirements take `beadCount` from the Pattern material authority. Results
and Export do not recount the Pattern Matrix or use
`pattern.colors[].beadCount` as quantity authority. Required Bead Set,
Recommended Bead Set, Bead Requirements, and Additional Refill Packs remain
separate concepts. A04 does not define Commerce purchase semantics or activate
automatic Generation Color Set Recommendation.

The approved future Results information-architecture target is:

```text
Summary → Materials → Actions → Color Details
```

This is an approved implementation target, not proven final or optimal UX.
Post-implementation verification remains required for desktop/mobile hierarchy,
Results height, keyboard order, screen-reader behavior, accessibility,
terminology comprehension, and actual visual presentation. No Product Design
Audit was run in A02 because no current-stage screenshots existed and the stage
concerned semantic and data contracts.

## Historical MVP-A included scope

This section records the intended MVP-A baseline. Later accepted implementation
and freeze records determine current production behavior where they differ.

### Start page

- Poparooz logo, English headline `Turn Any Image Into a Fuse Bead Pattern`, concise explanation, and recommendation guidance.
- Keyboard-operable image selection with JPEG, PNG, and WebP guidance.
- A clear local-processing privacy statement and `Create Pattern` action.
- Unsupported-format, oversized-file, decode, and upload/selection failure states.

### Pattern settings

- Pattern width and height, aspect-ratio lock, maximum colors, transparent-background option, regenerate action, sensible initial values, and boundary validation.
- Exact production defaults and limits are established through measured Phase 1/2 implementation decisions, not guessed from competitor products.

### Result workspace

- Canvas pattern with grid, zoom, pan, zoom buttons, reset, desktop pointer input, mobile touch input, loading state, Worker failure state, and memory/processing failure state.
- Pattern name and high-priority download and shop actions.

### Materials and summary

- Swatch, Poparooz display code, ordinary English display name, bead count per color, total beads, colors used, pattern dimensions, horizontal boards, vertical boards, and estimated total boards.
- Material counts reflect exact generated cells. Commerce-only values stay blank until verified.

### Historical export and conversion plan

- The MVP-A plan included PNG and CSV outputs. Current accepted production
  provides local PNG download; CSV expansion remains deferred unless separately
  authorized.
- `Get Beads for This Pattern` navigates only to a centrally configured Poparooz Shopify collection and records only non-image conversion telemetry. React components must not hard-code test, temporary, or local URLs.
- Users do not log in and MVP-A does not add variants to the cart automatically.

### Mobile and accessibility

- Mobile is a distinct canvas-first responsive layout, not a scaled-down three-column desktop.
- Mobile order: Canvas, Summary, collapsible Settings, collapsible Materials, Download, Get Beads, and Open Full Screen.
- Keyboard-operable upload, accessible names, visible focus, associated errors, non-color labels, reasonable touch targets, non-hover alternatives, explicit zoom controls, and `prefers-reduced-motion` support are required.

### Shopify parent page

The production iframe is hosted by a dedicated `pattern-maker` page template and `poparooz-generator` theme section. The frozen Shopify parent content boundary includes:

- H1 `Free Fuse Bead Pattern Maker`;
- concise product and browser-local privacy explanations;
- generator iframe and a full-screen/failure fallback link;
- How It Works;
- How to Choose Pattern Size;
- How to Choose Number of Colors;
- Materials You May Need;
- FAQ;
- Shop Poparooz Beads.

## Historical MVP-A exclusions

These exclusions describe the MVP-A stage boundary. Later explicitly accepted
features, including conservative background removal, supersede the corresponding
historical exclusion without reopening other excluded capabilities.

MVP-A excludes registration, login, accounts, databases, cloud saves or sync, community publishing, search, comments, likes, favorites, creator pages, AI subject detection, background removal, style transfer, Cart API, automatic variant addition, inventory lookup, pack conversion, complex layers, collaboration, brush, eraser, eyedropper, undo/redo, and other advanced editing.

## MVP-B

MVP-B may add brush, eraser, eyedropper, rectangle fill, color replacement, undo/redo, local project import/export, simple crop, manual transparency, optional dithering, and basic pattern correction. MVP-B work may not be pulled into Phases 1–3.

## Deferred commerce candidate and community

Shopify one-click cart integration is a future candidate and requires a
separately reviewed and frozen Commerce contract. No material message or Cart
API bridge exists in current production. The external iframe must never control
the cart directly. A future contract may, after explicit customer action,
authorize a versioned bounded material-requirement message that the same-origin
Shopify parent validates before product/inventory mapping and Cart API work.
This document does not freeze the payload schema, `commerceQuantity`, purchase
strategy, catalog mapping, inventory behavior, or partial-add policy.

Accounts, cloud projects, publishing, galleries, search, favorites, comments, author pages, moderation, and copyright complaint handling remain an unscheduled Community Backlog.

## Mobile and iframe decisions

- Canvas usability has priority over settings density on mobile.
- Settings and Materials collapse independently; controls cannot depend on hover.
- A full-screen entry is always available for constrained embeds.
- The child reports a debounced content height; the parent verifies the child window and origin before applying it.
- The configured standalone origin and Shopify origins are dependencies. Preview origins are denied by default unless explicitly allowlisted for a non-production environment.

## Deployment and Shopify integration

- The generator is independently deployed to Cloudflare Pages and embedded on `https://poparooz.com/pages/fuse-bead-pattern-maker`.
- The production generator URL is `https://generator.poparooz.com` and must also provide the full core experience when opened directly.
- Cloudflare Pages, the custom domain, HTTPS, direct generation, and desktop/mobile Shopify embedding are active and production verified.
- The live Shopify theme template, section, `PATTERN MAKER` navigation entry, and image-gallery schema correction were completed manually in Shopify Admin and remain external platform state rather than repository implementation.
- Shopify remains responsible for the theme, SEO content, navigation, FAQ, privacy copy, collection entry, cart, iframe container, height updates, and full-screen fallback.
- The generator remains responsible for local upload/processing, pattern generation, Canvas, internal reference-based color/material calculations, Public Presentation mapping, downloads, and allowlisted messages.
- Current production does not include a Shopify App, Embedded/Admin App, App
  Proxy, Shopify CLI project, or Cart API bridge.
- Configuration is centralized. Candidate names are `VITE_SHOP_URL`, `VITE_BEADS_COLLECTION_URL`, `VITE_ALLOWED_PARENT_ORIGINS`, and `VITE_GENERATOR_PUBLIC_URL`; final names may follow the Phase 1 project convention without weakening the contract.
- Cloudflare Pages preview addresses are for validation only. Production Shopify references the custom generator domain, and preview origins are excluded from the production allowlist by default.
- Mobile always exposes `Open Pattern Maker Full Screen` to avoid nested-scroll, upload, download, virtual-keyboard, fixed-header, and Canvas gesture failures.
