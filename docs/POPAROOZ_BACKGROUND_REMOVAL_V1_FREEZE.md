# Background Removal v1 — Conservative Freeze

Stage: P3-A03-H03-F01

Status: Frozen

## Production Baseline

The current production background-removal behavior is accepted as
**Background Removal v1 — Conservative**. It prioritizes foreground
preservation over aggressive background removal.

No semantic segmentation model is activated in production. Production
generator semantics outside the existing background-removal path remain
frozen and unchanged by this governance stage.

## Rejected and Unevaluated Candidates

H03-D02 Architecture C remains:

`CANDIDATE BLOCKED — DO NOT ACTIVATE`

Its authoritative Golden Corpus result was:

- false-background occupied-position delta: `-11`;
- lost-subject-position delta: `+71`; and
- total disagreement delta: `+60`.

Do not reopen H03-D02 threshold tuning or perform one-image threshold tuning.

U2NetP was not evaluated because authoritative checkpoint and redistribution
provenance was insufficient.

BiRefNet-lite was not quality-evaluated. Its official provenance was
substantially verified, but the semantic-model route was intentionally not
pursued further in H03 v1.

## Known v1 Limitations

- Complex portrait backgrounds may remain partially retained.
- Complex pet or fur backgrounds may remain partially retained.
- Some pale or light backgrounds may leave residual fringe.
- Trustworthy explicit-alpha source images remain the preferred
  high-confidence transparent-input path.

These limitations are accepted for v1. Lower retained background alone does
not justify foreground loss.

## Future Background Removal v2

Any future Background Removal v2 must:

- be authorized and conducted as an independent R&D stage;
- use the authoritative Golden Corpus;
- compare the candidate against Background Removal v1;
- demonstrate aggregate improvement;
- avoid critical foreground regressions; and
- preserve browser-local image privacy unless a separate product and
  architecture decision explicitly approves otherwise.

This freeze does not authorize a semantic model, a production dependency,
server-side image processing, threshold retuning, or any change to the frozen
normalization, occupancy, quantization, Matcher, Pattern, Worker, or customer
UI semantics.
