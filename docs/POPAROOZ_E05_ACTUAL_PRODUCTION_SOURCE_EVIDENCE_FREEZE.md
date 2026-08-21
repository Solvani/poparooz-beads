# Poparooz E05 Actual-Production Source Evidence Freeze

Stage: P3-A03-E05-PRE

Status: **ACTUAL-PRODUCTION RECOMMENDATION SOURCE EVIDENCE FROZEN**

## Scope

This stage freezes deterministic source evidence for a later independent
Recommendation Policy decision. It changes no production behavior and does not
select, prefer, or recommend a Color Set.

`THIS STAGE DOES NOT DEFINE RECOMMENDED BEAD SET POLICY.`

```text
E05-D02 MAY CALIBRATE ONLY AGAINST THE FROZEN
ACTUAL-PRODUCTION EVIDENCE FROM THIS STAGE.
```

## Production Identity

- Production HEAD: `23c0cef3644de26ff7c1d923394a64b7efb2743c`
- Pipeline: `production-baseline`
- Background Removal: `Background Removal v1 — Conservative`
- H03 freeze commit: `cff3569c11a0601635b951878c722337e9e3f0df`
- Sampling: production area-average
- Q02 status: closed; production baseline retained
- ProcessingPolicy: `poparooz-processing-policy / 1.1.0`
- BoardProfile: `poparooz-board-104 / 1.0.0`
- BoardProfile artifact SHA-256:
  `6c5b8ed7c707b595da13adaddc3bc5a723b3cb6c2bf1e64fa2307d298123093e`

H03 Architecture C, Q02 Dominant Sampling, and Q02 Perceptual Observed-Color
Sampling remain blocked and contributed no output to this evidence.

## Corpus Identity

- Corpus version: `1.0.0`
- Corpus manifest SHA-256:
  `94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e`
- Physical source inputs: `29`
- Logical cases: `24`
- Trusted pairs: `5`
- Production runs: `54`
- Successful runs: `54`
- Failed runs: `0`

Corpus images remain external and are not stored in this repository.

## Palette and Color Set Identity

- Runtime Palette artifact SHA-256:
  `86a742ed45b1dc06eb4e4cec64e6a4d35ece07b9ad11f7c01208909986337d70`
- Runtime Palette lock SHA-256:
  `36302e25510d8b46afdc6cbaceea06ca8905c9456d006bc70cc3164cf8e6a648`
- Color Set artifact SHA-256:
  `d3198bfd9a9507236946f5417354c7278b151d572bef7cd376fed5bbfa54b4d7`
- Color Set lock SHA-256:
  `fbad3ba0e2efcea0f1ac07e42b946e097778ca98904dc9e6433be55e4b3c1d79`
- Approved profiles: `24 / 48 / 72 / 120 / 168 / 221`

No Color Set membership changed. Profiles `96 / 144 / 192` are not part of
this evidence.

## Evidence Identity

- Evidence ID: `poparooz-e05-actual-production-evidence`
- Evidence schema version: `1.0.0`
- Evidence version: `1.0.0`
- Canonical evidence SHA-256:
  `1357999cf5eb9585da9315d5325f01131ea818383eb7dd9f86d12aea3ebdf1b8`
- Canonical JSON file SHA-256:
  `d2ab1b40cad9e97f605f57a77d9d03cb04481cf33cd1cfebfde5d7cf17b8974c`
- Summary file SHA-256:
  `58ad1fba3522d7ad2ae1c83e8008b5e6dfbdb85934c8499f1347d9bd1211e1bf`
- Frozen generator baseline canonical SHA-256:
  `925161a4d6298f03d4007089ce8bb2bbca261fc1cdd0a3a8cef21942ad0b6982`

The canonical evidence hash follows the existing scorecard convention: it
hashes the deterministic LF-serialized evidence object before the object's own
final hash field is attached. The complete JSON file therefore has a separate
file SHA-256.

Repeated canonical generation produced byte-identical JSON. The human-readable
summary is generated deterministically and formatted separately from the
canonical evidence identity.

## Hard Gates

- Passed: `756`
- Failed: `0`
- Existing frozen-scorecard overlap: exact match across all `54` runs
- Pattern position reconciliation: passed
- Pattern bead-count reconciliation: passed
- Pattern code uniqueness and Runtime Palette validity: passed
- Six-profile identity and weighted-pixel reconciliation: passed
- Required 221-profile coverage: passed
- Candidate diagnostic exclusion: passed

Each run freezes the actual final `PublicPatternResult` color codes and bead
counts. No code list was reconstructed from an experimental intermediate.

## Required Bead Set

```text
Required Bead Set =
smallest approved profile providing 100% coverage
of final production Pattern codes.

Recommended Bead Set =
deferred to independent deterministic Recommendation Policy.
```

