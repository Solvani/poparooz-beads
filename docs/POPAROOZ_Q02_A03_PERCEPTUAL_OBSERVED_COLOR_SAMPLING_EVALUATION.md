# P3-A03-Q02-A03 Perceptual Observed-Color Sampling Evaluation

## Status

This was an evaluation-only, single-variable candidate. It changed only the
downscaled target RGB selection used by the quality replay. Production behavior
was not changed or activated. Quantizer, Matcher, occupancy, alpha, cleanup,
no-upscale, and all other production semantics remained unchanged.

Final verdict:

**PERCEPTUAL OBSERVED-COLOR SAMPLING BLOCKED — DO NOT ACTIVATE**

## Preflight

- Branch: `main`
- HEAD: `043523edc0200236310596fa9b4957033586c886`
- `origin/main`: `043523edc0200236310596fa9b4957033586c886`
- Ahead / behind: `0 / 0`
- Initial worktree: clean
- Initial staged files: none
- Initial untracked files: none

## Candidate Definition

The candidate selected one actually observed RGB from each downscaled source
footprint. Its reference RGB came directly from the production
`resizeRgbaImage` area-average calculation path, not from a parallel or
approximate implementation.

- Candidate RGBs came only from the same source footprint.
- Alpha-zero hidden RGB values were excluded.
- Source contribution remained spatial overlap multiplied by source alpha.
- CIEDE2000 selected the observed RGB nearest to the production reference RGB.
- Equal-distance candidates used greater contribution, then stable RGB ordering.
- No threshold, clustering, dominant voting, image-class behavior, adaptive
  mode, screenshot-specific tuning, or upscale behavior was introduced.
- Production area-resized alpha and frozen cleanup-mask semantics were retained.

## Corpus Integrity

- Authoritative corpus root: `D:\Projects\poparooz-quality-corpus\1.0.0`
- Manifest: `data-source/quality/generator-corpus/1.0.0/manifest.json`
- Manifest SHA-256:
  `94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e`
- Physical PNGs: 29
- Logical cases: 24
- Trusted opaque/transparent pairs: 5
- Evaluation runs: 54

No corpus image was copied, moved, recompressed, or replaced. The authoritative
manifest and baseline artifacts were unchanged.

## Hard Invariance Gates

All five aggregate gates passed:

- Corpus integrity: PASS
- Frozen core identity: PASS
- Baseline replay equality: PASS
- Occupancy invariance: PASS
- Deterministic replay: PASS

Across all 54 runs:

- Bead-count delta: 0
- Occupied coordinates: identical
- Transparent-position delta: 0
- Alpha mismatch count: 0

Each candidate run was replayed twice. Metrics, diagnostics, and Pattern matrix
outputs were deterministic.

## Whole-Corpus Results

Aggregate sums across 54 runs:

| Metric                    | Baseline | Candidate |  Delta |
| ------------------------- | -------: | --------: | -----: |
| Final Pattern code count  |      750 |       745 |     -5 |
| Quantized representatives |    1,728 |     1,728 |      0 |
| Quantizer-cap frequency   |    54/54 |     54/54 |      0 |
| Singleton components      |        — |         — |   +390 |
| 2-cell components         |        — |         — |     +8 |
| 3–4-cell components       |        — |         — |     +4 |
| Total components          |        — |         — |   +398 |
| Changed Pattern positions |        — |         — | 23,179 |

Official Color Set corpus means, shown as baseline to candidate:

| Set |      Used colors | Weighted mean ΔE00 |  Weighted P95 ΔE00 |       Maximum ΔE00 |
| --: | ---------------: | -----------------: | -----------------: | -----------------: |
|  24 |   7.074 to 6.907 |   7.4210 to 7.4312 | 14.3358 to 14.4822 | 18.1642 to 18.1440 |
|  48 |   8.370 to 8.333 |   6.6745 to 6.6945 | 12.8979 to 13.0610 | 15.9675 to 16.0714 |
|  72 |   9.463 to 9.370 |   6.5567 to 6.5715 | 12.5995 to 12.7491 | 15.4571 to 15.5361 |
| 120 | 11.630 to 11.500 |   5.4419 to 5.4556 | 10.2134 to 10.1899 | 13.1752 to 13.4246 |
| 168 | 12.574 to 12.278 |   4.4961 to 4.5093 |   9.1753 to 9.1612 | 12.3431 to 12.6144 |
| 221 | 13.889 to 13.796 |   4.0735 to 4.0729 |   8.4516 to 8.4709 | 11.6812 to 11.7189 |

