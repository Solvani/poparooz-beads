# P3-A03-E05-D04-A02 Human Review and Structural Predictor Analysis

## 1. Preflight

Analysis source Git HEAD and `origin/main` were
`4566c73c30f5b700e580004c2d4a1580fd0eacef`, with ahead/behind `0/0`.
The previously approved A02-A evaluation-only worktree scope was retained.

## 2. Reviewer File Integrity

Both original exports independently passed schema, stage, packet-set, reviewer,
session, locked-state, response-count, unique packet ID, complete packet coverage,
allowed-choice, and recomputed result-SHA gates before reveal. The original files
remain byte-for-byte only in ignored local private evaluation artifacts; they are
excluded from Git and remote history.

## 3. Reviewer Result Identities

| Reviewer   | Session                                | Result SHA-256                                                     | Original-file SHA-256                                              |
| ---------- | -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| reviewer-1 | `c208effc-8783-4880-94e4-9557d952d181` | `55d6b4654a849cb6ba5e69e1017bef80e3bb09eb986ee36126294c824755fe17` | `acd480f29ee368c6803a2790a9364fd55904764a117973295378b54899cbbbff` |
| reviewer-2 | `83933aaf-f791-46ca-815e-d0ecbb6bbe22` | `801e0ae45a4c46d85122d6e83d78e6bfda6c897af878c6e65b178b7a85b21a26` | `4f1fee335660f26a303b0c5f6ef0d837286a3436f40271f5462705ab71c332e2` |

Reviewer 1's answers remain valid. The reviewer understood choices 1–6 from the
first question; no answer was changed or reconstructed because of the earlier
translation/display concern.

## 4. Reveal Integrity

Reveal occurred only after both immutable reviewer files passed all gates. The
reveal key matched packet-set SHA-256
`1feeedeb9b04cd407526f40dd25c04a351c1389a20df6538eb8789b4027f15d7`
and contained exactly the same 60 packet IDs.

Source evidence identities remained:

- A01 canonical SHA-256:
  `1b58d8670444fb91f9b5026db06633aa0d975a01261b2adcd2bb0ef515850c89`
- A02 structural canonical SHA-256:
  `e47533d6a96fe244c188d71f173afae57617b2e1ada0a3ea6358c60e74a35a5c`
- A02-B sanitized human-analysis canonical SHA-256:
  `367b1458bf39f66fcaa41690ef63921a24a7076724de4c8b5da5448dd77ea6a4`

## 5. Exact Human Agreement

Exact six-choice agreement was `18/60 = 30.0%`.

## 6. Broad / Directional Agreement

Broad A/B/neutral/cannot agreement was `25/60 = 41.67%`. Excluding the eight
comparisons containing at least one Cannot judge answer, exact agreement was
`18/52 = 34.62%` and broad agreement was `25/52 = 48.08%`.

Usable revealed consensus comprised 7 larger-preferred, 5 smaller-preferred,
and 13 no-meaningful-difference comparisons. Reviewer 1 individually recorded
16 larger, 15 smaller, 21 neutral, and 8 cannot; Reviewer 2 recorded 20 larger,
14 smaller, and 26 neutral.

## 7. Weighted Agreement Analysis

Linear weighted Cohen's kappa on the five ordered non-Cannot choices was
`0.0884` across 52 comparisons. Observed weighted agreement was `0.6587` and
chance-expected weighted agreement was `0.6256`.

This is weak agreement. It is not evidence that either reviewer is wrong; it
shows that the visual preference target is unstable or subjective for much of
this packet set.

## 8. Direct Human Disagreement Cases

Direct opposite A-versus-B preference occurred in `12/60 = 20.0%`: one at
24→48, five at 48→72, five at 72→120, one at 120→168, and none at 168→221.
Nine were calibration and three were validation comparisons. These remain
explicit disagreements and cannot be converted into fake neutral labels.

## 9. Agreement by Transition / Max Colors / Category

| Transition |   N | Exact | Broad | Direct opposite |
| ---------- | --: | ----: | ----: | --------------: |
| 24→48      |  10 |     3 |     6 |               1 |
| 48→72      |  13 |     5 |     5 |               5 |
| 72→120     |  20 |     5 |     7 |               5 |
| 120→168    |  11 |     0 |     2 |               1 |
| 168→221    |   6 |     5 |     5 |               0 |

Agreement was especially weak for 120→168; direct opposition concentrated in
48→72 and 72→120. By Maximum Colors, broad agreement was 8/15 at 16, 13/33 at
32, and 4/12 at 64. Direct oppositions were respectively 1, 8, and 3.

Broad agreement by split was 13/35 calibration and 12/25 validation. Categories
with direct opposite cases included complex photo, fine line, flat illustration,
pet/fur, portrait, simple graphic, and white-background product. Category is
evaluation metadata only and is not a production predictor input.

## 10. Consensus Construction

- Exact direction agreement: same broad direction and same strength.
- Soft direction agreement: same non-neutral broad direction, different strength.
- Neutral agreement: both report no meaningful difference.
- Direct opposite: one prefers each side; retained as disagreement.
- Direction/neutral conflict: retained as disagreement.
- Any Cannot judge: retained as uncertain.

Only exact/soft direction agreement and joint neutral agreement are usable for
exploratory predictor analysis. Distribution: 5 exact-direction, 7 soft-direction,
13 neutral, 12 direct-opposite, 15 direction/neutral, and 8 cannot-uncertain.

## 11. Human Judgment Distribution

