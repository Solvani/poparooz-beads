# P3-A03-E05-D04-A01 — Six-Profile Generation Color Set Recommendation Evaluation

## Preflight

- Branch: `main`
- Authorized production HEAD and `origin/main`: `9b411803afb26d618abe94f411b1bb342099fb14`
- Initial ahead/behind: `0 / 0`
- Initial worktree, staged, and untracked state: clean / none / none
- Authoritative corpus: `D:\Projects\poparooz-quality-corpus\1.0.0`
- Manifest SHA-256: `94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e`

## Approved Evaluation Scope

This is evaluation-only evidence for the formal Generation Color Set profiles
24, 48, 72, 120, 168, and 221. The evaluator performs the frozen production
source preparation and quantization once per run, then constructs all six
profile-specific Patterns. No recommendation is activated in production.

## Evaluator Parity Results

All 612 reconstructed Pattern outputs matched a production generation-service
oracle: `612 / 612`. The gate compared dimensions, occupancy, transparent
positions, bead count, used colors, the final code at every occupied cell, and
the Pattern Matrix hash. The single-preparation and exact-six-profile gates also
passed.

## Corpus / Settings Matrix

- 29 physical PNGs, 24 logical cases, and 5 trusted opaque/transparent pairs.
- Existing Maximum Colors 32 coverage: 54 runs.
- Lower Maximum Colors 16: one 104-size run per logical case, 24 runs.
- Upper production-supported Maximum Colors 64: one 104-size run per logical
  case, 24 runs.
- Total: 102 runs and 612 profile evaluations.
- The lower and upper settings exercise sensitivity without duplicating every
  Pattern Size combination.

## Six-Profile Pattern Evidence

Whole-matrix descriptive averages across the 102 runs are:

| Profile | Avg used colors | Avg mean ΔE00 | Avg P95 ΔE00 | Corpus max ΔE00 |
| ------: | --------------: | ------------: | -----------: | --------------: |
|      24 |            6.96 |        6.9723 |      13.9145 |         26.9979 |
|      48 |            8.25 |        6.3007 |      12.7187 |         23.4203 |
|      72 |            9.44 |        6.1683 |      12.3275 |         23.4203 |
|     120 |           11.63 |        5.1277 |       9.8900 |         19.7166 |
|     168 |           12.69 |        4.2603 |       8.8001 |         17.6090 |
|     221 |           13.98 |        3.8926 |       8.1807 |         15.1876 |

These are descriptive corpus averages, not recommendation thresholds.

## Spatial Change Evidence

Adjacent transitions across all runs:

| Transition | Zero-change runs | Changed cells | Avg changed % | Regions | Singletons |
| ---------- | ---------------: | ------------: | ------------: | ------: | ---------: |
| 24→48      |               33 |       136,344 |        18.766 |   5,361 |      2,787 |
| 48→72      |               12 |        53,444 |         5.884 |   5,841 |      3,270 |
| 72→120     |               10 |       228,220 |        32.181 |   7,214 |      4,067 |
| 120→168    |                1 |       189,252 |        31.375 |   5,470 |      2,981 |
| 168→221    |               18 |        91,297 |        11.145 |   7,197 |      4,040 |

Relative to 221, the average changed-cell percentage was 57.872% for 24,
56.175% for 48, 53.429% for 72, 40.435% for 120, and 11.145% for 168.

## Visual Artifact Inventory

- 36 deterministic six-profile comparison PNGs under
  `.quality-output/e05-d04-a01/six-profile-visuals/`.
- 24 anonymous adjacent-comparison packets under
  `.quality-output/e05-d04-a01/blind-review/`.
- The permanent reveal key records packet/run identity, randomized left/right
  placement, artifact SHA-256, and profile transition.
- Visuals are noncommitted evaluation outputs and do not alter production
  rendering or export.

## Human Review Method

The rubric was fixed before reveal. Each anonymous row asked whether either side
was visibly meaningfully better, considering fidelity, detail and edges,
flat-region cleanliness, face/fur readability, and fragmentation. Profile size,
filename, and price were hidden.

No independent human reviewer was available in this execution. The recorded
pass is therefore explicitly a blind controlled **model visual review**, not a
human review. It is useful diagnostic evidence but cannot satisfy the human
review requirement for a customer-facing policy freeze.

## Human Review Results

After reveal, the 120 anonymous adjacent comparisons contained:

- larger profile meaningfully better: 29;
- larger profile meaningfully worse: 19;
- no meaningful difference: 72.

By transition, better / worse / not meaningful was: 24→48 `10 / 1 / 13`,
48→72 `5 / 2 / 17`, 72→120 `5 / 11 / 8`, 120→168 `6 / 3 / 15`, and
168→221 `3 / 2 / 19`.

## Metric ↔ Visual Correlation Findings

The larger-better group averaged a 1.4301 mean-ΔE00 gain and 2.3542 P95 gain.
The larger-worse group averaged a similar 1.4705 mean gain and a larger 2.6633
P95 gain. The no-meaningful-difference group averaged 0.3082 and 0.4017.

