# P1-A04 Image Pipeline Review

Review date: **2026-07-29**

Result: **Accepted with follow-up**

## Delivered boundary

P1-A04 adds browser-local JPEG/PNG/WebP input validation, safe EXIF Orientation
parsing, orientation transforms, contain geometry, deterministic RGBA resize,
transparent/white composition, stable errors, resource cleanup, cancellation,
and one public normalization service. It remains independent of React UI and
all color/palette algorithms.

The pure layer is `src/domain/image/`; the browser adapter is
`src/lib/browser-image/`. Domain imports were audited for browser globals. UI
will call `decodeAndNormalizeImage` rather than scatter Canvas, URL, decode, or
EXIF operations.

## Orientation decision

The adapter explicitly requests browser-applied orientation with
`imageOrientation: "from-image"`. It treats decoded pixels as oriented and does
not apply the project transform again. Synthetic Orientation 1–8 golden matrices
prove the pure mapping, and an adapter test proves Orientation 6 pixels are not
double-rotated. Invalid EXIF falls back safely to 1 with an internal diagnostic.

## Sampling and alpha decision

Downsampling uses deterministic two-dimensional area averaging. Explicit
upsampling uses deterministic bilinear interpolation; default upsampling is
rejected. Both operate in premultiplied-alpha math and return unpremultiplied
RGBA with half-up rounding. Transparent hidden RGB is cleared. White mode
source-over composites every pixel and outputs alpha 255.

## Safety and lifecycle evidence

Encoded size is checked before reading; decoded pixels before Canvas read.
Target dimensions and area are bounded. Tests cover cancellation before work,
late decode, rasterization, success, and error paths. ImageBitmap closes,
fallback Object URLs revoke, image sources clear, and temporary Canvas surfaces
reset. Raw platform exceptions are converted to safe messages without file
names, paths, Blob data, or pixels.

## Fixtures and dependencies

All image bytes and RGBA matrices are tiny and generated in test code. No user
or third-party image was accessed. No production dependency, native Canvas,
large image library, OCR, AI, WASM image platform, uploader, persistence, or
network processing was added.

## Deferred browser evidence

Vitest dependency injection verifies contracts but is not real codec/browser
conformance. Before production acceptance, run genuine JPEG/PNG/WebP decode,
EXIF 1–8, fallback, cancellation, memory, repeated-selection, and pixel checks
on supported desktop/mobile Chrome, Safari, and Firefox. Reassess the provisional
20MB, 40-million-pixel, 4096-dimension, and target-area limits on representative
devices.

## Explicit exclusions

No upload UI, preview, customer Canvas workspace, RGB/XYZ/Lab conversion,
color distance, palette matching, quantization, dithering, Worker, pattern,
materials, export, Shopify, Vercel, database, persistence, OCR, or AI removal
was implemented.

## P1-A05 entry condition

P1-A05 may begin only after this commit is separately accepted. It must be
limited to deterministic sRGB, XYZ D65, and Lab conversion with published
reference vectors; it must not pull forward color distance, matching,
quantization, Worker, Canvas workspace, UI, export, or deployment.
