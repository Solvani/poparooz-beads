# Poparooz Image Input and Normalization Contract

Status: **P1-A04 browser-local image pipeline authority**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Related algorithm contract: [`POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md`](POPAROOZ_DATA_AND_ALGORITHM_CONTRACTS.md)

## Scope and output

P1-A04 accepts a browser `Blob`, validates and decodes it locally, and returns
orientation-corrected, unpremultiplied, row-major RGBA pixels in an exact target
rectangle. It performs no color-space conversion, palette matching,
quantization, bead counting, Worker processing, customer Canvas workspace, UI,
upload, persistence, or export.

The public service is:

```ts
decodeAndNormalizeImage(
  input: Blob,
  options: NormalizeImageOptions,
  signal?: AbortSignal,
): Promise<NormalizedImageResult>
```

The result contains format, original/oriented dimensions, EXIF orientation,
alpha presence, contain geometry, and a new `Uint8ClampedArray`. It contains no
file name, path, Blob, original bytes, brand/reference data, or raw browser
exception.

## Architecture boundary

`src/domain/image/` is the pure-function layer. It owns signatures, limits,
minimal EXIF/TIFF parsing, all Orientation 1–8 transforms, contain geometry,
deterministic RGBA resizing, alpha/background composition, types, and stable
errors. It has no React, `document`, Canvas, FileReader, AbortSignal, environment,
network, storage, or browser-adapter dependency.

`src/lib/browser-image/` is the browser adapter. It owns Blob reads,
ImageBitmap/image-element decoding, temporary Canvas pixel extraction,
Object-URL fallback, AbortSignal handling, resource cleanup, safe browser-error
mapping, and composition of the pure functions. Future UI may call only this
service rather than operating these resources directly.

## Supported formats and signatures

Only JPEG, PNG, and WebP are supported. Content is authoritative:

- JPEG requires SOI plus a plausible following marker;
- PNG requires the complete eight-byte PNG signature;
- WebP requires both the RIFF and WEBP identifiers.

An empty MIME is accepted when content is valid. A present MIME must be exactly
`image/jpeg`, `image/png`, or `image/webp` for the detected format. Conflict is
rejected. Extension/file name is neither trusted nor read. GIF, SVG, HEIC, AVIF,
BMP, and TIFF are unsupported.

## Engineering limits

- encoded input: `20 * 1024 * 1024` bytes;
- decoded input: 40,000,000 pixels;
- target dimension: 1 through 4096 per side;
- target area: at most 16,777,216 pixels.

File size is checked before reading. Decoded dimensions and safe multiplication
are checked before Canvas allocation/pixel read. Targets must be positive safe
integers. These are provisional engineering guards and require target-device
memory/performance review before production release.

## EXIF orientation strategy

The parser reads only JPEG APP1 `Exif` TIFF byte order, IFD bounds, and tag
`0x0112`. It does not read GPS, camera model, capture time, thumbnails, or other
metadata. Both little- and big-endian TIFF and orientations 1–8 are covered.
Every offset, length, entry count, and value is bounded before access.

The browser adapter explicitly requests ImageBitmap
`imageOrientation: "from-image"`. Browser-decoded pixels are therefore treated
as already oriented; the service records EXIF and reconstructs original versus
oriented dimensions but never applies the transform twice. The pure transform
implementation remains the testable authority for all eight mappings.

Missing EXIF means Orientation 1. Truncated, malicious, out-of-bounds, or
invalid Orientation data safely falls back to 1 and may emit the internal
`INVALID_EXIF_DATA` diagnostic. It never reads beyond the input and the
diagnostic contains no file information. Current browser conformance still
requires later real Chrome/Safari/Firefox testing.

## Contain and upscale policy

MVP-A accepts only `preserveAspectRatio: true` and `fit: "contain"`. The image is
centered, never cropped, and always returned in the exact requested target
dimensions. Draw dimensions use `Math.round` half-up behavior for positive
values; offsets use `Math.floor` so an odd spare pixel remains on the right or
bottom. Geometry is clamped within the target.

`allowUpscale` defaults to false at future call sites. If contain would require
a scale greater than 1, the pipeline returns `UPSCALE_NOT_ALLOWED`; it does not
silently blur a small image. Explicit `allowUpscale: true` uses the documented
deterministic bilinear path.

## Deterministic resizing

The pure resizer performs:

- exact-copy output for 1:1 sizes;
- alpha-aware two-dimensional area averaging for downsampling;
- center-sampled, edge-clamped bilinear interpolation for explicit upsampling;
- half-up channel rounding and no intermediate integer rounding.

Calculations use premultiplied alpha internally so hidden RGB under transparent
pixels cannot contaminate visible color. Output is converted back to ordinary
unpremultiplied RGBA channels from 0 through 255. Fully transparent output RGB
is normalized to zero. Input arrays are never modified, randomness/dithering is
never used, and identical inputs produce identical bytes.

## Alpha and background

For `background: "transparent"`, contain padding is `(0,0,0,0)`, source alpha
is preserved, and fully transparent source RGB is cleared.

For `background: "white"`, padding is opaque white and each source pixel is
standard source-over composited onto white with half-up rounding. Every output
alpha is 255. No branded color is used as a default background.

## Resources and cancellation

The preferred decode path uses `createImageBitmap(Blob)` and always closes the
bitmap. If ImageBitmap is unavailable, the fallback Object URL is revoked after
both successful and failed image-element decode; the element source is cleared
on release. Temporary Canvas dimensions are reset after success or failure.

Abort is checked before reading, after reading, during asynchronous decode,
during asynchronous rasterization, and before success is returned. A bitmap or
decoded source that resolves after cancellation is immediately released. No
cancelled task returns a partial success object. Input is never uploaded or
written to LocalStorage/IndexedDB.

## Stable error model

Errors are `ImagePipelineError` objects with a stable `code`, safe `message`,
and optional bounded details. Codes are:

```text
EMPTY_FILE
FILE_TOO_LARGE
UNSUPPORTED_IMAGE_FORMAT
MIME_SIGNATURE_MISMATCH
IMAGE_DECODE_FAILED
INVALID_IMAGE_DIMENSIONS
DECODED_PIXEL_LIMIT_EXCEEDED
INVALID_TARGET_DIMENSIONS
UPSCALE_NOT_ALLOWED
INVALID_EXIF_DATA
CANVAS_UNAVAILABLE
PIXEL_READ_FAILED
ABORTED
```

Messages/details never include file names, local paths, Blob contents, pixels,
raw metadata, or raw browser exceptions. Future customer-visible copy remains
subject to the Poparooz Public Branding Contract.

## Fixtures and deferred validation

Tests generate minimal synthetic JPEG/PNG/WebP signatures, JPEG EXIF in both
byte orders, corrupted metadata, small RGBA matrices, transparency, and fake
browser resources. They contain no user image, third-party image, real product
art, or production palette data and are excluded from the application build.

Vitest proves pure math and adapter lifecycle through controlled fakes. P1-A04
does not install Playwright or a native Canvas/image package. Real codec output,
ImageBitmap orientation behavior, image-element fallback behavior, mobile
memory, and repeated-use resource behavior remain mandatory later tests in
target Chrome, Safari, Firefox, iOS, and Android environments.
