# Poparooz E05 Recommendation Policy Decision

Stage: `P3-A03-E05-D02`

Status: **RECOMMENDATION POLICY v1 FROZEN**

## Decision

```text
Recommended Bead Set = Required Bead Set
under the current frozen production generation semantics.
```

Required and Recommended remain semantically independent. They return the
same profile in Recommendation Policy v1 because frozen authoritative evidence
demonstrates that no larger eligible complete profile provides measurable
Pattern palette-quality improvement.

The policy is not justified merely as “use the smallest set.” Its mechanism is:

```text
Never upgrade above the smallest complete profile when the larger profile
provides no measurable Pattern palette-quality improvement.
```

No positive Delta E, P95, material-gain, quality-score, or upgrade-score
threshold is part of Recommendation Policy v1.

## Semantic Contract

### Required Bead Set

The smallest approved Color Set providing 100% coverage of every final
production Pattern color code. Required is a coverage calculation.

### Recommended Bead Set

The advisory Bead Set selected by Recommendation Policy. Recommendation Policy
v1 independently returns Required because every eligible larger complete
profile has zero measured quality gain under the current production semantics.

Recommended must never be below Required.

### Refill Requirements

Refill Requirements are independent material-quantity requirements and do not
modify Required or Recommended profile selection. A larger Color Set supplies
more distinct colors; it does not supply another nominal quantity of an
already-included color.

## Authoritative Source

- Source evidence ID: `poparooz-e05-actual-production-evidence`
- Source evidence version: `1.0.0`
- Source stage: `P3-A03-E05-PRE`
- Source freeze commit:
  `549711842369e876c1f06ccc8d85fe003f5ca8a1`
- Production commit recorded by the source:
  `23c0cef3644de26ff7c1d923394a64b7efb2743c`
- Source canonical SHA-256:
  `1357999cf5eb9585da9315d5325f01131ea818383eb7dd9f86d12aea3ebdf1b8`
- Source complete JSON SHA-256:
  `d2ab1b40cad9e97f605f57a77d9d03cb04481cf33cd1cfebfde5d7cf17b8974c`

Blocked H03 Architecture C, Dominant Sampling, and Perceptual Observed-Color
Sampling outputs are excluded. No production image replay was performed for
this decision.

## Formal Profile Boundary

The only approved profiles are:

```text
24 / 48 / 72 / 120 / 168 / 221
```

The authoritative membership artifact confirms that each profile is a subset
of the next larger profile. Profiles `96`, `144`, and `192` are not formal
profiles and are not part of this policy.

Current production semantics are:

```text
generate the final Pattern against the 221 production Palette
-> obtain final Pattern color codes
-> find the smallest nested formal profile containing every final code
```

Once Required contains every code already selected for the final Pattern,
adding a larger profile cannot replace those final Pattern codes. This explains
the observed equality with 221; it is not a customer or image-class rule.

## Required and Recommended Evidence

All `54` authoritative production runs passed these invariants:

- Required-profile weighted mean loss versus 221 equals zero: `54 / 54`.
- Required-profile weighted P95 loss versus 221 equals zero: `54 / 54`.
- Required-profile maximum Delta E00 equals the 221 maximum: `54 / 54`.
- Recommended equals Required: `54 / 54`.
- Recommended is never below Required: `54 / 54`.

| Profile | Required runs | Recommended runs |
| ------: | ------------: | ---------------: |
|      24 |             0 |                0 |
|      48 |             0 |                0 |
|      72 |             0 |                0 |
|     120 |             0 |                0 |
|     168 |            13 |               13 |
|     221 |            41 |               41 |

The whole-corpus 168-to-221 aggregate must not be treated as an eligible
Recommendation upgrade result. Forty-one runs require 221 because 168 is
incomplete for their final Pattern codes.

## Eligible 168-to-221 Closure

Exactly `13` runs have Required equal to 168. For every eligible run:

- weighted mean Delta E00 at 168 equals 221;
- weighted P95 Delta E00 at 168 equals 221;
- maximum Delta E00 at 168 equals 221;
- used-color count at 168 equals 221;
- mean, P95, and maximum 168-to-221 improvements equal zero.

