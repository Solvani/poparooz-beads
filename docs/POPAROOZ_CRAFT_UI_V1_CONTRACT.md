# Poparooz Craft UI v1 Contract

## Authority and direction

The Phase 2 UI direction is **Poparooz Guided Canvas Commerce**. Its design system is **Poparooz Craft UI v1**. This contract governs customer-facing generator UI from P2-I02 onward. Later components may extend it only through an accepted task; they may not bypass or silently redefine it.

## Design tokens

The executable authority is [`../src/styles/tokens.css`](../src/styles/tokens.css). It defines brand colors `brand-50` through `brand-900`; page and component surfaces; text and border roles; functional foreground/background pairs; spacing, radius, shadow, and motion scales; 44px desktop controls; 48px mobile controls; and a 44px minimum touch target.

Interface colors are independent of bead display colors. A Pattern color may never redefine a UI token, and a UI token is never evidence of a production bead color.

## Typography

The font stack is Inter, system UI sans-serif, Apple and Windows system fonts, Roboto, Helvetica, Arial, then generic sans-serif. No external font CDN or custom font file is used. Body text is 16px with 1.5 line height. Mobile inputs remain at least 16px. Numeric summaries use tabular numerals where comparison benefits.

## Spacing, shape, shadow, and motion

Spacing uses 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px. Shape uses 8, 12, 16, and 20px plus pill radii. Small, medium, and large shadows communicate elevation without replacing borders or focus. Motion uses the frozen durations/easing and honors `prefers-reduced-motion`.

## Responsive contract

The `.app-root` establishes an inline-size container. Media queries provide a fallback where Container Queries are unsupported.

- **Compact, 0–767px:** single column, 16px gutters, 48px controls, Canvas before Results, and no design dependency on horizontal scrolling.
- **Medium, 768–1099px:** vertically organized Create, full-width Canvas, and Results regions with 20–24px gutters; no persistent three-column grid.
- **Desktop, 1100–1439px:** `280px minmax(0, 1fr) 300px`, 16px gap, and 24px gutters.
- **Wide, 1440px and above:** `320px minmax(560px, 1fr) 340px`, 20px gap, centered at a 1600px maximum width.

The Canvas region has `min-width: 0`. Bottom Sheet behavior is excluded from P2-I02; only a future insertion point is reserved.

## Semantic workspace

The page contains a banner Header and one named workspace main landmark. The workspace contains a named Create/Settings section, a named Pattern Canvas section, and a named Pattern Summary complementary region. Panels use visible headings connected by `aria-labelledby`. Future actions use native disabled buttons.

## Customer-visible brand boundary

Customer UI may show Poparooz, an approved Poparooz logo, and ordinary English functional/help copy. No approved logo asset exists in P2-I02, so the Header uses a text wordmark. Customer UI must not show supplier or third-party brands, internal reference fields, Shopify handles/variant IDs, fixture names, or synthetic palette content.

## Public Pattern boundary

Later result components may consume only the strict Public Pattern model. They must not import internal Palette records or reconstruct presentation values from internal references. Public Pattern colors remain data and do not alter Craft UI tokens.

## P2-I02 exclusions

P2-I02 contains no File API, upload/preview behavior, normalization, Worker call, Pattern Assembly, Public Pattern mapping, Canvas drawing, zoom/grid/fit behavior, generation state, Abort, Bottom Sheet interaction, download, Shopify, Router, state library, component library, icon library, production palette, BoardProfile, or mock Pattern values.

## P2-I03 local image input contract

The Settings Region accepts exactly one JPEG, PNG, or WebP through a native file input or drag and drop. The input advertises approved MIME types and extensions, while application validation requires an approved MIME/extension pairing, the existing non-empty rule, and the Phase 1 20 MiB file-size limit. This is lightweight selection validation; authoritative content-signature validation and decoding remain in the accepted Phase 1 image pipeline for the later generation stage.

Cancellation is not an error. Multiple files are rejected without selecting one. Invalid replacement leaves the current valid image intact. Customer errors contain no local path, raw browser exception, image bytes, or internal diagnostic details.

## Original preview and Object URL lifecycle

The original preview uses a browser-local Object URL and `object-fit: contain`; it does not normalize or read pixels. A new valid preview is created before the old URL is revoked. Replace, Remove, and unmount revoke the active URL exactly once. Invalid files do not create a URL. Native input values are cleared after each attempt so the same file may be selected again.

The selected File and Object URL remain ephemeral React/Hook resources. They are not uploaded, encoded into a URL, logged, serialized, or written to LocalStorage, SessionStorage, IndexedDB, Cache Storage, a database, or analytics.

## Pattern Settings control contract

Pattern Settings is controlled through immutable draft values and does not trigger generation. Because no production defaults are approved, width, height, Maximum Colors, and Background begin empty. The formal boundaries are:

- width and height: integer 1–4096, with the Phase 1 total target limit of 16,777,216 pixels;
- Maximum Colors: integer 1–512;
- Background: White or Transparent only.

No preset size, Palette-derived value, BoardProfile, Keep Original option, or fixture default is shown. Settings remain when the image is removed. Generate Pattern is present only as a native disabled layout placeholder; Worker, generation state, Pattern Assembly, Canvas, and results remain outside P2-I03.
