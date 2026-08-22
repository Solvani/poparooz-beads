# P3-A03-E05-D04-A02 Review Preparation

## Status

This record covers **A02-A — Review Preparation + Structural Evidence** only.
It does not claim that independent human review, reviewer agreement, predictor
calibration, or held-out validation is complete.

**HUMAN REVIEW INPUT REQUIRED**

Production Generation Color Set Recommendation remains **NOT ACTIVATED**.
Production generation, Required, Refill, Email, Download, and Shopify behavior
remain unchanged.

## Evidence identity

- Source Git commit: `4566c73c30f5b700e580004c2d4a1580fd0eacef`
- Production behavior baseline: `9b411803afb26d618abe94f411b1bb342099fb14`
- Corpus manifest SHA-256:
  `94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e`
- D04-A01 canonical evidence SHA-256:
  `1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89`
- D04-A02 structural evidence canonical SHA-256:
  `e47533d6a96fe244c188d71f173afae57617b2e1ada0a3ea6358c60e74a35a5c`
- Blind-review packet-set SHA-256:
  `1feeedeb9b04cd407526f40dd25c04a351c1389a20df6538eb8789b4027f15d7`

The A02 replay reproduced all 612 frozen A01 Pattern matrix identities across
102 runs. Structural metrics therefore describe the same production Pattern
outputs already frozen by A01; no alternate generation algorithm is involved.

## Blind review design

The deterministic sample contains 60 adjacent-profile comparisons per reviewer.
It covers all 24 logical cases, calibration and validation cases, Pattern Sizes
40/60/80/104, Maximum Colors 16/32/64, and all corpus categories. It includes
all 19 A01 model-reviewed meaningful regressions, plus 12 model-reviewed
meaningful improvements and 9 model-reviewed no-meaningful-difference cases.
Remaining slots provide logical-case coverage and metric-extreme coverage.

The A01 model review is used only for stratification. It is not human ground
truth. The same anonymous packet set must be completed independently by at least
two real reviewers. Left/right placement is deterministic but pseudorandomized.
The reviewer page does not disclose profile size, logical case, category,
filename, transition direction, or recommendation. The reveal key is stored only
under ignored local `.quality-output/e05-d04-a02/private/` artifacts and must not
enter Git history.

## Reviewer procedure

Open
`data-source/quality/generator-e05-d04-a02/1.0.0/poparooz-d04-a02-blind-review.html`
locally in a browser. No server or command is required.

1. Reviewer 1 enters `reviewer-1`, completes all 60 comparisons without
   consulting another reviewer, locks the session, and downloads the JSON result.
2. Reviewer 2 independently opens the same page, enters `reviewer-2`, completes
   all 60 comparisons, locks the session, and downloads a separate JSON result.
3. Return both original JSON files without editing or renaming their contents.

The fixed question is: “Which pattern looks better as a usable fuse-bead
pattern?” Choices are A clearly better, A slightly better, No meaningful
difference, B slightly better, B clearly better, and Cannot judge.

Reviewers consider overall fidelity, important-feature readability, edge/detail
preservation, clean bead regions, useful color information, and distracting
fragmentation. They do not consider profile size, package price, inventory,
commercial benefit, or assume that either side should be better.

Progress is stored only in that browser's local storage. Locking records the
completion timestamp and session identity and enables export of a result with a
SHA-256 digest. Reveal occurs only after locked result files are received.
Re-running a review requires a new reviewer/session identity; an original result
must not be overwritten.

## Structural feature set

The evaluation-only feature set is deterministic and explainable:

- connected components per color, total components, singleton components, and
  2–3-cell micro-components;
- occupied-cell percentage belonging to components of four cells or fewer;
- color-boundary edge count and normalized boundary length;
- 3×3 local distinct-color switching and high-switch-cell percentage;
- thin-cell count and same-color cardinal continuity;
- dominant-color area, component count, and largest-component coverage; and
- additional used colors and mean ΔE00 gain per additional color.

Across 612 profiles, the observed min/median/P95/max sanity ranges were:

| Feature                             |    Min | Median |     P95 |     Max |
| ----------------------------------- | -----: | -----: | ------: | ------: |
| Total color components              |      1 |    363 |   1,288 |   3,058 |
| Singleton components                |      0 |    215 |     756 |   1,853 |
| Small-region cells (%)              |      0 | 6.2408 | 30.8750 | 63.2546 |
| Normalized boundary length          |      0 | 0.1654 |  0.4528 |  0.6860 |
| Mean local color switches           |      0 | 0.6655 |  2.0661 |  3.2651 |
| Thin same-color continuity          | 0.1667 |      1 |       1 |       1 |
| Dominant largest-component coverage | 0.1141 | 0.8948 |       1 |       1 |

All compared profiles retained identical occupancy because they were assembled
from one frozen production intermediate per run. Structural evaluation covered
510 adjacent transitions. These distributions are descriptive evidence, not
policy thresholds.

## Performance boundary

Structural metrics are offline evaluation tooling and have no production runtime
budget. On the recorded Node replay, six-profile structural evaluation per run
had median/P95/max times of 24.007/39.443/105.651 ms. The boundary and 3×3 local
switch scan was the most expensive measured stage at P95 and maximum
(24.080/89.706 ms); connected-component traversal was the other material stage
(11.214/12.211/20.977 ms). These timing values are environment-dependent and are
kept outside canonical evidence.

The feature computation is linear in Pattern cells and cardinal/local-neighborhood
edges for fixed neighborhood size. Per-color connected-component traversal also
visits each occupied cell and cardinal edge a bounded number of times.

## Calibration and validation boundary

A02 reuses A01's frozen case-level split: every run for one logical case remains
entirely in calibration or entirely in validation. Human packet sampling does not
move a case across that boundary. Predictor selection, thresholds, and fitting
must use calibration cases only; final claims must be evaluated on held-out
validation cases after the human results are locked and revealed.

## A02-B analysis boundary

After authentic result files arrive, A02-B may validate each result hash and
packet-set identity, reveal packet identities, measure raw/directional agreement
and an appropriate ordinal agreement statistic, and classify disagreements. It
may then compare human direction with ΔE00 and structural features on calibration,
followed by held-out validation.

Evaluation must separately report false-small, false-large, and the highest-risk
visual-regression recommendation. A small deterministic predictor is preferred;
no black-box model or semantic image class may become production policy input.
Without real reviewer files, no agreement or human-grounded predictor result
exists.

## Privacy and governance

The reviewer artifact embeds only the already authorized corpus-derived Pattern
images and runs entirely locally. It uploads nothing, calls no cloud vision API,
and introduces no production network or image-processing dependency. The reveal
key and original reviewer exports are local private evaluation artifacts, excluded
from Git, and must not be shown before reviewers lock their answers.

Reviewer result files and their result SHA-256 values do not exist yet and are
not included in this preparation evidence. Reviewer session IDs will be recorded
only from authentic exported result files.
