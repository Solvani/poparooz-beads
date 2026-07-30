# Poparooz Data and Algorithm Contracts

Status: **Frozen design contract; no runtime implementation in Phase 0**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Versioning rules

- Persisted or exported structures carry `schemaVersion`; breaking field or semantic changes increment it.
- Palette data has an immutable `sourceVersion`; corrected data creates a new version instead of silently changing an existing version.
- Algorithm behavior has a `generatorVersion`/algorithm version. Identical image bytes and settings, palette version, board profile, schema version, and algorithm version must produce identical results.
- Consumers reject unsupported major versions and ignore documented optional fields they do not understand.

## Internal reference palette and public presentation

[`POPAROOZ_MARD_PALETTE_CONTRACT.md`](POPAROOZ_MARD_PALETTE_CONTRACT.md) is the internal authority for `PaletteDefinition`, `PaletteColor`, reference-system provenance, normalization, dual uniqueness, special finishes, automatic-match eligibility, optional Shopify mappings, fixtures, and production-data entry conditions. Runtime schemas and inferred types live under `src/domain/palette/` and do not depend on React or the DOM.

[`POPAROOZ_PUBLIC_BRANDING_CONTRACT.md`](POPAROOZ_PUBLIC_BRANDING_CONTRACT.md) governs all customer-visible presentation. Internal calculation may use `referenceSystem` and `referenceCode`, but UI, accessibility text, materials, Canvas labels, PNG, customer CSV, filenames, downloads, Shopify presentation, SEO, metadata, analytics labels, and public responses must use the strict Public Palette Model produced by `toPublicPaletteColor`. An internal `PaletteColor` must never be rendered or serialized directly.

[`POPAROOZ_PALETTE_IMPORT_CONTRACT.md`](POPAROOZ_PALETTE_IMPORT_CONTRACT.md) governs the canonical offline CSV/metadata boundary and row-aware validation into `PaletteDefinition`. Auditable source files remain separate from any later versioned runtime artifacts. P1-A03 contains only small, unmistakable test fixtures and no production 221/291 table, Poparooz display-code list, sellable range, commerce mapping, or physical-color claim.

## Board profiles and board calculation

```ts
interface BoardProfile {
  id: string;
  name: string;
  columns: number;
  rows: number;
  beadSizeMm: number;
  isDefault: boolean;
  isActive: boolean;
}
```

Dimensions and bead size are positive; IDs are stable; at most one active profile is default. No competitor board size becomes a Poparooz production default. Until actual specifications are confirmed, only clearly labeled test fixtures are allowed.

Board count is based on two-dimensional occupied pattern bounds, never total beads divided by board capacity:

```text
horizontalBoards = ceil(patternWidth / boardColumns)
verticalBoards   = ceil(patternHeight / boardRows)
estimatedBoards  = horizontalBoards * verticalBoards
```

For a 78 × 64 pattern on a profile that produces a 2 × 2 layout, the UI displays `Pattern: 78 × 64 beads`, `Board layout: 2 × 2`, and `Estimated boards: 4`.

## Pattern project

```ts
interface PatternProject {
  schemaVersion: number;
  generatorVersion: string;
  patternId: string;
  patternName: string;
  width: number;
  height: number;
  paletteId: string;
  paletteVersion: string;
  boardProfileId: string;
  maxColors: number;
  preserveAspectRatio: boolean;
  transparentBackground: boolean;
  alphaThreshold: number;
  cells: PatternCell[];
  generatedAt: string;
}

interface PatternCell {
  x: number;
  y: number;
  referenceCode: string | null;
}
```

Width/height are positive bead-grid dimensions; `cells` contains exactly `width * height` unique in-bounds coordinates in stable row-major order. `null` means no bead. `alphaThreshold` is normalized to 0–1. IDs are opaque and local; `generatedAt` is ISO-8601 UTC. The project references immutable palette and generator versions.

## Material requirements

```ts
interface MaterialRequirement {
  referenceCode: string;
  displayCode: string;
  displayName: string;
  hex: string;
  beadCount: number;
  reserveCount: number;
  packSize?: number;
  packsRequired?: number;
  productHandle?: string;
  variantId?: string;
  isAvailable?: boolean;
}
```

`beadCount` exactly equals non-null pattern cells of the internal `referenceCode`. Customer materials map each requirement through its palette color and expose only Poparooz `displayCode`, `displayName`, swatch/HEX, and exact bead count. Reserve policy is explicit and defaults to zero until approved. Pack size, required packs, handles, variant IDs, inventory, and purchasability remain absent until verified; internal handles and IDs never enter the public model or customer CSV.

## Image input and processing

### Input and safety

