# Poparooz Color Matching Contract

Status: **P1-A06 implemented contract**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Color conversion authority: [`POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md`](POPAROOZ_COLOR_SPACE_CONVERSION_CONTRACT.md)

Implementation: [`../src/domain/color/`](../src/domain/color/)

## Scope

P1-A06 provides brand-independent, deterministic operations for one Lab target:

```text
validated Lab target
-> CIEDE2000 distance to eligible internal palette candidates
-> deterministic nearest internal PaletteColor
```

It includes CIEDE2000, an optional diagnostic Delta E 76 function, candidate preparation, matching, tie-breaking, stable errors, and the internal/public presentation boundary.

It does not import a production palette, quantize an image, iterate image pixels, convert an RGB buffer, dither, cache colors, use a Worker/Canvas/browser API, build UI/export/Shopify behavior, or change the accepted P1-A04 and P1-A05 pipelines.

## Lab input

`LabColor` is the accepted P1-A05 D65 CIELAB type. Public distance and matching entries require:

- `l`, `a`, and `b` to be numbers;
- every channel to be finite;
- `l` to be within 0 through 100;
- no string coercion, clamp, rounding, or input mutation.

`a` and `b` are not assigned an artificial narrow range. Invalid input raises `INVALID_LAB_COLOR`.

Palette candidate Lab values come from the existing strictly validated `PaletteColor.lab` tuple. Matching never recalculates or replaces that tuple from HEX or RGB. Fixture Lab data is not a claim that screen RGB exactly represents a physical material.

## Production distance: CIEDE2000

`deltaE2000(left, right)` implements the complete CIEDE2000 formula with fixed parametric factors:

```text
kL = 1
kC = 1
kH = 1
```

The implementation includes original and adjusted chroma, `G`, adjusted `a`, adjusted hue, lightness/chroma/hue differences, circular mean hue, `T`, `deltaTheta`, `RC`, `SL`, `SC`, `SH`, `RT`, and the final coupled expression.

Angles are explicitly converted between degrees and radians. Hue is normalized to `[0, 360)`. The formula has explicit branches for:

- both chromas equal to zero;
- one chroma equal to zero;
- hue differences crossing 0/360 degrees;
- circular mean hue on either side of 180 degrees;
- extremely small chroma;
- exactly identical Lab inputs.

The implementation does not use RGB distance, HEX difference, approximate hue difference, browser color APIs, or special-cased reference results.

## Diagnostic distance: Delta E 76

`deltaE76(left, right)` returns Euclidean distance in Lab. It exists only for diagnostics, formula sanity checks, and future algorithm comparisons. It is not the production matching default. `matchNearestPaletteColor` always uses `deltaE2000`.

## Reference data and tolerance

The test-only fixture contains all 34 pairs from Gaurav Sharma, Wencheng Wu, and Edul Dalal, _The CIEDE2000 Color-Difference Formula: Implementation Notes, Supplementary Test Data, and Mathematical Observations_, Color Research and Application 30(1), 21–30 (2005), DOI `10.1002/col.20070`.

