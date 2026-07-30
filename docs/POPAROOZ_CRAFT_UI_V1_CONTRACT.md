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

## P2-I05 Pattern Canvas contract

The Pattern Canvas consumes only `PublicPatternResult`. It reads the public matrix dimensions, `Uint16Array` color indexes, the public transparent index, and public color `index`/`hex` values. It neither imports internal Palette or Board types nor copies, mutates, repairs, or rematches the public result. Invalid dimensions, matrix lengths, indexes, colors, or Canvas contexts fail locally with safe customer copy and do not rewrite Generator success state.

Viewport math uses CSS pixels: `scale` is CSS pixels per Pattern cell, while `offsetX` and `offsetY` locate the Pattern origin within the visible Canvas. Fit is a centered contain operation with 24 CSS pixels of padding on each side. Fit scale is 100%; subsequent zoom percentages are `current scale / fit scale`, rounded for display. Zoom changes by a stable factor of 1.25 around the viewport center. Maximum scale is 64 CSS pixels per cell. Minimum scale is the smaller of the fit scale and 0.25 CSS pixels per cell, so every valid Pattern remains fully fittable. Invalid or unmeasured dimensions never create non-finite viewport values.

Pan is enabled by primary Pointer drag and wheel movement. If a scaled Pattern exceeds an axis, offsets are clamped between the two visible edges; if it is smaller, it remains centered on that axis. Zoom and resize reapply the same clamp. Fit-mode resize recomputes Fit; manual-mode resize preserves the viewed center as far as the new bounds permit. Pointer capture, pending frames, ResizeObserver, and the window-resize fallback are effect/ref resources and are released on cancellation or unmount.

Grid is view-only state. It is drawn only when selected and scale is at least 6 CSS pixels per cell; below that threshold the selected `aria-pressed` state remains true and the toolbar says “Zoom in to see the grid.” Grid lines use the UI border token and never a Palette color. Transparent cells use the neutral `#F3F4F1` / `#E3E7E4` checker instead of white, so they cannot be mistaken for white beads.

One one-pixel-per-cell offscreen raster is built and cached for each public result identity. Zoom, pan, grid, and resize reuse it; replacement by a new successful result invalidates it. A 4096 by 4096 raster has a 64 MiB steady RGBA backing store. Raster construction also creates a 64 MiB `ImageData`, so the renderer-owned theoretical peak is approximately 128 MiB, excluding the already-owned public matrix and the bounded visible Canvas. High zoom uses nearest-neighbor scaling and crops the raster source to the visible Pattern rectangle before drawing. It does not allocate an unbounded zoom-sized backing store or a React node per cell.

Canvas CSS dimensions remain independent of its backing store. Effective DPR is a finite positive device ratio clamped to 2, with 1 as fallback. Resize notifications and redraw requests are coalesced through `requestAnimationFrame`; there is no continuous animation loop. The Canvas is `role="img"` with a name containing matrix width and height, is not an extra tab stop, and exposes no per-cell accessibility nodes. Toolbar controls are native buttons, boundary states use native `disabled`, Grid exposes `aria-pressed`, and the zoom percentage is readable output.

A new successful result mounts in Fit mode at 100%. Dirty, regenerating, regeneration-aborted, and regeneration-error states retain both the last successful Canvas and its viewport. A first generation has no Canvas until success; first abort/error does not fabricate one. Remove clears the active Canvas. The production runtime remains unavailable until the approved Palette, BoardProfile, and processing policy exist; P2-I05 adds no test Pattern to production.

P2-I05 is limited to the Canvas, raster renderer, viewport, Zoom In/Out, Fit, Grid, desktop pointer/wheel pan, resize behavior, accessibility semantics, and Generator lifecycle integration. It does not add color or bead-count lists, material summaries, board layout, download, Shopify, Get Beads, Bottom Sheet, Original/Pattern comparison, editing, or mobile pinch zoom.

## P2-I04 generation orchestration boundary

Generation is a service boundary outside React. It receives an immutable File/settings/job snapshot, calls the accepted Phase 1 chain in this order—image decode and normalization, cancellable Worker quantization, Pattern Assembly, then Public Pattern mapping—and returns only `PublicPatternResult`. The service receives the approved Palette, BoardProfile, processing policy, and Worker Client factory through runtime dependency injection. Each request owns one Worker Client and disposes it after success, cancellation, or failure. The service performs no rendering, persistence, network request, or customer messaging.

Production does not yet have the complete approved Palette, BoardProfile, and processing-policy runtime dependency set. The default App runtime is therefore unavailable and cannot call the generation service. Its disabled control uses only the safe explanation “Pattern generation is not available in this preview.” Test-only runtime resources and services may be injected by tests but may not enter the production App entry or bundle.

## Generator lifecycle model