[`POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md`](POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md) is the implementation authority for P1-A04 signatures, MIME policy, provisional limits, EXIF strategy, contain geometry, deterministic RGBA sampling, alpha/background behavior, browser resources, cancellation, safe errors, and deferred real-browser validation.

- Initial formats: JPEG, PNG, and WebP after both content/MIME validation and successful decode; extensions are not trusted.
- Initial engineering candidates are a 20 MB encoded file and 40 million decoded pixels. They are provisional guards that must be confirmed through target-device tests before becoming a release rule.
- Decode failure, corrupt data, extreme dimensions/aspect ratios, allocation failure, rapid reselection, stale Worker results, and unsupported formats produce typed recoverable errors.
- Object URLs, bitmaps, canvases, listeners, and Workers are released or terminated when replaced or on unload.
- EXIF orientation and browser decode differences are normalized before resampling so mobile portrait images are not unexpectedly rotated.

### Deterministic pipeline

1. Validate signatures/MIME/limits and decode locally in the browser. P1-A04 explicitly requests browser-applied EXIF orientation and does not rotate decoded pixels twice.
2. Normalize to unpremultiplied RGBA and validate orientation-corrected dimensions.
3. Fit with deterministic centered `contain`, preserving aspect ratio; uncovered cells are transparent or white by explicit option. There is no crop, subject detection, or AI removal.
4. Resample once with alpha-aware area averaging when reducing. Upscale is rejected by default; an explicitly allowed upscale uses the documented deterministic bilinear path.
5. If transparency is enabled, samples below the versioned `alphaThreshold` become `null`; other samples are composited over the configured default white background before color work. If transparency is disabled, all samples are composited over that background.
6. Apply the P1-A07 deterministic weighted Lab Median Cut quantizer to eligible 8-bit sRGB grid samples before later palette mapping. Each box uses an actual input RGB/Lab Medoid selected by CIEDE2000, and dithering remains off. `maxColors` limits quantizer clusters, while later palette collisions may make the final internal reference-color count smaller.
7. Linearize sRGB, convert to XYZ D65 and Lab, match enabled internal palette colors, and emit a row-major `referenceCode` matrix. Customer-visible consumers separately map results to the Public Presentation Model.
8. Count colors/beads and calculate the two-dimensional board layout.

Changing fit, sampling, alpha, background, quantization, or matching behavior requires an algorithm-version change.

## Color mathematics and matching

[`POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md`](POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md) is the implementation authority for P1-A05 types, units, validation, errors, frozen constants, precision, golden references, and the Alpha boundary. The pure implementation lives under `src/domain/color/` and performs only single-color conversion. Color distance, palette matching, quantization, image batching, and Worker execution remain later tasks.

[`POPAROOZ_COLOR_MATCHING_CONTRACT.md`](POPAROOZ_COLOR_MATCHING_CONTRACT.md) is the implementation authority for P1-A06 CIEDE2000, diagnostic Delta E 76, candidate eligibility, errors, deterministic tie-breaking, single-target matching, and the Public Presentation boundary. Quantization, image batching, dithering, and Worker execution remain later tasks.

[`POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md`](POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md) is the implementation authority for P1-A07 RGBA/options validation, Alpha empties, the 512 engineering guard, exact RGB Histogram, weighted CIELAB Median Cut, actual-entry CIEDE2000 Medoids, stable cluster/index output, invariant checks, and the no-dither baseline. Formal palette mapping, pattern/material/board output, and Worker execution remain later tasks.

For normalized sRGB component `c` in 0–1:

```text
cLinear = c / 12.92                         when c <= 0.04045
cLinear = ((c + 0.055) / 1.055) ^ 2.4      otherwise
```

Linear RGB converts to XYZ D65 using:

```text
X = 0.4124564 R + 0.3575761 G + 0.1804375 B
Y = 0.2126729 R + 0.7151522 G + 0.0721750 B
Z = 0.0193339 R + 0.1191920 G + 0.9503041 B
```

XYZ and the D65 2° white point `(0.95047, 1.00000, 1.08883)` use the CIE Lab transform:

```text
delta = 6 / 29
f(t) = cbrt(t)                              when t > delta^3
f(t) = t / (3 * delta^2) + 4 / 29          otherwise
L* = 116 f(Y/Yn) - 16
a* = 500 [f(X/Xn) - f(Y/Yn)]
b* = 200 [f(Y/Yn) - f(Z/Zn)]
```

Palette matching uses CIEDE2000 (`Delta E 00`) with `kL = kC = kH = 1`. The implementation is covered by the complete Sharma/Wu/Dalal supplementary reference set. JavaScript double precision is used without intermediate rounding. After finding the true minimum, candidates within `1e-12` resolve by lower `sortOrder`, then binary normalized `displayCode`, then binary normalized internal `referenceCode`. Display rounding and public mapping never affect distance calculation.

