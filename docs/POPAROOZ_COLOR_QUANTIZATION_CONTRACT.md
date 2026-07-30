# Poparooz Color Quantization Contract

Status: **P1-A07 implemented contract**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Image normalization authority: [`POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md`](POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md)

Color conversion authority: [`POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md`](POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md)

Color distance authority: [`POPAROOZ_COLOR_MATCHING_CONTRACT.md`](POPAROOZ_COLOR_MATCHING_CONTRACT.md)

Implementation: [`../src/domain/quantization/`](../src/domain/quantization/)

## Scope

P1-A07 provides deterministic, brand-independent quantization of one normalized in-memory RGBA image:

```text
validated RgbaImage + explicit options
-> exact opaque RGB histogram
-> weighted Median Cut in CIELAB
-> actual-entry CIEDE2000 medoids
-> stable quantized colors and per-pixel cluster indices
```

It does not load files, palettes, customer content, or network data. It performs no formal palette mapping, pattern/material/board calculation, dithering, Worker execution, Canvas/UI rendering, export, Shopify integration, deployment, persistence, AI, or OCR.

## Input and options

The input is the accepted P1-A04 `RgbaImage`:

- positive safe-integer `width` and `height`;
- `Uint8ClampedArray` data;
- exactly `width * height * 4` row-major RGBA channels;
- unpremultiplied channel values from 0 through 255.

The caller supplies both options explicitly:

```ts
interface QuantizationOptions {
  readonly maxColors: number;
  readonly alphaThreshold: number;
}
```

No hidden Alpha or maximum-color default exists in the quantization core.

`maxColors` must be a finite integer in `1..512`. `MAX_QUANTIZATION_COLORS = 512` is an engineering protection limit against accidental cluster and memory growth. It is not a claim that a future customer UI will offer 512 colors.

`alphaThreshold` must be a finite integer in `0..255`. Values are not clamped, rounded, or coerced from strings.

## Alpha and empty positions

The frozen rule is:

```text
alpha <= alphaThreshold -> transparent/empty position
alpha >  alphaThreshold -> participates with weight 1
```

Participating semitransparent pixels are not given a fractional weight. P1-A07 adds no automatic threshold, Alpha weighting, or background composition. P1-A04 remains responsible for the selected transparent/white normalization policy.

If no pixel is above the threshold, quantization raises `NO_QUANTIZABLE_PIXELS`. It never fabricates a black or white cluster and never treats transparent RGBA `(0,0,0,0)` as an opaque black color.

## Exact RGB histogram

Only participating pixels enter the histogram. The numeric RGB key is:

```text
key = r * 65536 + g * 256 + b
```

This produces an unsigned integer from `0` through `0xFFFFFF` without depending on signed bitwise behavior or locale formatting.

Each unique RGB entry contains:

- the numeric key;
- the exact 8-bit RGB triplet;
- Lab calculated by the accepted P1-A05 `rgb8ToLab` function;
- a positive integer pixel count.

Identical RGB values with different participating Alpha values share one entry. Every participating pixel contributes exactly one count. Transparent pixels, file names, source metadata, and user content are not retained. Entries are sorted by numeric key, so histogram behavior does not depend on pixel or `Map` insertion order.

## Weighted Median Cut

The formal P1-A07 algorithm is deterministic weighted Median Cut in CIELAB space. The processing unit is a unique histogram entry weighted by its exact pixel count.

Each nonempty quantization box records:

- entries;
- total pixel weight;
- minimum RGB key;
- `L`, `a`, and `b` ranges.

The implementation does not split the count of one histogram entry across boxes.

### Box selection

At each round, the splittable box is selected by:

1. larger maximum single-axis Lab range;
2. larger total pixel weight;
3. more unique entries;
4. smaller minimum RGB key.

This comparison is centralized and independent of box array order. Singleton boxes are not splittable. If no box remains splittable, the algorithm stops safely even when the result contains fewer colors than `maxColors`.

### Split axis

The axis with the largest range is selected. Equal ranges resolve in fixed order:

```text
L -> a -> b
```

### Entry order

Entries are copied before sorting. The primary key is the selected Lab axis, followed by the remaining axes in fixed `L/a/b` order, then numeric RGB key.

Examples:

```text
L split: L -> a -> b -> RGB key
a split: a -> L -> b -> RGB key
b split: b -> L -> a -> RGB key
```

No `localeCompare`, object creation order, or mutable source ordering participates.

### Weighted median boundary

For every legal boundary between adjacent sorted entries, the implementation calculates the cumulative pixel weight on the left. It chooses the boundary closest to half the box's total weight. Equal distances select the earlier boundary.

Both resulting boxes always contain at least one complete entry. No empty box is created. A single high-frequency entry remains intact.

## Actual-entry representative color

Each final box first calculates its pixel-weighted Lab centroid:

```text
centroid.channel = sum(entry.lab.channel * entry.count) / totalCount
```