Recommendation Policy v1 therefore keeps all 13 eligible runs at 168. No run
is upgraded without measurable benefit.

## Trusted Pair Verification

No trusted-pair identity enters the policy. It is used only to verify outcomes.

| Trusted pair      | Runs | Recommended 168 | Recommended 221 |
| ----------------- | ---: | --------------: | --------------: |
| Golden Retriever  |    4 |               0 |               4 |
| Pale Teddy Bear   |    4 |               3 |               1 |
| Poparooz Logo     |    4 |               0 |               4 |
| Sweater Portrait  |    4 |               0 |               4 |
| White Pump Bottle |    4 |               4 |               0 |

Recommended equals Required in all `20 / 20` trusted-pair runs.

## Pattern Size Verification

Pattern Size is evaluation-only and does not branch the policy.

| Pattern Size | Runs | Recommended 168 | Recommended 221 |
| -----------: | ---: | --------------: | --------------: |
|           40 |   10 |               4 |               6 |
|           60 |   10 |               3 |               7 |
|           80 |   10 |               2 |               8 |
|          104 |   24 |               4 |              20 |

All four size groups satisfy Recommended equals Required without a size-specific
threshold or lookup.

## Refill Rule and Evidence

The nominal capacity is:

```text
NOMINAL_BEADS_PER_COLOR = 1000
```

For each final Pattern color:

```text
refillPacksRequired = max(0, ceil(patternBeadCount / 1000) - 1)
```

Frozen source evidence produces:

- Runs containing at least one refill color: `37 / 54`.
- Color rows requiring refill: `71 / 750`.
- Zero refill packs: `679` color rows.
- One refill pack: `40` color rows.
- Two refill packs: `11` color rows.
- Three or more refill packs: `20` color rows.
- Maximum single-color bead count: `9,679`.
- Maximum single-color refill packs: `9`.
- Maximum total refill packs for one Pattern: `10`.

The maximum single-color example is Thin Botanical, Pattern Size 104, code
`H2`, with `9,679` beads and `9` refill packs. The maximum Pattern total is
shared by Dark Camera 104 (`H6 x2`, `H7 x8`) and White Sneaker 104 (`H2 x8`,
`H9 x2`).

Every refill color is already included in the selected complete profile. Refill
quantity does not alter Recommendation.

## Machine-Verifiable Closure

The canonical policy artifact is:

```text
data-source/quality/generator-e05-evidence/1.0.0/
e05-recommendation-policy-evaluation.json
```

- Schema version: `1.0.0`
- Policy ID: `poparooz-recommendation-policy`
- Policy version: `1.0.0`
- Canonical policy evidence SHA-256:
  `d6ef6aa2a54f4c6878e058e695d57532ac7ad007ae3878661a0f94f4bede0ffd`
- Complete policy JSON SHA-256:
  `8f1585ea84bf8b531f912396dbbae84eb567ea68edfc601ad7503e34aa18b74c`

The closure evaluator fails closed on source identity, run count, profile
identity/nesting, distributions, Required/Recommended invariants, eligible
upgrade gains, refill arithmetic/coverage, serialization determinism, or any
production `src/**` difference.

## Production and UI Boundary

This closure changes no production generator, Runtime Palette, Color Set,
Quantizer, Matcher, Pattern identity, Results UI, Download, Email, or commerce
behavior.

The existing `src/features/results/recommended-color-set.ts` helper mechanically
calculates Required while the current UI labels it Recommended. That naming and
presentation debt is not changed here and belongs to a separately authorized
Results stage.

## Re-evaluation Triggers

Recommendation Policy v1 must not be silently reused if any of these changes:

- Pattern generation becomes profile-specific;
- a Pattern is regenerated after Color Set selection;
- formal profile nesting or membership changes;
- Runtime Palette changes materially;
- Quantizer or Matcher behavior changes;
- final Pattern color identity semantics change;
- a larger complete profile can change actual Pattern colors; or
- future authoritative evidence contains non-zero eligible upgrade gains.

In particular, if future behavior becomes:

```text
choose Color Set -> regenerate Pattern against that Color Set
```

Recommendation Policy v1 is no longer automatically valid. A new independent
evidence and calibration stage is required.