Usable consensus was only `25/60 = 41.67%`. Calibration contained 13 usable
comparisons: 6 larger, 6 neutral, and only 1 smaller. Validation contained 12:
1 larger, 7 neutral, and 4 smaller.

The single smaller-preferred calibration example is insufficient for selecting
a reliable visual-regression guard.

## 12. ΔE00 vs Human Judgment

Median weighted-mean ΔE00 gains were:

- larger preferred: `2.03`
- smaller preferred: `0.69`
- neutral: `0.07`

Median P95 gains were `3.35`, `1.85`, and `0.00`; median maximum gains were
`2.55`, `1.46`, and `0.00` respectively. ΔE00 helps distinguish many neutral
cases, but nonzero and sometimes material gains occur in both larger- and
smaller-preferred groups. It therefore remains insufficient as a sole direction
predictor.

## 13. Structural Features vs Human Judgment

Median total-component deltas for larger/smaller/neutral usable consensus were
`+87 / +12 / +2`; singleton deltas were `+67 / +5 / +3`; normalized-boundary
deltas were `+0.03 / +0.06 / 0.00`; and mean-local-switch deltas were
`+0.11 / +0.23 / +0.01`.

These observations do not support the assumed simple rule that more fragmentation
always predicts a smaller-profile preference. In this small usable sample, both
larger- and smaller-preferred comparisons can add components, singletons,
boundaries, and local switching. Thin-continuity median delta was zero in all
three groups.

## 14. Most Informative Structural Predictors

Exploratory calibration median-separation ranked normalized boundary delta,
dominant-color component delta, mean local switching, small-region percentage,
2–3-cell components, total components, and singletons highest.

This ranking is not threshold evidence: calibration contains only one usable
smaller-preferred comparison. The apparent separation is consequently unstable
and cannot justify a production rule.

## 15. Calibration Procedure

The frozen A01 case-level split remains 15 calibration and 9 validation cases.
All Pattern Size and Maximum Colors settings for one logical case remain in one
partition. Feature exploration used calibration only; validation labels were not
used to choose thresholds.

## 16. Frozen Candidate Predictor

Evaluation-only candidate `a02-abstain-only-v1` is frozen as:

> Always abstain; do not recommend a profile change.

No nontrivial feature thresholds were frozen because calibration labels were too
sparse and human agreement too weak. This candidate is a safety control, not a
useful recommendation policy.

## 17. Held-Out Validation Results

Validation contained 25 sampled comparisons, including 12 with usable consensus.
The abstain-only candidate made zero decisions, giving 0% decision coverage and
25 abstentions.

## 18. False-Small Cases

Count: `0`, solely because the candidate always abstains. This is vacuous and
does not demonstrate successful identification of larger-profile benefits.

## 19. False-Large Cases

Count: `0`, solely because the candidate always abstains.

## 20. Visual-Regression Recommendation Cases

Count: `0`, solely because the candidate never recommends moving larger.

## 21. Predictor Coverage / Abstention

Decision coverage was `0%`; abstention was `100%`. Abstention avoids unsupported
recommendations but does not satisfy the product goal of automatically selecting
an improved Generation Color Set.

## 22. Whether Third Reviewer Is Needed

A targeted third independent reviewer is recommended for the 35 ambiguous
packets only: 12 direct-opposite, 15 direction/neutral, and 8 containing Cannot
judge. The exact private packet list remains in ignored local analysis artifacts;
it is excluded from Git. Repeating all 60 is not justified at this point.

A third vote may resolve individual packets, but it cannot by itself prove that
the underlying preference target is objective or stable. Case-level held-out
evaluation remains required.

## 23. Recommended Generation Policy Direction

Do not activate automatic profile-change recommendations. Continue actual
production behavior and allow the policy to abstain conceptually while evidence
is incomplete. Do not use image category as policy input.

Current Generation, Recommended for Your Image, and Minimum Required for Current
Pattern remain distinct. Recommendation must not alter Required, Refill,
Materials, or Purchase without explicit successful regeneration.

## 24. Remaining Evidence Gaps

- 35/60 packets lack usable two-reviewer consensus.
- Calibration has only one usable smaller-preferred example.
- Weighted agreement is weak.
- Structural directions overlap across human labels.
- A targeted third review and renewed case-level validation would be required.
- The future review UI should use explicit “Pattern A/B” wording, but the locked
  original results must remain unchanged.

## 25. File / Evidence Scope

A02-B adds only evaluation tooling, tests, sanitized deterministic aggregate
analysis evidence, and this report. The two immutable original reviewer exports,
reveal key, response-level records, and targeted packet list remain local private
artifacts outside Git. It does not modify
`src/**`, production generation, Color Sets, Palette, Quantizer, Matcher,
Background Removal, Required, Refill, Email, Download, or Shopify.

## 26. Tests / Deterministic Gates

The analysis is reproducible from the preserved original exports, frozen packet
and reveal artifacts, A01 evidence, and A02 structural evidence. Its verifier
revalidates all identities and compares the complete serialized analysis artifact.
The sanitized remote repository alone intentionally cannot reproduce response-level
reveal analysis: verification requires the ignored local private inputs matching
the permanently recorded SHA-256 identities. This is the explicit data-minimization
tradeoff.

## 27. Git State

This evidence remains uncommitted pending explicit scope and commit review.
Nothing is staged or pushed. Production Recommendation remains **NOT ACTIVATED**.

## Final Decision

**EVIDENCE IMPROVED BUT INSUFFICIENT — THIRD REVIEW / MORE EVALUATION REQUIRED**