The centroid is used only as a selection target. It is never returned as a fabricated RGB color.

The representative is the actual histogram entry with the smallest accepted P1-A06 `deltaE2000(entry.lab, centroid)` distance. Exact distance ties resolve by:

1. larger entry count;
2. smaller numeric RGB key.

Representative RGB and Lab always come from the same real input entry. The module does not implement Lab-to-RGB conversion and does not duplicate CIEDE2000.

## Stable final cluster order

After representatives are selected, clusters receive contiguous indices using:

1. representative RGB key ascending;
2. pixel count descending;
3. original box minimum RGB key ascending.

Representative keys are expected to be unique because boxes contain disjoint histogram entries; the remaining fields are defensive deterministic tie-breakers. Indices begin at zero with no holes.

## Per-pixel mapping and no dithering

Each histogram RGB key retains its final box membership. The original RGBA pixels are then visited in row-major order:

- transparent/threshold positions receive the sentinel;
- participating positions receive the cluster index for their exact RGB histogram entry.

There is no second nearest-representative assignment, neighbor read, positional adjustment, error diffusion, or noise. Identical RGB always maps to the same cluster regardless of pixel location.

MVP-A freezes dithering off. P1-A07 contains no Floyd-Steinberg, Atkinson, Jarvis-Judice-Ninke, Bayer matrix, blue noise, random noise, or other diffusion path.

## Output model and invariants

```ts
interface QuantizedColor {
  readonly index: number;
  readonly rgb: Rgb8;
  readonly lab: LabColor;
  readonly pixelCount: number;
}

interface QuantizedImage {
  readonly width: number;
  readonly height: number;
  readonly colors: readonly QuantizedColor[];
  readonly colorIndices: Uint16Array;
  readonly transparentIndex: number;
  readonly opaquePixelCount: number;
  readonly transparentPixelCount: number;
}
```

`TRANSPARENT_COLOR_INDEX = 65535`. Valid color indices are `0..colors.length-1`, so the sentinel cannot collide with a valid cluster under the 512-color limit.

Every successful result is checked for:

- unchanged dimensions;
- exact index-buffer length;
- one through `maxColors` nonempty colors;
- contiguous indices;
- valid RGB and finite Lab without exact negative zero;
- valid sentinel/index values at every position;
- per-color counts matching the index buffer;
- color counts summing to opaque pixels;
- opaque plus transparent counts equaling total pixels;
- an output index buffer independent of the input RGBA buffer.

The colors array and color records are frozen. The typed index buffer is an independent allocation. The algorithm never modifies or returns the input pixel buffer.

## Error model

`QuantizationError` exposes:

- `INVALID_RGBA_IMAGE`
- `INVALID_MAX_COLORS`
- `INVALID_ALPHA_THRESHOLD`
- `NO_QUANTIZABLE_PIXELS`
- `INVALID_HISTOGRAM_ENTRY`
- `UNSPLITTABLE_QUANTIZATION_BOX`
- `INVALID_CLUSTER_RESULT`
- `QUANTIZATION_FAILED`

Messages are safe and generic. They contain no image content, full RGBA data, file name, palette, supplier, product, commerce identifier, or brand. Unexpected internal failures are mapped to `QUANTIZATION_FAILED`; invariant failures are not silently returned.

Running out of splittable boxes before `maxColors` is normal and does not raise `UNSPLITTABLE_QUANTIZATION_BOX`. That code protects invalid direct split attempts.

## Determinism and performance boundary

Identical input bytes and options produce identical color count, representatives, Lab values, cluster order, indices, counts, sentinel placement, and statistics. Results do not depend on locale, timezone, random values, object identity, pixel arrangement beyond the corresponding output positions, histogram insertion order, or box creation order.

The implementation prioritizes correctness and explainability. It uses an exact RGB histogram, unique-entry Median Cut, and box-local Medoid scans within the accepted `O(U log U * K)` engineering range, where `U` is the number of unique participating RGB values and `K` is the output color count.

P1-A07 introduces no Worker, multithreading, SIMD, WASM, GPU, KD tree, cache, streaming, or fixed-millisecond unit gate. Representative image-scale performance belongs to P1-A08 and later phase acceptance.

## Palette and phase boundaries

P1-A07 outputs only quantized representative RGB/Lab values. It does not call `matchNearestPaletteColor` or produce a formal `PaletteColor`.

The intended later chain is:

```text
P1-A07 QuantizedColor.lab
-> later accepted P1-A06 palette matching use
-> internal PaletteColor
-> pattern matrix
-> material and board calculations
```

Formal palette data and customer display codes remain unavailable and are not invented here.

P1-A08 may wrap this pure synchronous function in a separately reviewed Worker protocol with cancellation and Transferable ownership rules. P1-A09 may later combine accepted quantization and palette matching into a pattern pipeline. Neither behavior is part of P1-A07.
