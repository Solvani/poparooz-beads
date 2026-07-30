# P1-A09 Pattern Assembly Review

Date: **2026-07-30**

Result: **Accepted with follow-up**

## Scope and architecture finding

P1-A09 adds only a pure synchronous `src/domain/pattern/` module. It reuses strict Quantized Image, Palette, and Board validation; accepted candidate preparation and CIEDE2000 matching; and the existing Public Palette allowlist. Quantization and Color Matching remain unchanged business boundaries. No React, DOM, Canvas, browser, Worker protocol, network, storage, UI, export, Shopify, or deployment behavior was added.

## Mapping, matrix, and material finding

Every explicit quantized index is matched once against accepted eligible candidates. Matches merge by normalized internal reference key; source mappings remain complete and stable. Final colors sort by required numeric/binary keys and receive contiguous indices. The independent output matrix preserves dimensions and transparent sentinel without trimming, moving, dithering, or neighbor reads. Exact bead totals and optional validated package calculations add no reserve or waste.

## Board and public-boundary finding

Board dimensions come only from strict `BoardProfile.columns` and `rows`. Layout covers the complete matrix in row-major tiles, including transparent edges and outside capacity. Validator checks tile geometry against actual matrix cells and reconciles every aggregate.

The public mapper is an explicit construction. It calls `toPublicPaletteColor`, removes internal match/reference/source and board-profile identity fields, and copies the matrix buffer. Serialized public tests contain only Poparooz presentation data and no internal reference-system brand or commerce mapping.

## Test, privacy, and determinism finding

Tests use only generated non-production palette/board values. They verify invalid inputs, candidate exclusion, Lab authority, accepted tie-breaking, same-color merge, distance statistics, sort order, array-order independence, matrix/material/package totals, board boundaries and partial tiles, result corruption, public leakage, separate matrix ownership, frozen input, repetition, and forbidden platform dependencies. The code accesses no user file, image, network, persistence, environment, locale, timezone, or randomness.

## Performance and decision

The implementation is intentionally `O(Q * P) + O(N)` and synchronous. That is not proof of acceptable main-thread performance on representative desktop or mobile devices. P1-A10 must benchmark end to end, collect Chrome/Firefox/Safari and Android/iOS evidence, and decide whether pattern assembly remains on the main thread or requires a separately versioned Worker extension.

No formal palette, verified physical board, UI, Canvas, customer export, Shopify, Vercel, or true browser acceptance was added. P1-A09 is accepted with those production-data and performance follow-ups and stops before P1-A10.

No dependency or lock-file change occurred. The required offline npm audit was attempted, but npm remains unavailable on PATH and the bundled Node runtime has no npm CLI. No online audit was claimed or attempted as a workaround; a current audit remains a release follow-up.
