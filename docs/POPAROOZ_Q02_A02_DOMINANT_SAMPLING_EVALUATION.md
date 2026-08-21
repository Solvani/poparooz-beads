# P3-A03-Q02-A02 — Dominant Sampling Evaluation

## Decision

- **Stage:** P3-A03-Q02-A02
- **Candidate:** Deterministic Dominant Cell RGB Sampling
- **Production activation:** None
- **Final verdict:** **DOMINANT SAMPLING BLOCKED — DO NOT ACTIVATE**
- **Authoritative starting baseline:** `cff3569c11a0601635b951878c722337e9e3f0df`

Production behavior is unchanged. Deterministic Dominant Cell RGB Sampling must
not replace production area-average sampling.

## Authoritative Evaluation Evidence

The evaluation used the authoritative Golden Corpus:

- Manifest SHA-256:
  `94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e`
- 29 physical PNGs
- 24 logical cases
- 5 trusted pairs
- 54 evaluation runs

Candidate evidence SHA-256:
`f0b013b0e7c0474300801c002a89207ee8baaeee78faddbfe6fe75f06057c46e`.

All candidate hard-invariance gates passed:

- bead-count delta was zero for every run;
- transparent-position delta was zero;
- occupied coordinates were identical;
- alpha mismatch count was zero;
- frozen core behavior and artifacts were unchanged; and
- deterministic replay passed.

Whole-corpus diagnostics were:

- final Pattern colors: `-87`;
- quantized representatives: `-140`;
- quantizer-cap runs: `54 → 48`;
- singleton components: `-1,088`;
- 2-cell components: `-356`;
- 3–4-cell components: `+50`;
- total color components: `-1,432`; and
- changed Pattern positions: `77,650`.

Aggregate reductions are not sufficient evidence of improvement.

## Findings

Positive examples included:

- Poparooz Logo: `19 → 9` colors;
- Green Leaf: `7 → 2` colors; and
- Dinosaur: `22 → 18` colors.

Critical regressions included:

- **Thin Botanical:** most botanical line structure disappeared;
- **Golden Retriever:** substantially more singleton and fragmented colors;
- **Sweater Portrait:** visibly increased stippling and fragmentation;
- **Teddy:** sharper, noisier color behavior; and
- **Saturated Landscape:** more fragmented and harsher transitions.

Exact-RGB dominant sampling is effective for some flat graphics but unstable
for continuous-tone photographs, portraits, pet/fur subjects, gradients, and
pale or fine lines.

## Root Cause and Candidate Closure

The Q02 root-cause conclusion remains valid: area averaging can create
interpolation-derived intermediate RGB values. This evaluation establishes that
replacing area averaging with exact-RGB dominance is not production-safe.

Do not combine this blocked candidate with region consolidation merely to
rescue it. Such a combination would prevent independent causal attribution.

## Future Direction

The next candidate direction is **P3-A03-Q02-A03 Perceptual Observed-Color
Sampling**:

> Retain the current area-average target as the perceptual reference, but choose
> a real observed source-region color perceptually closest to that target rather
> than using an exact-RGB dominant mode.

This future candidate is not approved by this document. It requires an
independent evaluation stage.

## Frozen Boundaries

- Background Removal v1 — Conservative remains frozen.
- Production normalization, quantization, Matcher, Runtime Palette, Color Sets,
  Pattern identity, and customer behavior remain unchanged.
- The authoritative Golden Corpus and quality baseline remain unchanged.
- E05 Recommendation Policy remains deferred until generation-color behavior
  is frozen.