The candidate did not reduce quantized representative count or quantizer-cap
frequency. A small final-code reduction did not offset increased fragmentation.

## Category Results

ΔE columns are candidate minus baseline for the 221 profile.

| Category                      |   Codes |   S1 |  S2 | S3–4 | Components | Changed | Mean / P95 / Max ΔE00       |
| ----------------------------- | ------: | ---: | --: | ---: | ---------: | ------: | --------------------------- |
| complex-photo                 |   72→73 |  -34 | -11 |  -27 |        -89 |   2,404 | -0.0002 / -0.2917 / -0.3914 |
| dark-subject-background       |   26→26 |  +17 |  -6 |   +4 |         +8 |     235 | -0.0234 / -0.0776 / +0.2170 |
| fine-line                     |   25→27 | +115 | +15 |  -13 |       +116 |     384 | -0.0050 / -0.0598 / -0.1970 |
| flat-illustration             |   74→73 |  +84 |  +8 |   +8 |       +113 |   3,253 | -0.0408 / -0.0507 / +0.2551 |
| high-saturation               |   85→80 |  +11 | -52 |   -2 |        -42 |   5,432 | -0.0019 / +0.5827 / +0.6447 |
| low-contrast                  |     6→6 |  -18 |  +3 |   +3 |        -12 |     537 | +0.0393 / 0 / +0.3354       |
| opaque-background-removal     |   78→71 |  -82 | +14 |  -12 |        -84 |   1,280 | +0.0234 / -0.3731 / -0.3713 |
| pale-subject-light-background |   66→69 |  +11 |  -3 |  -14 |          0 |     463 | +0.0028 / +0.1044 / +0.1153 |
| pet-fur                       |  99→103 | +240 |  +9 |  +26 |       +306 |   3,603 | +0.0600 / +0.0767 / +0.6069 |
| portrait                      | 161→155 |  -51 |  -6 |   +3 |        -85 |   4,675 | +0.0001 / +0.0775 / -0.4227 |
| simple-graphic                |   17→18 |  +27 |  +7 |   +6 |        +33 |     274 | -0.0229 / -0.0242 / -0.3165 |
| white-background-product      |   41→44 |  +70 | +30 |  +22 |       +134 |     639 | -0.0308 / +0.0947 / +0.1792 |

Every category retained a zero quantized-representative delta; no category
reduced quantizer-cap frequency.

## Pattern Size Results

ΔE columns are candidate minus baseline for the 221 profile.

| Size |   Codes |   S1 |  S2 | S3–4 | Components | Changed | Mean / P95 / Max ΔE00       |
| ---: | ------: | ---: | --: | ---: | ---------: | ------: | --------------------------- |
|   40 | 129→130 |  -33 |  +4 |  -27 |        -38 |   1,362 | +0.0716 / +0.2255 / +0.3385 |
|   60 | 139→131 |  -60 |   0 |  +10 |        -41 |   3,248 | +0.0078 / -0.4774 / -0.1585 |
|   80 | 143→140 |  -55 | -10 |   +4 |        -47 |   4,473 | -0.0556 / +0.2645 / -0.3148 |
|  104 | 339→344 | +538 | +14 |  +17 |       +524 |  14,096 | -0.0112 / +0.0381 / +0.1410 |

The 104-size result is an important blocking risk: singleton components
increased by 538, total components increased by 524, and 14,096 Pattern
positions changed despite no reduction in quantized representatives.

## Trusted-Pair Results

ΔE columns are candidate minus baseline for the 221 profile.

| Trusted pair      | Codes |   S1 |  S2 | S3–4 | Components | Changed | Mean / P95 / Max ΔE00       |
| ----------------- | ----: | ---: | --: | ---: | ---------: | ------: | --------------------------- |
| Golden Retriever  | 61→63 | +109 |  +6 |  +17 |       +166 |   1,468 | +0.0236 / +0.2294 / +0.4679 |
| Teddy             | 51→51 |   +1 |  -4 |  -13 |        -10 |     303 | -0.0001 / +0.1305 / +0.1236 |
| Poparooz Logo     | 78→71 |  -82 | +14 |  -12 |        -84 |   1,280 | +0.0234 / -0.3731 / -0.3713 |
| Sweater Portrait  | 67→66 |  -62 |  -4 |  -10 |        -92 |   1,589 | -0.0098 / -0.3879 / -0.8077 |
| White Pump Bottle | 22→23 |   -2 |  +3 |   -1 |         -1 |      62 | -0.0318 / +0.0510 / -0.0110 |

