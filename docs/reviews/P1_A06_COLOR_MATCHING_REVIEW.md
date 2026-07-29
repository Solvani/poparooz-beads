# P1-A06 Color Matching Review

Date: **2026-07-29**

Result: **Accepted**

## Scope reviewed

P1-A06 adds strict Lab validation, full CIEDE2000, diagnostic Delta E 76, eligible-candidate preparation, single-target nearest-color matching, deterministic tie-breaking, stable errors, numeric reference/property tests, and governance documentation.

## Formula finding

The production matcher calls `deltaE2000` with fixed `kL = kC = kH = 1`. The implementation covers adjusted chroma/hue, circular hue differences and means, zero/small chroma, 0/360 wrapping, weighting functions, rotation term, full precision, and exact negative-zero normalization. Delta E 76 is exported only as a diagnostic baseline and is not used by matching.

The test-only fixture copies all 34 published supplementary pairs from Sharma, Wu, and Dalal. Its source is the paper author's [University of Rochester test-data page](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/), not the implementation under review. Every pair passes within absolute error `1e-4`.

## Candidate and match finding

Candidate preparation reuses `PaletteDefinitionSchema` and requires active, sellable, and auto-match-enabled flags. It rejects empty palettes separately from palettes with no eligible colors, performs no fallback, leaves inputs unchanged, and produces deterministic readonly candidates.

Matching validates each candidate, consumes its controlled `PaletteColor.lab`, calculates actual CIEDE2000 distance, and scans a single finite candidate list. It returns one internal `PaletteColor` plus its actual distance.

## Tie-break finding

The matcher first determines the exact minimum distance and then selects within `minimum + 1e-12` by lower `sortOrder`, binary normalized `displayCode`, and binary normalized `referenceCode`. This two-stage rule is input-order independent. It uses no locale comparison, randomness, or configurable tolerance.

## Brand-boundary finding

The internal result may retain reference fields for calculation and audit. Tests pass the winning color through the unchanged `toPublicPaletteColor` allowlist and verify the fixed Poparooz brand while internal reference, product-handle, and variant fields remain absent from the public object and JSON.

## Architecture and performance finding

The module is pure TypeScript under `src/domain/color/`. It uses no React, DOM, Canvas, image/file read, environment variable, network, locale, timezone, persistence, or random source. Matching is a simple O(n) scan. Candidate preparation uses deterministic ordering once per palette preparation; no index, cache, Worker, SIMD, WASM, or GPU structure is introduced.

## Scope audit

The change adds no dependency and no production palette. It does not implement quantization, dithering, image-buffer conversion, whole-image matching, Worker, Canvas, UI, PNG/CSV, Shopify, Vercel, database, AI, or OCR behavior.

## Decision

P1-A06 satisfies its isolated engineering gate and may be submitted for total-control acceptance. Work stops before P1-A07.

P1-A07 may begin only after external acceptance and must reuse this accepted CIEDE2000 matcher and tie-breaker for deterministic quantization and the no-dither baseline.