The source is the [paper author's University of Rochester CIEDE2000 page](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/), including its published plain-text supplementary test data. The values were copied from that source and were not generated from this implementation.

Every reference pair must have absolute error no greater than `1e-4`. Property tests supplement, but do not replace, the published vectors.

## Precision and negative zero

- Computation uses JavaScript double-precision `number` values.
- No intermediate `toFixed`, string math, display rounding, or broad clamp is used.
- Public distances are finite and non-negative or a stable error is thrown.
- Exact `-0` is returned as `0`; legitimate small nonzero distances are retained.
- Identical finite Lab inputs return exactly `0`.
- Results do not depend on locale, timezone, environment variables, randomness, or input object identity.

## Eligible palette candidates

`preparePaletteCandidates(palette)` reuses the existing strict `PaletteDefinitionSchema`. A color participates only when all flags are true:

```text
isActive === true
isSellable === true
isAutoMatchEnabled === true
```

Inactive, unsellable, and manually excluded colors never participate. A special-finish color participates only if its schema-valid record explicitly enables automatic matching. There is no fallback to the complete palette, the first color, an unsellable color, or a special-finish color.

Candidate preparation parses into safe copies, leaves the input palette and colors unchanged, returns a frozen candidate array, and orders it deterministically by the same non-distance fields used by the matcher. It does not depend on the accidental input array order.

An empty palette raises `EMPTY_PALETTE`. A nonempty valid palette with no eligible colors raises `NO_ELIGIBLE_PALETTE_COLORS`.

## Nearest-color matching

`matchNearestPaletteColor(target, candidates)` handles one Lab target and performs a simple bounded-domain scan. For each validated eligible candidate it calculates CIEDE2000 against `candidate.color.lab` and returns:

```ts
interface PaletteMatchResult {
  readonly color: PaletteColor;
  readonly distance: number;
}
```

The result is internal Domain data. It returns the actual distance for the selected candidate and never returns an image, pixel buffer, complete palette, or customer-facing copy.

The scan is O(n). No KD tree, VP tree, color index, cache, SIMD, WASM, GPU, or Worker is introduced at this stage.

## Deterministic tie-breaker

`MATCH_DISTANCE_EPSILON` is fixed at `1e-12`. It absorbs only machine-scale differences in distance evaluation; callers cannot configure it.

Selection follows this frozen sequence:

1. Find the true minimum CIEDE2000 distance across all candidates.
2. Form the tie set containing distances no greater than `minimum + 1e-12`.
3. Select lower `sortOrder`.
4. If still tied, select binary ascending uppercase-normalized `displayCode`.
5. If still tied, select binary ascending uppercase-normalized `referenceCode`.

Finding the minimum before selecting among the tie set makes the result independent of input order and avoids non-transitive pairwise epsilon comparisons. Differences greater than epsilon always select the genuinely smaller distance.

Code comparison uses explicit `<` and `>` operations, never `localeCompare`, system locale, or timezone rules. Existing schemas already normalize permitted codes to uppercase ASCII-compatible characters.

## Error model

`ColorMatchingError` exposes one of:

- `INVALID_LAB_COLOR`
- `EMPTY_PALETTE`
- `NO_ELIGIBLE_PALETTE_COLORS`
- `INVALID_PALETTE_CANDIDATE`
- `NON_FINITE_COLOR_DISTANCE`

Errors use safe generic messages. They do not include the full palette, image data, customer file information, supplier identity, internal reference code, or commerce mapping. A non-finite internal result raises `NON_FINITE_COLOR_DISTANCE`; it never silently becomes zero.

## Internal and public presentation boundary

Matching deliberately returns an internal `PaletteColor`, which may contain provenance and internal reference fields required for audit and deterministic tie-breaking. It must not be serialized directly for customers.

The only future customer-facing chain is:

```text
matchNearestPaletteColor
-> PaletteMatchResult.color
-> toPublicPaletteColor
-> strict PublicPaletteColor
-> customer-visible consumer
```

The existing mapper remains the authority. It emits the fixed Poparooz brand and explicit display allowlist while excluding internal reference, source, product-handle, and variant fields. P1-A06 does not modify the mapper or add presentation fields to the matching result.

## P1-A07 and P1-A09 reuse boundary

P1-A07 is governed by [`POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md`](POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md). It reuses `deltaE2000` only to select a real input Medoid within each quantization box.

P1-A09 is governed by [`POPAROOZ_PATTERN_MATERIAL_AND_BOARD_CONTRACT.md`](POPAROOZ_PATTERN_MATERIAL_AND_BOARD_CONTRACT.md). It prepares one candidate set and calls `matchNearestPaletteColor` once for each explicit Quantized Color index, then merges winners by normalized reference key. It does not recalculate Palette Lab, duplicate CIEDE2000, broaden candidate eligibility, or expose match distance publicly.
