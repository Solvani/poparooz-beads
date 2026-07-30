# P1-A07 Color Quantization Review

Date: **2026-07-30**

Result: **Accepted**

## Scope reviewed

P1-A07 adds strict RGBA/options validation, exact RGB Histogram construction, deterministic weighted Median Cut in CIELAB, actual-entry CIEDE2000 Medoids, stable cluster ordering, Alpha sentinel mapping, output invariant validation, synthetic tests, and governing documentation.

## Architecture finding

The implementation is isolated under `src/domain/quantization/` and uses only accepted Domain types/functions from P1-A04, P1-A05, and P1-A06. It is pure synchronous TypeScript with no React, DOM, Canvas, Blob/File, CSV, palette file, environment variable, network, locale, timezone, randomness, customer copy, commerce logic, or Worker dependency.

## Histogram and Alpha finding

Only pixels with `alpha > alphaThreshold` participate. The histogram groups exact 8-bit RGB keys, gives every participating pixel weight one, merges differing participating Alpha values for identical RGB, sorts by numeric key, and obtains Lab only through `rgb8ToLab`. A fully excluded image raises `NO_QUANTIZABLE_PIXELS`.

## Median Cut finding

Box selection follows maximum Lab range, pixel weight, unique entry count, and minimum RGB key. Axis ties resolve `L`, then `a`, then `b`. Entries sort by the chosen axis, remaining Lab axes, and RGB key. The weighted median chooses the legal boundary closest to half total weight and the earlier boundary on ties. Counts are never split and empty boxes are never created.

## Representative and output finding

Each box calculates a weighted Lab centroid, then selects the nearest real histogram entry with the accepted `deltaE2000`. Equal distances resolve by higher entry count then smaller RGB key. RGB and Lab therefore remain from one actual input color.

Clusters sort by representative key, descending pixel count, and box minimum key before receiving contiguous indices. Pixel mapping reuses box membership and never performs neighbor-based reassignment. Transparent positions use `65535`; successful output validates all counts, indices, dimensions, finite values, and buffer independence.

## No-dither and phase-boundary finding

The implementation contains no error diffusion, positional color change, noise, or neighbor read. It does not call `matchNearestPaletteColor`, import a formal palette, create a pattern matrix, calculate materials/boards, or implement Worker/Canvas/UI/export/Shopify behavior.

## Test finding

Tests use only programmatically generated small RGBA matrices and direct synthetic Histogram entries. Coverage includes invalid input/options, Alpha equality and exclusion, fully transparent errors, exact Histogram counts/order/Lab, 2x2 single/two-color images, gradient reduction, high-frequency colors, all split priorities, weighted median boundaries, unsplittable/early-stop behavior, Medoid distance and tie-breaks, real-entry representatives, contiguous indices, sentinel/count invariants, repeated exact results, rearranged pixels/entries, frozen input, buffer independence, and absence of position-dependent dithering.

## Scope audit

No dependency, production palette, customer image, third-party asset, formal display code, random source, dithering, Worker, Canvas, UI, PNG/CSV, Shopify, Vercel, database, AI, or OCR behavior was added.

## Decision

P1-A07 satisfies its isolated engineering gate and may be submitted for total-control acceptance. Work stops before P1-A08.

P1-A08 may begin only after external acceptance and must keep this quantizer as the shared pure core while adding a separately reviewed Worker protocol, cancellation, Transferable ownership, and whole-image background execution.