Fact: mean/P95 gains help identify many low-change comparisons. Fact: they did
not separate beneficial large changes from visually regressive large changes in
this review. Interpretation: a scalar loss tolerance is not yet a reliable
proxy for the direction of visible quality.

## Calibration / Validation Method

Logical cases were assigned before review by a deterministic SHA-256 rule; all
settings for a logical case stayed together. Calibration contains 15 cases and
validation 9 cases. The reviewed subset contains 75 calibration and 45
validation adjacent pairs.

An analysis-only separability probe exhaustively considered thresholds drawn
from observed calibration mean/P95 gains. Its best calibration rule still made
10 errors in 75 pairs. Without retuning, it made 9 errors in 45 validation pairs
(20%). This probe is not an approved tolerance.

## Candidate Policy Results

- A, relative-to-221 guard: not supported. No tolerance has independent human
  support, and metric improvement does not identify visual direction.
- B, quality plateau: not supported. Visible quality was non-monotonic despite
  the formally nested Color Sets.
- C, relative-to-221 plus adjacent safeguard: not supported. The adjacent
  safeguard cannot distinguish improvements from regressions with current
  metrics.

No threshold was invented or frozen.

## False-Small Recommendation Cases

The illustrative calibration-derived rule missed a model-reviewed meaningful
larger-profile improvement on five held-out comparisons:

- Pale Teddy, max 32, 24→48;
- Sweater Portrait, max 64, 24→48;
- Pump Bottle, max 16, 72→120;
- Pump Bottle, max 32, 72→120;
- Pump Bottle, max 64, 72→120.

## False-Large Recommendation Cases

The same rule selected a held-out larger profile for four comparisons judged
visibly regressive:

- Sweater Portrait, max 16, 72→120;
- Sweater Portrait, max 32, 72→120;
- Sweater Portrait, max 64, 72→120;
- Pump Bottle, max 16, 120→168.

## Maximum Colors Sensitivity

Across adjacent comparisons, average changed-cell percentage was 18.143% at
Maximum Colors 16, 21.621% at 32, and 17.658% at 64. The review found both
improvements and regressions across settings; the Sweater Portrait 72→120
false-large case reproduced at 16, 32, and 64. A policy calibrated only at 32 is
therefore not demonstrated to generalize safely.

## Runtime Performance Evidence

The 102-run Node replay (not browser evidence) recorded medians of 77.164 ms for
the frozen heavy path, 42.292 ms for six-profile evaluation, and 125.468 ms
integrated. P95 values were 132.119 ms and 80.053 ms respectively.

A Chromium 151 desktop main-thread benchmark on a deterministic 104×104 RGBA
fixture recorded medians of 68.4 ms for quantization plus 221 assembly, 34.55 ms
for additional six-profile evaluation/assembly, and 97.0 ms integrated across
12 measured iterations after 3 warmups. This benchmark excludes decode,
Background Removal, Worker scheduling, rendering, and device I/O.

The architecture reuses one quantization and does not duplicate the heavy image
path. Real mobile-browser timing was unavailable; desktop timing is not claimed
as mobile evidence.

## Recommended Policy Direction

Do not freeze or activate a Generation Color Set recommendation policy in this
stage. Retain the independent Current Generation, Recommended for Your Image,
and Minimum Required for Current Pattern semantics. The next evidence stage
should obtain independent human pairwise judgments and test additional spatial
or structure-aware predictors before reconsidering policy candidates.

## Remaining Evidence Gaps

- No independent human review or inter-reviewer agreement.
- No real mobile-device browser timing.
- Only 12 logical cases appear in the critical blind visual packets, although
  all 24 cases are present in deterministic matrix evidence.
- Current mean/P95 and changed-cell metrics do not explain why some closer
  mappings are visually regressive.
- No approved stale-recommendation identity or runtime integration is created;
  those remain future-stage concerns.

## File / Artifact Scope

Permanent evidence is under
`data-source/quality/generator-e05-d04-evidence/1.0.0/`. Evaluation tooling and
tests are under `scripts/quality/generator/`. Noncommitted PNGs and raw timing
output are under `.quality-output/e05-d04-a01/`. No `src/**`, package, lock,
corpus image, frozen D02 evidence, or production artifact is modified.

## Tests / Static Gates

The authoritative write and deterministic verify replays both completed with
102 runs, 612/612 parity, 36 visual artifacts, 24 blind packets, and canonical
evidence SHA-256
`1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89`.
Focused evaluator, preview, and replay tests plus TypeScript are required before
commit review. The full production suite is not required because production
source is unchanged.

## Git State

This evaluation remains uncommitted and unpushed. Production behavior is
unchanged and no recommendation is active.

GENERATION RECOMMENDATION EVIDENCE INSUFFICIENT — MORE EVALUATION REQUIRED