Dithering is off by default in MVP-A because it creates scattered colors, increases material variety, and complicates physical assembly. Any later optional dithering is a versioned MVP-B decision.

The main-thread and Worker paths call the same pure versioned core and must produce byte-for-byte equal pattern codes, counts, layout, CSV data rows, and PNG legend data for identical inputs.

## Export contract

### Names and common behavior

Pattern names are Unicode-normalized, path separators/control characters removed, whitespace collapsed, and length-limited; an empty result becomes `poparooz-pattern`. Files use `<safe-name>-pattern.png` and `<safe-name>-materials.csv`. Download failures are surfaced with a retry path. Browser/device export limits are measured and documented before Phase 3 acceptance rather than guessed here.

### PNG

The default PNG contains the pattern grid, readable Poparooz display codes, ordinary English display names, legend, material counts, pattern dimensions, board profile/layout, total beads, generator version, and UTC generation time. It contains no internal reference-system name, code, logo, source version, supplier/audit field, or Shopify mapping. Empty cells follow the project's transparency choice; non-transparent export uses white. A large-pattern layout may paginate or scale labels only through a separately accepted Phase 3 decision; it may not silently omit data.

### CSV

The customer CSV is UTF-8, RFC 4180 quoted, and deterministic. Rows follow palette `sortOrder` then `displayCode`, after explicit Public Presentation mapping. Required columns are:

```text
display_brand,display_code,display_name,hex,bead_count,
reserve_count,pack_size,packs_required,
pattern_name,pattern_width,pattern_height,board_profile_id,
horizontal_boards,vertical_boards,estimated_boards,total_beads,
generator_version,generated_at
```

Unavailable optional material values are empty, not fabricated. Internal reference/source fields, product handles, variant IDs, supplier/audit fields, and third-party brand names are prohibited. Pattern-level public metadata repeats per material row so the file remains tabular and self-describing. An empty pattern still exports the header and requires a separately specified metadata representation before implementation acceptance.

## Analytics and privacy

Allowed event names are `generator_viewed`, `image_selected`, `generation_started`, `generation_completed`, `generation_failed`, `settings_changed`, `pattern_downloaded`, `materials_csv_downloaded`, `shop_clicked`, and `fullscreen_opened`.

Allowed properties are pattern width/height, maximum colors, elapsed time, success flag, typed error category, mobile flag, export type, and shop-click context. Analytics payloads use an explicit allowlist; unknown properties are dropped.

Forbidden everywhere: original images, names, paths, pixels, thumbnails, Base64, hashes/fingerprints, embeddings/features that reveal content, and unconsented identity data. Images stay in browser memory, are never sent to a server or parent iframe, are not written to LocalStorage, and are cleared on refresh/unload. Phase 0 integrates no analytics provider.

## Iframe protocol and security

The message envelope and privacy rules below are data contracts. Deployment, lifecycle, origin, resize, CSP, sandbox, and fallback requirements are governed by [`POPAROOZ_IFRAME_AND_SHOPIFY_CONTRACT.md`](POPAROOZ_IFRAME_AND_SHOPIFY_CONTRACT.md).

```ts
interface GeneratorMessage<T = unknown> {
  source: "poparooz-generator";
  version: 1;
  type:
    | "generator.ready"
    | "generator.resize"
    | "generator.shop"
    | "generator.analytics"
    | "generator.error";
  payload: T;
}
```

Payloads are allowlisted and runtime-validated: ready reports non-sensitive version/capabilities; resize reports a bounded integer height; shop reports a configured collection key and user-gesture marker, never a URL; analytics uses the allowlist above; error reports a stable code and recoverability, never image data.

Child requirements:

- derive production `targetOrigin` from environment configuration and never use `*`;
- debounce or throttle resize messages and clean up observers/listeners on unload;
- send no file name, pixels, image, thumbnail, Base64, fingerprint, or feature data.

Parent requirements:

- validate `event.origin`, `event.source === iframe.contentWindow`, message `source`, protocol version, known type, and exact payload schema;
- ignore unknown/invalid messages without side effects;
- map an allowlisted collection key to a locally configured Shopify URL only after an explicit user shop action;
- never execute message content as code or navigate to a message-provided URL.

Production CSP `frame-ancestors` lists only the verified Shopify parent origins. Preview origins are denied by default and may be separately allowlisted only in non-production. The iframe uses the minimum sandbox tokens initially expected to be `allow-scripts allow-same-origin allow-downloads`; additions require a security decision. Fullscreen uses a deliberate `allow="fullscreen"`/full-screen attribute. Popup/new-window permission is not granted unless a later accepted flow needs it. The parent provides a full-screen fallback when embedding fails.
