# P3-A03-E05-D04-A02-C2 Three-Reviewer Consensus and Predictor Evaluation

## Preflight

The analysis baseline is `main` at
`4d60dae351d8839daf0a6a971807b4aed23d7597`, synchronized with `origin/main`
at ahead/behind `0/0`. The four approved uncommitted C1 evaluation-tooling
changes were preserved. This stage is evaluation-only and Production
Recommendation remains **NOT ACTIVATED**.

## Reviewer 3 Integrity

The authentic Reviewer 3 export passed schema, stage, packet-set, reviewer,
session, locked-state, response-count, unique-ID, exact targeted-set coverage,
allowed-choice, and recomputed result-SHA gates before reveal. The original file
was copied byte-for-byte to ignored private evaluation storage and was not
normalized or rewritten.

## Reviewer 3 Result Identity

| Reviewer   | Session                                | Result SHA-256                                                     | Original-file SHA-256                                              |
| ---------- | -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| reviewer-3 | `cb755fb2-de89-4789-a33c-691c0ff149be` | `61c72bfdce5fc5fbf497f225b012099d1a906888d58312545cf6c863ffbc05d5` | `ce8696a14c446c25baf0af8214659d45d097ca6296ea28bfcee8182a09a2ddd8` |

The result contains exactly 35 locked responses for packet set SHA-256
`e058fe70996ec37805c8610a5bb8e2cbf7bfc9fdfc84644ff737ce42986a842f`.

## Private Artifact Integrity

All A02 and C1 private identities passed:

- A02 private analysis: `5fc1e0d13f84712d3cc3b170ee3444066873e85da698cb5cf9d5d13b5a8e494e`
- A02 reveal key: `92596bff8f2219098bad50268263b2dea935b71b4af3131a3239ed6a1b28494e`
- Reviewer 1 original: `acd480f29ee368c6803a2790a9364fd55904764a117973295378b54899cbbbff`
- Reviewer 2 original: `4f1fee335660f26a303b0c5f6ef0d837286a3436f40271f5462705ab71c332e2`
- C1 targeted manifest: `f1fd92d68a41794bfd048ef176e717cac09296b93a409773772131426f8a1f22`
- C1 targeted reveal: `4515e4939eb5782c050242b7e4ce9eb365d2e3df3bcf9fd74af08faa2b8068f1`
- C1 preparation audit: `ba386d117f3efaa91bb8ada17dacc3d037903cf546f053e4873521a9b3fde8d0`
- C1 review HTML: `58efa96ba16c8219752a8faa785836d6b548381402b7ddff8a84c793ef71434a`

## Reveal Integrity

Reveal occurred only after Reviewer 3 and all private artifacts passed. The
targeted reveal contained the same 35 packet IDs as the targeted manifest and
the response set. Original A/B placement, logical-case mapping, transition,
Pattern Size, Maximum Colors, split, and evaluation-only category were retained.
Response-level reveal output remains private and ignored.

Source canonical identities remained:

- A01: `1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89`
- A02 structural: `e47533d6a96fe244c188d71f173afae57617b2e1ada0a3ea6358c60e74a35a5c`
- A02 two-reviewer analysis: `367b1458bf39f66fcaa41690ef63921a24a7076724de4c8b5da5448dd77ea6a4`

## Three-Reviewer Consensus Resolution

The original 25 usable two-reviewer consensus comparisons were preserved.
Reviewer 3 voted only on the 35 targeted ambiguous comparisons; no vote was
invented for the other 25.

For the targeted 35, 15 became directional majority, 12 became neutral majority,
3 remained persistent ambiguity, and 5 remained uncertain. No persistent
ambiguity was silently converted to neutral.

## Reviewer 3 Impact on Ambiguous Cases

Reviewer 3 converted 27 of the 35 targeted comparisons into usable consensus:
8 larger-preferred, 7 smaller-preferred, and 12 neutral. Usable coverage rose
from `25/60 = 41.67%` to `52/60 = 86.67%`, a gain of 27 comparisons. This is a
material ground-truth coverage improvement, but it does not prove predictor
reliability.

## Final 60-Comparison Consensus Distribution

| Label                | Count |
| -------------------- | ----: |
| Larger preferred     |    15 |
| Smaller preferred    |    12 |
| Neutral              |    25 |
| Persistent ambiguity |     3 |
| Uncertain            |     5 |
| Usable consensus     |    52 |

## Persistent Ambiguity

Eight comparisons remain unusable as deterministic ground truth: three
persistent three-way ambiguities and five unresolved Cannot-judge cases. They
remain explicit abstention cases.

## Consensus by Transition