## Critical Visual Review

- Poparooz Logo: subject and outline remained recognizable; local color
  substitutions were visible.
- Green Leaf: outline was retained; isolated colors appeared in a flat region.
- Flat Dinosaur: eyes, mouth, and outline were retained, but visible green
  speckles appeared across the body.
- Pink Floral: gradients and subject detail were retained with local color-block
  changes.
- Thin Botanical: the A02 line-erasure regression was avoided, but fragmentation
  increased.
- Golden Retriever: eyes, nose, and fur structure were retained; quantitative
  fragmentation increased materially.
- Teddy: facial details and pale outline were retained with comparatively small
  changes.
- Pump Bottle: details remained close to baseline and changes were minimal.
- Sweater Portrait: face, hair, and sweater gradients were retained, avoiding the
  strong A02 stippling regression.
- Saturated Landscape: structure remained much closer to area-average than A02,
  but abrupt purple and blue-green transitions appeared.

## Fine-Detail Preservation

Thin Botanical remained visible rather than being nearly erased as in A02.
Eyes, noses, facial details, pale lines, and outlines remained recognizable.
However, fine-line singleton components increased by 115 and total components
increased by 116. Preserving visible detail did not demonstrate a reduction of
interpolation-induced near-colors.

## Photograph / Fur / Portrait Behavior

Photograph and portrait continuity remained substantially closer to the
area-average baseline than the blocked A02 result. Portrait avoided the broad
sweater stippling seen under dominant sampling, and landscape avoided A02's
coarse tonal steps.

Pet and fur evidence remained blocking:

- Pet-fur singleton components: +240
- Pet-fur total components: +306
- Golden Retriever singleton components: +109
- Golden Retriever total components: +166
- Golden Retriever weighted P95 ΔE00: +0.2294
- Golden Retriever maximum ΔE00: +0.4679

## Flat-Graphic Behavior

Logo showed some component consolidation, but Green Leaf and Flat Dinosaur
developed isolated colors in otherwise flat regions. Flat-illustration singleton
components increased by 84 and total components increased by 113. The visible
Dinosaur speckles were a direct flat-region regression.

## Comparison Against Blocked Dominant Sampling

Blocked Q02-A02 canonical evidence SHA-256:

`f0b013b0e7c0474300801c002a89207ee8baaeee78faddbfe6fe75f06057c46e`

Q02-A03 canonical evidence SHA-256:

`30df2c3f6e1d57183ee8179434afc7d6f5c8c48051458dd7d1bab6642dd13ff0`

| Metric                         | Blocked A02 |    A03 |
| ------------------------------ | ----------: | -----: |
| Final-code delta               |         -87 |     -5 |
| Quantized-representative delta |        -140 |      0 |
| Quantizer-cap frequency        |       54→48 |  54→54 |
| Singleton-component delta      |      -1,088 |   +390 |
| 2-cell-component delta         |        -356 |     +8 |
| 3–4-cell-component delta       |         +50 |     +4 |
| Total-component delta          |      -1,432 |   +398 |
| Changed Pattern positions      |      77,650 | 23,179 |

A03 avoided A02's destructive shape simplification but did not reduce quantized
near-colors and introduced additional spatial fragmentation. Refactoring the
shared footprint contribution implementation preserved the frozen A02 canonical
evidence SHA exactly.

## Risks

- Mapping a continuous area-average reference back to discrete observed samples
  can create isolated colors.
- The risk is concentrated at size 104 and in pet/fur, fine-line, flat-graphic,
  and white-background-product cases.
- Near-neutral aggregate ΔE changes do not compensate for spatial fragmentation.
- This blocked candidate must remain evaluation-only and must not be connected
  to a production activation path.
- Local `.quality-output/**` artifacts remain noncommitted supporting evidence.

## E05 Impact

P3-A03-E05-D02 remains deferred.

A03 must not refresh or freeze Recommendation Policy evidence.

Recommended Bead Set and Required Bead Set remain separate.

## Final Git Baseline

- Branch: `main`
- Evaluation baseline HEAD:
  `043523edc0200236310596fa9b4957033586c886`
- Evaluation baseline `origin/main`:
  `043523edc0200236310596fa9b4957033586c886`
- Evaluation baseline ahead / behind: `0 / 0`
- Production/shared code changed: no
- Production activation performed: no

## Verdict

**PERCEPTUAL OBSERVED-COLOR SAMPLING BLOCKED — DO NOT ACTIVATE**
