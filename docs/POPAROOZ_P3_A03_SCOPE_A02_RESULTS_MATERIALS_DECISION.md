# Poparooz P3-A03-SCOPE-A02 Results / Materials Decision

Stage: `P3-A03-SCOPE-A02`

Status: **COMPLETED / FROZEN / WITH APPLICABILITY QUALIFICATIONS**

This is the authoritative permanent governance record for the Results and
Materials decision. It changes no production behavior and does not authorize
P3-A03-SCOPE-A03 implementation.

## Recommendation Policy v1

Status:

```text
RETAINED
NOT SUPERSEDED
```

The current v1 outcome remains:

```text
Recommended Bead Set = Required Bead Set
```

Recommended Bead Set v1 is a material-policy result for the already-generated
current Pattern. It does not select a Generation Color Set and does not trigger
regeneration.

Specifically, Recommendation Policy v1 does not:

- select `selectedColorSetProfileId`;
- choose the Generation Color Set;
- trigger regeneration;
- perform image-quality scoring; or
- perform automatic palette selection.

The E05 source evidence used `poparooz-set-221`. That evidence must not be
generalized into proof of equal profile-specific generation quality across all
six formal Generation Color Sets. If Recommended later affects generation
profile selection or regeneration, Recommendation Policy must be re-evaluated
through a separately authorized evidence stage.

## Required and Recommended Presentation

The frozen customer-facing presentation is **Option B**. Required and
Recommended remain semantically independent.

Illustrative target presentation:

```text
Required Bead Set
72-Color Set
Smallest official set containing every color used.

Recommended Bead Set
Same as the required set for this pattern
```

The `72-Color Set` value is illustrative only. No fixed value is part of the
normative logic.

Recommended must not be described as a smart image recommendation, automatic
generation recommendation, second quality algorithm, or optimal generation
palette.

## Automatic Generation Color Set Recommendation

P3-A03-E05-D04 remains:

```text
BLOCKED
NOT ACTIVATED
NOT PLANNED FOR CURRENT PRODUCTION SCOPE
```

The formal Generation Color Sets remain exactly:

```text
24 / 48 / 72 / 120 / 168 / 221
```

Profiles `96`, `144`, and `192` are not formal Generation Color Sets and must
not be introduced.

## Generation Color Set and Required Bead Set

```text
Generation Color Set
=
The color set used to generate the current Pattern.
```

```text
Required Bead Set
=
The smallest formal Poparooz set containing every color used in the final Pattern.
```

These are independent concepts. For example:

```text
Generation Color Set: 120
Required Bead Set: 72
```

is valid and is not a contradiction.

For future customer-facing and export work:

```text
Bead Color Set = DEPRECATED AMBIGUOUS TERMINOLOGY
```

This decision does not change export implementation.

## Material Requirement Authority

The following Pattern-domain authorities remain frozen for final Pattern
per-color `beadCount`:

```text
MaterialRequirement
PublicMaterialRequirement
buildMaterialRequirements()
```

The input for future derived Results and export projections is:

```text
PublicPatternResult.materials
```

The required rule is:

```text
derived beadCount = PublicMaterialRequirement.beadCount
```

Results, Export, Commerce, and other adapters must not independently recount the
Pattern Matrix. There must be no second bead-count truth source.

## Derived Material Semantics

P3-A03-SCOPE-A03 may later define the following target contract, but A02 does
not implement it:

```ts
DerivedMaterialRequirementV1 {
  patternColorIndex
  color
  beadCount
  nominalBeadsPerColor
  totalPacksRequired
  additionalRefillPacks
}
```

The frozen formulas and source boundary are:

```text
beadCount = PublicMaterialRequirement.beadCount
totalPacksRequired = ceil(beadCount / 1000)
additionalRefillPacks = max(0, totalPacksRequired - 1)
```

`totalPacksRequired` means the nominal 1,000-bead pack equivalent required to
cover `beadCount`.

```text
totalPacksRequired != commerceQuantity
```

The two values have different semantics and must not be conflated.

## Commerce Boundary

The following remain unfrozen and Commerce-only:

- `commerceQuantity`;
- Shopify product ID;
- Shopify variant ID;
- SKU;
- product handle;
- price;
- inventory;
- cart line;
- cart quantity;
- board SKU;
- purchase strategy;
- individual color pack strategy; and
- Required Set plus refill strategy.

None may become Pattern or material authority. Future purchase integration
requires a separate approved Purchase Contract.

## Board Governance

```text
Pattern.boardLayout = authoritative Pattern layout fact
```

Separately:

```text
recommendBoardSetup() = existing production board-purchase recommendation behavior
```

These concepts must not be conflated. Current `recommendBoardSetup()` behavior
remains unchanged. Its 52 / 78 / 104 purchase options do not activate 52×52 or
78×78 as Generation BoardProfiles. Formal Generation BoardProfile v1 remains
104×104 active.

Replacing the current Results board recommendation with `Boards Required /
Board Layout` would be a customer-facing behavior change and requires later
explicit authorization. Future board purchase alternatives require a separate
Board Purchase Recommendation Policy and authoritative product evidence. A02
does not implement, replace, or remove any board behavior.

## Results Information Architecture

The future implementation target is:

```text
Summary → Materials → Actions → Color Details
```

Status:

```text
APPROVED IMPLEMENTATION TARGET
NOT PROVEN FINAL / OPTIMAL UX
```

Post-implementation verification remains required for:

- desktop and mobile hierarchy;
- Results height;
- keyboard order;
- screen-reader behavior;
- accessibility;
- terminology comprehension; and
- actual visual presentation.

No Product Design Audit was run in A02 because no current-stage screenshots
existed and this stage concerned semantic and data contracts.

## Production and Next-Stage Boundary

Production behavior remains unchanged. Recommendation Policy v1 is not
activated as Generation Color Set Recommendation. Automatic Generation Color
Set Recommendation remains blocked. Existing board behavior remains unchanged.
Commerce remains unfrozen.

P3-A03-SCOPE-A03, Unified Derived Material Requirement Contract, is the next
stage only after A02 closure approval. A03 is not started, implemented, or
authorized by this document.

## Git Baseline

The accepted repository baseline entering A02 governance editing is:

```text
branch: main
HEAD: 0a85392fb48798234fb4a46243bf1de449de63fe
origin/main: 0a85392fb48798234fb4a46243bf1de449de63fe
ahead / behind: 0 / 0
worktree: clean
```

This document does not claim that the A02 governance change has been committed,
pushed, or closed.
