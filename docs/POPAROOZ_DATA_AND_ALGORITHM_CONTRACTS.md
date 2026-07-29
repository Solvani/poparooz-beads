# Poparooz Data and Algorithm Contracts

Status: **Frozen design contract; no runtime implementation in Phase 0**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Versioning rules

- Persisted or exported structures carry `schemaVersion`; breaking field or semantic changes increment it.
- Palette data has an immutable `sourceVersion`; corrected data creates a new version instead of silently changing an existing version.
- Algorithm behavior has a `generatorVersion`/algorithm version. Identical image bytes and settings, palette version, board profile, schema version, and algorithm version must produce identical results.
- Consumers reject unsupported major versions and ignore documented optional fields they do not understand.

## MARD palette

[`POPAROOZ_MARD_PALETTE_CONTRACT.md`](POPAROOZ_MARD_PALETTE_CONTRACT.md) is the authority for `PaletteDefinition`, `PaletteColor`, provenance levels, normalization, uniqueness, special finishes, automatic-match eligibility, optional Shopify mappings, fixtures, and production-data entry conditions. Runtime schemas and inferred types live under `src/domain/palette/` and do not depend on React or the DOM.

MARD codes remain canonical; Poparooz creates no substitute color codes. A future auditable master source may live at `data-source/mard-palette.csv`, while versioned runtime artifacts may live under `src/data/palettes/`. Source/runtime separation and provenance remain mandatory. P1-A02 contains only a small, unmistakable test fixture and no production 221/291 table, sellable range, commerce mapping, or physical-color claim.

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
  colorCode: string | null;
}
```

Width/height are positive bead-grid dimensions; `cells` contains exactly `width * height` unique in-bounds coordinates in stable row-major order. `null` means no bead. `alphaThreshold` is normalized to 0–1. IDs are opaque and local; `generatedAt` is ISO-8601 UTC. The project references immutable palette and generator versions.

## Material requirements

```ts
interface MaterialRequirement {
  colorCode: string;
  colorName: string;
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

`beadCount` exactly equals non-null pattern cells of that code. MVP-A guarantees code, name, swatch/HEX, and exact bead count. Reserve policy is explicit and defaults to zero until approved. Pack size, required packs, handles, variant IDs, inventory, and purchasability remain absent until verified; an absent value is not `0` or `false`.

## Image input and processing

### Input and safety

- Initial formats: JPEG, PNG, and WebP after both content/MIME validation and successful decode; extensions are not trusted.
- Initial engineering candidates are a 20 MB encoded file and 40 million decoded pixels. They are provisional guards that must be confirmed through target-device tests before becoming a release rule.
- Decode failure, corrupt data, extreme dimensions/aspect ratios, allocation failure, rapid reselection, stale Worker results, and unsupported formats produce typed recoverable errors.
- Object URLs, bitmaps, canvases, listeners, and Workers are released or terminated when replaced or on unload.
- EXIF orientation and browser decode differences are normalized before resampling so mobile portrait images are not unexpectedly rotated.

### Deterministic pipeline

1. Validate and decode locally in the browser.
2. Normalize orientation and RGBA representation.
3. Fit with `contain`, centered, preserving aspect ratio by default; uncovered cells follow the transparency/background rule. There is no automatic subject detection, crop, or AI background removal.
4. Resample once to the target bead grid using a versioned, explicitly tested sampling rule.
5. If transparency is enabled, samples below the versioned `alphaThreshold` become `null`; other samples are composited over the configured default white background before color work. If transparency is disabled, all samples are composited over that background.
6. Apply deterministic maximum-color quantization to eligible 8-bit sRGB grid samples before palette mapping. The Phase 1 implementation decision must name and fixture-test the exact quantizer; the baseline candidate is stable median-cut. `maxColors` limits quantizer buckets, while palette collisions may make the final MARD color count smaller.
7. Linearize sRGB, convert to XYZ D65 and Lab, match enabled palette colors, and emit a row-major MARD code matrix.
8. Count colors/beads and calculate the two-dimensional board layout.

Changing fit, sampling, alpha, background, quantization, or matching behavior requires an algorithm-version change.

## Color mathematics and matching

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

Palette matching uses CIEDE2000 (`Delta E 00`) with `kL = kC = kH = 1`. The implementation must be covered by published reference vectors. JavaScript double precision is used without intermediate rounding. Comparisons within `1e-12` are ties; ties resolve by lower `sortOrder`, then lexicographically smaller MARD `code`. Display rounding never affects selection.

Dithering is off by default in MVP-A because it creates scattered colors, increases material variety, and complicates physical assembly. Any later optional dithering is a versioned MVP-B decision.

The main-thread and Worker paths call the same pure versioned core and must produce byte-for-byte equal pattern codes, counts, layout, CSV data rows, and PNG legend data for identical inputs.

## Export contract

### Names and common behavior

Pattern names are Unicode-normalized, path separators/control characters removed, whitespace collapsed, and length-limited; an empty result becomes `poparooz-pattern`. Files use `<safe-name>-pattern.png` and `<safe-name>-materials.csv`. Download failures are surfaced with a retry path. Browser/device export limits are measured and documented before Phase 3 acceptance rather than guessed here.

### PNG

The default PNG contains the pattern grid, readable MARD codes, legend, material counts, pattern dimensions, palette/version, board profile/layout, total beads, generator version, and UTC generation time. Empty cells follow the project's transparency choice; non-transparent export uses white. A large-pattern layout may paginate or scale labels only through a separately accepted Phase 3 decision; it may not silently omit data.

### CSV

CSV is UTF-8, RFC 4180 quoted, and deterministic. Rows follow palette `sortOrder` then code. Required columns are:

```text
palette_brand,palette_version,color_code,color_name,hex,bead_count,
reserve_count,pack_size,packs_required,product_handle,variant_id,
pattern_name,pattern_width,pattern_height,board_profile_id,
horizontal_boards,vertical_boards,estimated_boards,total_beads,
generator_version,generated_at
```

Unavailable optional commerce values are empty, not fabricated. Pattern-level metadata repeats per material row so the file remains tabular and self-describing. An empty pattern still exports the header and requires a separately specified metadata representation before implementation acceptance.

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