| Required profile | Runs |
| ---------------: | ---: |
|               24 |    0 |
|               48 |    0 |
|               72 |    0 |
|              120 |    0 |
|              168 |   13 |
|              221 |   41 |

The distribution reconciles to `54` runs. Every run records coverage and
sorted missing production codes for all six profiles. The selected Required
profile is the first complete profile in approved ascending order.

Current implementation naming in
`src/features/results/recommended-color-set.ts` is semantic debt. For this
evidence, smallest full coverage is **Required Bead Set**. Recommended Bead Set
remains undefined until E05-D02.

## Whole-Corpus Profile Measurements

All values below are aggregates of run-level metrics. `P95 of run mean` is a
percentile across 54 run-level weighted means; it is not an all-pixel corpus
P95. Exact unrounded values remain authoritative in the canonical JSON.

| Profile | Mean run mean dE00 | Median run mean dE00 | P95 of run mean dE00 | Mean run P95 dE00 | Worst run P95 dE00 | Worst maximum dE00 | Mean used colors | Min | Max |
| ------: | -----------------: | -------------------: | -------------------: | ----------------: | -----------------: | -----------------: | ---------------: | --: | --: |
|      24 |           7.420961 |             7.382128 |            15.416902 |         14.335793 |          24.087991 |          26.298207 |         7.074074 |   1 |  13 |
|      48 |           6.674517 |             6.897530 |            12.774219 |         12.897899 |          21.152404 |          23.420272 |         8.370370 |   1 |  15 |
|      72 |           6.556696 |             6.807780 |            12.500408 |         12.599495 |          21.152404 |          23.420272 |         9.462963 |   1 |  17 |
|     120 |           5.441905 |             5.893426 |            10.187043 |         10.213448 |          17.893922 |          17.893922 |        11.629630 |   2 |  19 |
|     168 |           4.496098 |             4.495916 |             9.351416 |          9.175286 |          15.729907 |          16.285084 |        12.574074 |   3 |  22 |
|     221 |           4.073470 |             4.068080 |             7.102317 |          8.451649 |          13.879324 |          15.187638 |        13.888889 |   3 |  22 |

These measurements are evidence inputs only. They do not establish a policy
threshold or state that any profile is preferable.

## Adjacent Profile Transitions

The sign convention is `smaller profile metric - larger profile metric`, so a
positive dE00 value means the larger profile reduced that measured error.
Used-color change is `larger - smaller`.

| Transition | Mean dE00 improvement | P95 dE00 improvement | Maximum dE00 improvement | Mean used-color change |
| ---------- | --------------------: | -------------------: | -----------------------: | ---------------------: |
| 24 -> 48   |              0.746444 |             1.437894 |                 2.196691 |               1.296296 |
| 48 -> 72   |              0.117821 |             0.298405 |                 0.510344 |               1.092593 |
| 72 -> 120  |              1.114791 |             2.386047 |                 2.281957 |               2.166667 |
| 120 -> 168 |              0.945807 |             1.038161 |                 0.832067 |               0.944444 |
| 168 -> 221 |              0.422628 |             0.723637 |                 0.661925 |               1.314815 |

No transition is classified as sufficient, insufficient, worthwhile, or not
worthwhile in this stage.

## Trusted Pairs

The five trusted pairs contribute `20` of the existing `54` production runs:

- Golden Retriever: 4
- Pale Teddy Bear: 4
- Poparooz Logo: 4
- Sweater Portrait: 4
- White Pump Bottle: 4

Trusted transparent inputs remain occupancy references. They were not promoted
to additional independent production runs, and the run contract remains 54.

## Known Limitations

- The evidence evaluates Palette matching loss after one shared production
  quantization. It is not a complete measure of photographic reconstruction
  fidelity or customer preference.
- The corpus contains the frozen 24 logical cases and four supported Pattern
  sizes; conclusions must not be generalized beyond that evidence without new
  evaluation.
- Maximum Colors is fixed at the production evidence setting of `32` for all
  54 runs.
- Aggregate means weight runs equally. Metrics explicitly named as run-level
  percentiles are not pixel-level corpus percentiles.
- Required Set coverage is deterministic availability coverage only. It does
  not measure whether a smaller incomplete set would appear acceptable.
- No price, inventory, sales, marketing, image-class, or subjective quality
  label is present.

## E05-D02 Boundary

E05-D02 may inspect these frozen measurements to define a separate,
deterministic Recommendation Policy. It may not replace the production input
path with blocked H03/Q02 candidates or reinterpret Required Set coverage as a
Recommendation decision.

This freeze does not authorize UI changes, automatic selection behavior,
thresholds, scoring, commerce logic, Palette changes, Color Set membership
changes, or production generator changes.
