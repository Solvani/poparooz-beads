# P3-A03-Q02 Sampling Exploration Closure

## Status

**CURRENT PRODUCTION SAMPLING RETAINED — CLOSE Q02 SAMPLING EXPLORATION**

Q02 sampling exploration is closed. Production behavior remains unchanged, and
the current area-average sampling remains the production baseline.

## Q02 Question

Q02 investigated why generation can contain visually unnecessary near-colors or
small fragmented color components, and whether downscaled target RGB selection
could be changed without compromising structural and perceptual quality.

The decision question was not whether another algorithm could be imagined. It
was whether the authoritative Golden Corpus evidence supported replacing the
current production sampling behavior with either evaluated candidate.

## A01 Root-Cause Finding

A01 identified production area-average downsampling as the primary source of
synthetic or interpolation-derived intermediate RGB values. The Quantizer was
classified as a secondary amplifier because it receives the already-expanded
color population. The Matcher was classified as likely not causal.

This finding identified where synthetic RGB values enter the pipeline. It did
not establish that every intermediate RGB is a production-quality defect or
that an exact observed-source RGB strategy would be safer.

## Production Area-Average Baseline

The production baseline uses deterministic alpha-aware area averaging when
downscaling. Its known weakness is that color boundaries, antialiasing, and
gradients can produce intermediate RGB values that were not present as exact
source pixels. Some can survive quantization and map to additional Pattern
codes.

Across the evaluated alternatives, the baseline nevertheless provided the most
stable overall balance for fine lines, facial features, portraits, pet and fur
structure, gradients, high-saturation scenes, and large 104-size Patterns. Its
known intermediate-RGB weakness does not outweigh the demonstrated structural
and spatial risks of A02 and A03.

## A02 Dominant Sampling Result

**DOMINANT SAMPLING BLOCKED — DO NOT ACTIVATE**

A02 selected an exact observed source RGB by contribution dominance. It reduced
aggregate color complexity:

- Final Pattern code delta: `-87`
- Quantized representative delta: `-140`
- Quantizer-cap frequency: `54 → 48`
- Singleton-component delta: `-1,088`
- Total-component delta: `-1,432`

Those reductions were accompanied by critical regressions: Thin Botanical lost
most line structure, Golden Retriever fragmented, Sweater Portrait developed
stippling, Teddy became noisier, and Saturated Landscape transitions became
harsher. Aggregate color reduction was therefore not production-quality
improvement.

A02 canonical evidence SHA-256:

`f0b013b0e7c0474300801c002a89207ee8baaeee78faddbfe6fe75f06057c46e`

## A03 Perceptual Observed-Color Sampling Result

**PERCEPTUAL OBSERVED-COLOR SAMPLING BLOCKED — DO NOT ACTIVATE**

A03 retained the production area-average RGB as its perceptual reference but
selected the nearest actually observed source-footprint RGB by CIEDE2000. It
preserved much of the fine-line, facial, fur, portrait-gradient, and
continuous-tone structure lost by A02, but it did not solve the target problem:

- Final Pattern codes: `750 → 745`
- Quantized representatives: `1,728 → 1,728`
- Quantizer-cap frequency: `54/54 → 54/54`
- Singleton-component delta: `+390`
- Total-component delta: `+398`
- Changed Pattern positions: `23,179`

At size 104, singleton components increased by `538`, total components
increased by `524`, and `14,096` Pattern positions changed. Flat regions and
pet/fur cases developed new spatial fragmentation.

A03 canonical evidence SHA-256:

`30df2c3f6e1d57183ee8179434afc7d6f5c8c48051458dd7d1bab6642dd13ff0`

## Why Root Cause Does Not Automatically Require Replacement

Two separate propositions must not be conflated:

1. Area averaging is an identified source of synthetic intermediate RGB.
2. A replacement has demonstrated safer overall production quality.

A01 established the first proposition. A02 and A03 did not establish the
second. A02 reduced colors by discarding structurally important minority
information. A03 preserved more structure but retained the quantizer-cap
problem and introduced additional fragmentation.

Keeping the baseline is therefore a comparative risk decision, not a claim
that area averaging is theoretically ideal or free of known weaknesses.

## Final Sampling Decision

**CURRENT PRODUCTION SAMPLING RETAINED — CLOSE Q02 SAMPLING EXPLORATION**

- Current area-average sampling remains the production baseline.
- Production behavior remains unchanged.
- A02 and A03 must not be activated.
- A02 and A03 must not be incrementally “rescued.”
- Threshold, clustering, BFS, small-region consolidation, or adaptive-mode
  cleanup must not be added as a continuation of A02 or A03.
- Q02 sampling candidate exploration is closed.

## Conditions Required To Reopen Sampling R&D

Sampling R&D may reopen only for a mechanism-level new hypothesis, not another
parameter adjustment or compound cleanup applied to A02 or A03.

Any reopened stage must:

- be an independent R&D and evaluation stage;
- state the distinct mechanism and causal hypothesis in advance;
- use the authoritative Golden Corpus and current production baseline;
- preserve occupancy, alpha, no-upscale, and browser-local privacy semantics;
- evaluate aggregate color purity and structural preservation together;
- protect fine lines, eyes, noses, outlines, facial details, fur, gradients,
  narrow transitions, flat regions, and fringe colors;
- avoid treating fewer colors or components as sufficient proof of quality; and
- demonstrate no critical Golden Corpus regressions before any production
  consideration.

## E05 Impact

P3-A03-E05-D02 may resume using actual production behavior.

Blocked A02/A03 evidence must not be used to refresh or freeze E05
Recommendation Policy evidence.

Recommended Bead Set and Required Bead Set remain separate.

Any future material production color-pipeline change would require an explicit
decision on whether E05 evidence must be refreshed. No such production change
is authorized by this closure.

## Production Impact

- Production behavior remains unchanged.
- Current area-average sampling remains active as the production baseline.
- A02 is not activated.
- A03 is not activated.
- Quantizer, Matcher, Runtime Palette, Color Sets, ProcessingPolicy,
  BoardProfile, Background Removal, UI, Shopify, and Download behavior remain
  unchanged.

## Git Baseline

- Branch: `main`
- HEAD: `ed081e7518dc8071306f56d8aedeb86a715c07fe`
- `origin/main`: `ed081e7518dc8071306f56d8aedeb86a715c07fe`
- Ahead / behind: `0 / 0`
- A02 closure commit: `043523edc0200236310596fa9b4957033586c886`
- A03 closure commit: `ed081e7518dc8071306f56d8aedeb86a715c07fe`

**CURRENT PRODUCTION SAMPLING RETAINED — CLOSE Q02 SAMPLING EXPLORATION**