The controller and pure reducer use the mutually exclusive states `idle`, `image-loaded`, `processing`, `success`, `dirty`, `regenerating`, `aborted`, and `error`. A task receives a monotonic Job ID and a frozen snapshot containing the File, image revision, validated width, height, Maximum Colors, Background, and stable input key. Settings edits cannot mutate an active snapshot. Completion events are accepted only for the active Job ID; superseded, cancelled, late, and post-unmount outcomes are ignored.

Starting a new request cancels any active different-input request before assigning the new Job ID. Abort is idempotent and is not mapped to an error. Remove cancels the active request, clears generation state and any active public result, returns to `idle`, and preserves the P2-I03 settings draft. AbortController and Worker resources live in the controller/service lifecycle, never in reducer state.

After a successful result, any image or setting change produces `dirty` while retaining the previous public result. Regeneration retains that result during work and after cancellation or failure. Safe status copy distinguishes first generation from updates. Raw exceptions, stacks, file paths, Worker messages, internal Palette data, and internal reference fields never enter reducer errors or customer DOM.

P2-I04 success displays only “Pattern data is ready.” Public Pattern data remains in state for later accepted tasks. P2-I04 adds no Pattern Canvas, SVG pattern, color/material/board detail, counts, downloads, Shopify behavior, production data, or P2-I05 interaction.

## P2-I06 Public Pattern results contract

All Pattern Summary, color quantity, and Board Layout UI consumes only `PublicPatternResult`. The view layer reads the successful result’s public matrix dimensions, authoritative totals, public colors, per-color bead counts, and public Board Layout. It does not import or reconstruct internal Palette, matching, Assembly, BoardProfile, supplier, package, inventory, price, or Shopify data, and it never mutates or repairs the public result.

Pattern Summary uses a semantic definition list. Pattern Size comes from the successful public matrix, not the current settings draft. Colors is the authoritative actual `colorCount`, not the requested Maximum Colors. Total Beads is the authoritative bead total and excludes transparent positions. Boards comes from the public Board Layout. A nonzero public transparent-position count is shown as secondary information and never becomes a color row. All customer numbers use deterministic `en-US` formatting and tabular numerals.

Each color row shows only the public display code, English display name, exact public hex swatch, and public bead count. The swatch has a visible border and is never the sole color identifier. Singular and plural copy uses `bead` and `beads`. Public Pattern does not define a separate authoritative customer order, so the frozen view order is bead count descending, then public color index ascending, then public code lexical order. The list shows the total color count, renders eight rows by default, and uses native “Show all colors” / “Show fewer” controls with `aria-expanded`. Expansion is local, non-persistent view state: it survives Dirty and regeneration while the result identity is unchanged and resets for a new successful result. The accepted maximum expanded list is 512 rows.

Board Count, Columns, and Rows come directly from the public Board Layout; the UI never recomputes them from a hard-coded physical board size. Public board tiles are used only for abstract placement. Tile IDs, physical dimensions, SKU, packaging, price, inventory, Shopify data, supplier identity, and logos are not displayed. Layouts of at most 100 boards use an exact lightweight CSS Grid with one bounded tile node per public board position. Larger layouts create no board tile nodes and use one compressed, abstract mini-map capped at 20 visual grid divisions per axis while retaining exact textual Count, Columns, and Rows. The preview has an accessible name and is not a tab stop. This CSS-only strategy creates no Observer, animation frame, resize callback, or other preview resource requiring teardown.

The pure result view mapper validates public totals, color uniqueness/counts/hex/brand, bead sums, transparent-position relationships, Board row/column/count relationships, tile bounds, and Board aggregate sums. It copies neither the matrix nor large Board tile arrays into the view. Production rendering uses authoritative public statistics and does not rescan matrix cells. A controlled development/test-only assertion scans the matrix once per new result identity to confirm that every nontransparent index has a public color. Invalid result-view data displays “We couldn’t display these pattern details.” without changing Generator success or removing a valid Pattern Canvas.

Idle, image-loaded, first processing, first abort, and first error states show no result data. Success shows Summary, Colors, and Board Layout. Dirty, regenerating, regeneration-aborted, and regeneration-error states retain the previous successful result and announce that the details belong to that previous Pattern. A new success replaces every result view and resets expansion; Remove clears it. Compact layout remains vertical with wrapping color counts, Medium may place Colors and Board Layout in two columns below Summary, and Desktop/Wide retains the Results Region at the right. No layout creates page-level horizontal scrolling or implements a Bottom Sheet.

P2-I06 deliberately displays bead quantities, not purchase quantities. Even if optional material package fields exist in the public object, unverified `packSize`, packs required, package recommendations, prices, inventory, and exact purchase claims are not read or rendered. Download Pattern and Get Beads for This Pattern remain native disabled “Coming later” placeholders with no navigation, download, cart, or network behavior.

P2-I06 adds no Download/PDF runtime, Shopify or Get Beads navigation, Bottom Sheet, Original/Pattern comparison, editing, production Palette, verified BoardProfile, persistence, Router, database, or new dependency. The production generation runtime remains unavailable until its approved inputs exist.
