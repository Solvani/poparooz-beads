# Poparooz Pattern, Material, and Board Contract

Status: **P1-A09 implemented contract**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Implementation: [`../src/domain/pattern/`](../src/domain/pattern/)

## Scope and pure Domain boundary

P1-A09 synchronously assembles an accepted `QuantizedImage`, a strict `PaletteDefinition`, and a strict `BoardProfile` into internal pattern colors, an untrimmed matrix, exact material requirements, full-matrix board layout, and a separately mapped customer-safe result. Every input is explicit; there is no default palette, default board, external state, mutation, network, storage, Worker, React, DOM, Canvas, file/export, locale, timezone, or random dependency.

Quantization continues to own representatives, quantized indices, Alpha sentinel, and pixel counts. Color Matching continues to own eligible-candidate filtering, CIEDE2000, and tie-breaking. Pattern Domain calls those accepted entry points and does not duplicate their formulas or schemas.

## Palette mapping and same-color merge

The assembler calls `preparePaletteCandidates` once, then calls `matchNearestPaletteColor` exactly once per explicit `QuantizedColor.index`. Only colors with `isActive`, `isSellable`, and `isAutoMatchEnabled` all true can win. Matching uses the validated Palette Lab tuple, never recalculated RGB/HEX, inactive fallback, Delta E 76, or a second matching formula.

Quantized color indices are validated as unique and contiguous independently of array position. Source colors are processed in numeric index order. Matches group by normalized `referenceCode`, the Palette Definition's internal unique key. Object identity, input order, display name, RGB, HEX, and distance do not create duplicate materials.

Each internal source mapping records quantized index, internal reference key, exact distance, and positive pixel count. A merged Pattern Color records their exact bead sum, pixel-weighted average distance, and maximum distance. These diagnostics remain internal.

Final Pattern Colors sort by lower `sortOrder`, binary `displayCode`, then binary `referenceCode`, and receive contiguous indices from zero. Current strict Palette Schema requires `sortOrder` and unique normalized display/reference codes; no fallback is invented.

## Matrix and totals

`PATTERN_TRANSPARENT_INDEX` is `65535`; valid color indices remain below it. The matrix dimensions and coordinates equal the complete Quantized Image. Every opaque quantized index maps through an explicit lookup table, merged colors share one final index, and transparent positions preserve the sentinel. The assembler performs no trimming, translation, rotation, dithering, neighbor read, or invalid-index-to-transparent fallback.

The output uses a new `Uint16Array` and never shares the Quantized Image index buffer. Its totals satisfy:

```text
totalPositions = width * height
totalBeads + transparentPositions = totalPositions
colorCount = Pattern Colors
sum(material beadCount) = totalBeads
```

## Materials and packages

One material follows each Pattern Color in index order. `beadCount` is the exact theoretical matrix count. No waste, reserve, spare percentage, price, inventory, product recommendation, handle, variant, or cart behavior is added.

When and only when a strict Palette Color contains a positive integer `packSize`, `packsRequired = ceil(beadCount / packSize)`. Missing production pack truth remains missing; there is no default package size and no zero-count material.

## Complete-matrix board layout

The strict Board Profile's `columns` and `rows` are the authoritative bead positions per board. The profile is supplied explicitly and is never replaced by a hard-coded size. P1-A09 freezes:

```text
boardColumns = ceil(pattern width / profile columns)
boardRows = ceil(pattern height / profile rows)
boardCount = boardColumns * boardRows
```

This calculation uses the complete matrix, including transparent edges. It does not use an occupied bounding box, rearrange or rotate content, assume owned/spare boards, or make a product recommendation.

Tiles are zero-based and row-major. Each records its origin, covered matrix width/height, actual beads, transparent covered positions, and full-board pegs outside the matrix. Edge tiles may have partial coverage but retain full board capacity. Global and per-tile invariants reconcile used beads, transparent positions, outside pegs, total capacity, and unused capacity without overlap or omission.

## Internal and public results

The internal result may retain cloned strict `PaletteColor` records and internal reference/distance mappings for calculation and audit. It does not retain the Quantized Image object, whole Palette Definition, file, Blob, user image, or input board object.

`toPublicPatternResult` validates the internal result and constructs every field through an explicit allowlist. Colors and materials call `toPublicPaletteColor`, fixing brand to Poparooz and exposing only display-safe color fields. The public board layout omits profile ID/name and provenance. The public model excludes internal reference/source fields, match mappings/distances, supplier/commerce fields, product handles, variant IDs, and third-party branding.

The public matrix receives another `Uint16Array` copy, so customer-facing mutation cannot alter the internal matrix. P1-A09 does not define TypedArray JSON persistence or any download.

## Errors and invariants

`PatternAssemblyError` provides stable input, palette, board, mapping, matrix, material, layout, aggregate, and public-mapping categories. Known safe Domain codes may be retained as `causeCode`; raw Zod errors, palettes, matrices, reference codes, supplier identity, images, files, and stack details are never placed in messages.

`validatePatternAssemblyResult` checks matrix indices/counts, unique final colors, sorted source mappings, exact distance statistics, material/package equations, totals, tile geometry and actual matrix counts, complete row-major coverage, and every board-capacity equation. Malformed nested objects become stable errors rather than raw runtime exceptions.

## Determinism, fixtures, and performance boundary

Tests use only generated `TEST-REF-*` / `POP-TEST-*` non-production colors and a small explicitly non-production board. They cover candidate exclusions, Lab authority, tie-breaking, same-color merge, Palette and QuantizedColor array shuffles, matrix ownership, packages, cross-board edge tiles, public leakage, frozen inputs, and invariant corruption. Fixtures are not exported from the production barrel.

The allowed base complexity is `O(Q * P)` matching plus `O(N)` matrix remapping and board statistics. This synchronous pure Domain implementation is not evidence that all target devices can run it on the main thread within an acceptable budget. P1-A10 must benchmark representative sizes and decide whether a new Worker protocol version is warranted. P1-A09 does not change P1-A08 protocol version 1 or send palettes into the Worker.

No formal supplier palette, Poparooz production display codes, verified physical board, UI, Canvas, PNG/CSV/PDF, Shopify, Vercel, or real-browser acceptance is implemented here.

## P1-A10 freeze note

Pattern Assembly remains synchronous under Worker Decision C. Its measured time includes Palette Matching and tracks that dominant cost. Exact totals, transparent positions, board layout, deterministic ordering, public mapping, and independent typed-array ownership are covered by the final integration regression.
