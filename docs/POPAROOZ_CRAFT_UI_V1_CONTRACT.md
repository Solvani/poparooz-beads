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