| Transition |   N | Usable | Larger | Smaller | Neutral | Ambiguous | Uncertain |
| ---------- | --: | -----: | -----: | ------: | ------: | --------: | --------: |
| 24->48     |  10 |      8 |      6 |       0 |       2 |         0 |         2 |
| 48->72     |  13 |     11 |      2 |       2 |       7 |         2 |         0 |
| 72->120    |  20 |     17 |      2 |       9 |       6 |         0 |         3 |
| 120->168   |  11 |     10 |      4 |       1 |       5 |         1 |         0 |
| 168->221   |   6 |      6 |      1 |       0 |       5 |         0 |         0 |

The direction is non-monotonic: 72->120 is predominantly smaller-preferred,
while 24->48 is predominantly larger-preferred and 168->221 is predominantly
neutral.

## Consensus by Maximum Colors

| Maximum Colors |   N | Usable | Larger | Smaller | Neutral | Ambiguous | Uncertain |
| -------------- | --: | -----: | -----: | ------: | ------: | --------: | --------: |
| 16             |  15 |     14 |      5 |       1 |       8 |         0 |         1 |
| 32             |  33 |     29 |      7 |       8 |      14 |         1 |         3 |
| 64             |  12 |      9 |      3 |       3 |       3 |         2 |         1 |

Maximum Colors alone does not determine preference.

## Consensus by Category

| Evaluation-only category      |   N | Usable | Larger | Smaller | Neutral | Unresolved |
| ----------------------------- | --: | -----: | -----: | ------: | ------: | ---------: |
| complex-photo                 |   1 |      1 |      1 |       0 |       0 |          0 |
| dark-subject-background       |   2 |      2 |      0 |       0 |       2 |          0 |
| fine-line                     |   6 |      5 |      1 |       0 |       4 |          1 |
| flat-illustration             |   7 |      6 |      3 |       3 |       0 |          1 |
| high-saturation               |   6 |      6 |      2 |       0 |       4 |          0 |
| low-contrast                  |   1 |      1 |      0 |       0 |       1 |          0 |
| opaque-background-removal     |   3 |      2 |      1 |       0 |       1 |          1 |
| pale-subject-light-background |   4 |      4 |      1 |       1 |       2 |          0 |
| pet-fur                       |   9 |      6 |      2 |       3 |       1 |          3 |
| portrait                      |  12 |     11 |      2 |       1 |       8 |          1 |
| simple-graphic                |   2 |      2 |      0 |       1 |       1 |          0 |
| white-background-product      |   7 |      6 |      2 |       3 |       1 |          1 |

Category remains analysis metadata only and is prohibited as a production
predictor input.

## DeltaE00 vs Three-Reviewer Consensus

Median weighted mean / P95 / maximum DeltaE00 gain was:

| Consensus | Weighted mean | Weighted P95 | Maximum |
| --------- | ------------: | -----------: | ------: |
| Larger    |        1.8811 |       3.3245 |  2.5527 |
| Smaller   |        0.7822 |       1.8515 |  2.3308 |
| Neutral   |        0.2954 |       0.0000 |  0.0000 |

DeltaE00 helps separate many neutral cases, but ranges overlap materially.
Weighted mean gain reaches `2.8093` in smaller-preferred and `2.5267` in neutral
comparisons. DeltaE00 alone cannot safely determine direction.

## Structural Features vs Consensus

Median larger / smaller / neutral values were:

| Feature                        | Larger | Smaller | Neutral |
| ------------------------------ | -----: | ------: | ------: |
| Normalized boundary delta      | 0.0166 |  0.0233 |  0.0027 |
| Mean local-switch delta        | 0.0860 |  0.0967 |  0.0223 |
| Dominant-color component delta |      0 |       2 |       0 |
| Total component delta          |     87 |      13 |      12 |
| Singleton component delta      |     67 |      12 |      17 |
| 2-3-cell component delta       |     30 |       3 |       1 |

Boundary, switching, dominance, micro-components, and fragmentation all overlap
across preference directions. None supplies a stable visual-regression guard.

## Most Reliable Predictors

Calibration supported only a narrow joint signal: weighted mean DeltaE00 gain
combined with additional used colors. Structural signals were not reliable
enough for a guard. The joint signal was therefore tested as one conservative,
evaluation-only candidate; it was not treated as proven.

## Calibration Evidence

The frozen split remained 15 logical cases / 35 comparisons for calibration and
9 logical cases / 25 comparisons for validation. Calibration consensus was 10
larger, 4 smaller, 14 neutral, 3 ambiguous, and 4 uncertain.

The single candidate made 4 larger recommendations, all on larger consensus,
for `11.43%` coverage and `88.57%` abstention. It made no smaller, neutral,
ambiguous, or uncertain recommendation on calibration. Validation labels were
not inspected while choosing the rule.

## Frozen Candidate Policy

