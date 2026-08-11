# Poparooz Product Decisions

Status: **Frozen for Phase 0**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Positioning and business loop

Poparooz Generator serves US-market visitors to the Poparooz Shopify store. It turns a locally selected image into a practical fuse bead plan, identifies Poparooz display colors and bead counts, estimates board layout, provides downloads, and links the user to Poparooz materials.

Poparooz owns the shopping, website, and customer-visible color presentation. MARD may remain in internal source mapping and audits only; it is never displayed as a customer brand or color-code prefix. Pindoo is a competitor reference only.

## Customer-visible branding

- Poparooz is the only brand in UI, mobile layouts, accessibility text, errors, empty/loading states, materials, Canvas labels, PNG, customer CSV, filenames, downloads, Shopify content/messages, SEO, metadata, public responses, and customer-copyable diagnostics.
- Customer colors use approved Poparooz `displayCode` and ordinary English `displayName` fields. They never read internal `referenceSystem`, `referenceCode`, `referenceName`, `referenceSeries`, provenance, or Shopify mapping fields.
- Every customer-visible color object is produced by the strict Public Presentation Model and whitelist mapper; UI code must not render or serialize an internal palette record.
- Internal audit, supplier mapping, source/version evidence, and license records retain truthful third-party names where required.

## MVP-A included scope

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

### Export and conversion

- PNG pattern and CSV material list with sanitized file names, palette/generator versions, pattern metadata, color counts, and board information.
- `Get Beads for This Pattern` navigates only to a centrally configured Poparooz Shopify collection and records only non-image conversion telemetry. React components must not hard-code test, temporary, or local URLs.
- Users do not log in and MVP-A does not add variants to the cart automatically.

### Mobile and accessibility

- Mobile is a distinct canvas-first responsive layout, not a scaled-down three-column desktop.
- Mobile order: Canvas, Summary, collapsible Settings, collapsible Materials, Download, Get Beads, and Open Full Screen.
- Keyboard-operable upload, accessible names, visible focus, associated errors, non-color labels, reasonable touch targets, non-hover alternatives, explicit zoom controls, and `prefers-reduced-motion` support are required.

### Shopify parent page

The iframe is not the page's only content. The later Shopify Custom Liquid parent must include:

- H1 `Free Fuse Bead Pattern Maker`;
- concise product and browser-local privacy explanations;
- generator iframe and a full-screen/failure fallback link;
- How It Works;
- How to Choose Pattern Size;
- How to Choose Number of Colors;
- Materials You May Need;
- FAQ;
- Shop Poparooz Beads.

## MVP-A exclusions

MVP-A excludes registration, login, accounts, databases, cloud saves or sync, community publishing, search, comments, likes, favorites, creator pages, AI subject detection, background removal, style transfer, Cart API, automatic variant addition, inventory lookup, pack conversion, complex layers, collaboration, brush, eraser, eyedropper, undo/redo, and other advanced editing.

## MVP-B

MVP-B may add brush, eraser, eyedropper, rectangle fill, color replacement, undo/redo, local project import/export, simple crop, manual transparency, optional dithering, and basic pattern correction. MVP-B work may not be pulled into Phases 1–3.

## Deferred commerce and community

Shopify one-click cart integration is Phase 5 and requires verified handles, variant IDs, pack sizes, waste policy, inventory behavior, partial-add behavior, parent-page Cart API, and conversion measurement. The external iframe never controls the cart directly: it sends a versioned material-requirement message after an explicit user click; the same-origin Shopify parent validates it, performs product/inventory mapping and Cart API operations, and returns a bounded result.

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
- Shopify remains responsible for the theme, SEO content, navigation, FAQ, privacy copy, collection entry, cart, iframe container, height updates, and full-screen fallback.
- The generator remains responsible for local upload/processing, pattern generation, Canvas, internal reference-based color/material calculations, Public Presentation mapping, downloads, and allowlisted messages.
- MVP-A does not create a Shopify App, Embedded/Admin App, App Proxy, Shopify CLI project, deep theme integration, or Cart API bridge.
- Configuration is centralized. Candidate names are `VITE_SHOP_URL`, `VITE_BEADS_COLLECTION_URL`, `VITE_ALLOWED_PARENT_ORIGINS`, and `VITE_GENERATOR_PUBLIC_URL`; final names may follow the Phase 1 project convention without weakening the contract.
- Cloudflare Pages preview addresses are for validation only. Production Shopify references the custom generator domain, and preview origins are excluded from the production allowlist by default.
- Mobile always exposes `Open Pattern Maker Full Screen` to avoid nested-scroll, upload, download, virtual-keyboard, fixed-header, and Canvas gesture failures.
