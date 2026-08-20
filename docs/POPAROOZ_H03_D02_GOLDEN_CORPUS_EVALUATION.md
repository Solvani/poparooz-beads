# P3-A03-H03-A02 Golden-Corpus Evaluation

Stage: P3-A03-H03-A02

Status: Evaluation completed; candidate rejected

## Frozen Evidence

- Baseline commit: `56e07a48465855e9ff21ada36589e85567b8c0d1`
- Authoritative baseline: `1.0.0`
- Baseline canonical identity: `925161a4d6298f03d4007089ce8bb2bbca261fc1cdd0a3a8cef21942ad0b6982`
- Baseline scorecard SHA-256: `c0777067931a0cd078ca6b5d837daec97b6e504fcbcf25b41731a31421ee51a6`
- Baseline summary SHA-256: `cfe2004983d2e449ab404ff8679f5980fb06a3c97707c94ef5068fbba00ee5d0`
- Corpus manifest SHA-256: `94b3a88a77ebd969bae9be3a2971c84a32eaf38c7e6779bc1e0e317b1f15fc9e`
- Candidate canonical identity: `b9c171f796bde491483e6698c9d28f5137519f0189699603d7441843d64097e5`
- Candidate scorecard SHA-256: `2e5fc5998cba0b692640ea3c9dda7c3b332f5d2d093618fc4ba3f04665e0adc1`
- Candidate summary SHA-256: `5b4cd173442b65871a1010eec44805aec60938766bbc6089753cbd654a2ca68`

## Gate Accounting

The implemented candidate runner contains five hard gates, all of which pass:

1. corpus integrity;
2. frozen-core identity;
3. baseline replay equality;
4. explicit-alpha invariance; and
5. structural safety.

Determinism is verified separately through repeated evaluation and identity
comparison. It also passes.

- Candidate runner hard gates: `5 / 5` passed
- Separate determinism gate: `1 / 1` passed
- Total reviewed gates: `6 / 6` passed

Passing these safety and reproducibility gates does not establish production
quality or authorize activation.

## Aggregate Result

- Changed runs: `9 / 54`
- False-background occupied-position delta: `-11`
- Lost-subject-position delta: `+71`
- Total disagreement delta: `+60`
- Bead delta: `-82`
- Singleton delta: `0`

The candidate removed 11 known false-background occupied positions but added 71
lost-subject positions, increasing total disagreement by 60.

## Trusted-Pair Outcome

- Pump bottle: regressed
- Teddy: regressed
- Golden Retriever: no improvement
- Sweater Portrait: no improvement
- Poparooz Logo: regressed

Explicit-alpha invariance: PASS

Structural safety: PASS

Determinism: PASS

## Final Verdict

`CANDIDATE BLOCKED — DO NOT ACTIVATE`

The low-alpha neutral normalized-fringe signature overlaps legitimate pale
subject coverage and is not production-safe. Do not continue threshold tuning
of H03-D02 Architecture C.

Background Removal v1: NOT FROZEN

Production activation: NONE