Policy ID: `a02-c2-conservative-adjacent-larger-v1`.

Decision order:

1. Recommend larger only when weighted mean DeltaE00 gain is at least `2.0`
   and additional used colors is at least `1`.
2. Otherwise abstain and retain the current profile.

Threshold equality passes. The policy is evaluation-only and was not changed
after validation.

## Candidate Policy Hash

`b620e405a7d3e8bac1bfc6638a89b8358028b2ff35259ef0630cfcf074bfc60e`

## Held-Out Validation

Validation had 25 comparisons: 5 larger, 8 smaller, 11 neutral, and 1 uncertain.
The frozen policy made 6 recommendations and abstained on 19. Recommendation
outcomes were 3 correct larger, 1 neutral, 1 smaller, and 1 uncertain. Resolved
recommendation precision was `3/5 = 60%`.

## False-Small

Count: `0`. The candidate never recommends a smaller profile, so this is vacuous
and does not demonstrate successful retain/smaller classification.

## False-Large

Count: `2` among resolved labels: one neutral comparison and one
smaller-preferred comparison were incorrectly recommended larger.

## Visual-Regression Recommendations

Count: `1`. A held-out comparison received a larger-profile recommendation while
human consensus preferred the smaller/current Pattern. This is the highest-risk
failure and blocks the candidate. The exact case remains private.

## Coverage / Abstention

Held-out decision coverage was `6/25 = 24%`; abstention was `19/25 = 76%`.
Abstention is not counted as a successful recommendation. Low coverage did not
prevent the high-risk failure.

## Global Six-Profile Applicability

The experiment covers sampled adjacent transitions only. It does not establish
monotonic quality or a global selection rule among 24/48/72/120/168/221. An
adjacent predictor cannot be promoted into automatic six-profile selection.

## Product Option Comparison

- **Option A — Full automatic recommendation:** unsupported by the non-monotonic
  human labels and failed held-out candidate.
- **Option B — Conservative recommendation with abstention:** tested, but the
  frozen candidate still produced a visual-regression recommendation.
- **Option C — No automatic Generation recommendation:** supported. Keep manual
  Color Set selection and improve explanatory UX instead.

## Recommended Product Direction

Choose Option C. Production Recommendation remains **NOT ACTIVATED**. Current
Generation remains the profile actually used for the displayed Pattern;
Recommended for Your Image remains advisory only; Minimum Required for Current
Pattern remains material coverage only. Recommendation must not alter Required,
Refill, Materials, or Purchase without explicit successful regeneration.

## Remaining Evidence Gaps

- Eight comparisons remain ambiguous or uncertain after three reviewers.
- Structural and DeltaE00 distributions overlap across opposing preferences.
- The only frozen nontrivial candidate failed held-out safety.
- Evidence is adjacent-transition evidence, not global six-profile evidence.
- Additional work would require a new predictor hypothesis or different evidence,
  not validation-driven threshold rescue.

## Repository TypeScript Debt Root Cause

The four committed errors were evaluation-only typing defects:

- Two `TS2532` errors indexed fixed score arrays under strict unchecked-index
  semantics.
- One `TS2345` error omitted the possible `undefined` value from a bounded matrix
  lookup's static guard.
- One `TS2739` test fixture used an outdated `PatternTotals` shape and omitted
  `width`, `height`, and `totalPositions`.

No production defect was identified.

## TypeScript Debt Fix Scope

The minimal fix adds null-safe array increments, an explicit undefined guard,
and the three required test-fixture totals. It does not weaken TypeScript,
exclude files, use broad casts, or modify production/shared code. Repository-wide
`npm run typecheck` passes after the fix.

## File / Evidence Scope

The scope contains C1/C2 evaluation tooling and tests, the three evaluation-only
typing fixes, this sanitized report, and one sanitized aggregate JSON evidence
file. Reviewer answers, timestamps, exact targeted IDs, reveal keys,
response-level mappings, and risk-case identities remain local private ignored
artifacts.

Sanitized aggregate evidence canonical SHA-256:
`32a3c46973f68c51fb93140be7fb9811fc7347ed6a8b36dce120af06c420e02f`.

## Tests / Static Gates

Required gates cover Reviewer 3 integrity, A01/A02/C1 identity, deterministic C2
analysis, focused human/structural/policy/reviewer-tool tests, repository-wide
TypeScript, targeted ESLint, targeted Prettier, and `git diff --check`. Production
suite/build is unnecessary because production/shared paths are unchanged.

## Git State

This evaluation remains uncommitted pending a separate sanitized Commit Review.
Nothing is staged or pushed. Production behavior is unchanged.

## Final Decision

**DETERMINISTIC GENERATION RECOMMENDATION NOT RELIABLE ENOUGH**
