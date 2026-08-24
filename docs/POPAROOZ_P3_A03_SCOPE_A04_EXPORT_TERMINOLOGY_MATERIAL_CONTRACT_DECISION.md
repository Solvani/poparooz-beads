# P3-A03-SCOPE-A04 — Export Terminology / Material Contract Decision

## 1. Decision Status

```text
COMPLETED / FROZEN / CLOSED
WITH EVIDENCE APPLICABILITY QUALIFICATIONS
```

```text
MINIMAL TERMINOLOGY IMPLEMENTATION
NO MATERIAL CONTRACT DEFECT
```

This freeze takes effect when the governance commit containing this document is
created. This document does not claim that the governance commit has been
pushed.

## 2. Stage Scope

P3-A03-SCOPE-A04 freezes:

- the customer-facing **Generation Color Set** terminology;
- current local-PNG Export material semantics;
- application of the A03 Material Authority in Export; and
- the boundaries among Required Bead Set, Recommended Bead Set, Bead
  Requirements, and Additional Refill Packs.

A04 does not include a Results UI redesign, Shopify Purchase Contract, Add All
Beads, cart integration, Board purchase policy, automatic Generation Color Set
recommendation, Email Gate, deployment, image processing or sampling,
Recommendation Policy redesign, or a Commerce model.

## 3. Implementation Evidence

```text
Implementation commit: 2e5d7e2bf7c45bb0e269c6bbf299099a0347fa1f
Subject: fix: clarify generation color set terminology
Stat: 6 files changed, 9 insertions(+), 9 deletions(-)
```

The implementation scope is exactly:

- `src/app/App.test.tsx`
- `src/features/download/pattern-export.test.ts`
- `src/features/download/pattern-export.ts`
- `src/features/settings/PatternSettings.test.tsx`
- `src/features/settings/PatternSettings.tsx`
- `src/runtime/bootstrap/application-startup.integration.test.tsx`

Production changes only replace customer-visible wording in Settings and PNG
metadata. The other four files update directly corresponding tests or
accessible-name queries. No business data, algorithm, Material Contract, PNG
geometry, option value, profile ID, or Export ordering changed.

## 4. Canonical Customer-Facing Terminology

The canonical term is:

```text
Generation Color Set
```

It means the formal color profile recorded in the successful generation
snapshot and used to generate the retained Pattern. Customer-visible locations
are the Settings selector label, Settings help text, Results Pattern Summary,
and PNG Export metadata.

The old term is:

```text
Bead Color Set — DEPRECATED FOR ACTIVE CUSTOMER-FACING USE
```

It may remain in historical governance explanations, deprecation records, and
historical evidence descriptions. Historical documents must not be rewritten
merely to remove the old term.

## 5. Formal Generation Color Sets

The formal Generation Color Sets remain exactly:

```text
24 / 48 / 72 / 120 / 168 / 221
```

Their profile value labels remain `24-Color Set`, `48-Color Set`, `72-Color
Set`, `120-Color Set`, `168-Color Set`, and `221-Color Set`.

`96`, `144`, and `192` are not formal profiles. They may appear only in
rejection tests, historical records, or an explicit prohibited/unsupported
list.

## 6. Frozen Semantic Distinctions

### Generation Color Set

The formal set of colors permitted when generating the retained Pattern.

### Required Bead Set

The smallest formal sales set that fully covers every color actually used in
the generated Pattern.

### Recommended Bead Set

The independent post-generation result of Recommendation Policy v1.
Recommended and Required remain separate contracts and may evolve separately,
even when the current policy output equals Required.

### Bead Requirements

The generated Pattern's actual per-color `beadCount` material requirements.

### Additional Refill Packs

The additional refill-pack count derived by `DerivedMaterialRequirementV1`
when a color requires more than the nominal 1,000 beads.

These concepts must not be renamed into or merged with one another.

## 7. Frozen Material Authority

The authoritative Pattern material source is:

```text
PublicPatternResult.materials
```

The frozen A03 implementation authority is commit
`4be9ce43477a7ced7764620ea05c61d0ee433186` (`refactor: unify derived material
requirements`).

The active production/application derived contract is:

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

The frozen formulas are:

```text
beadCount = PublicMaterialRequirement.beadCount
nominalBeadsPerColor = 1000
totalPacksRequired = ceil(beadCount / 1000)
additionalRefillPacks = max(0, totalPacksRequired - 1)
```

Results and Export must not recount the Pattern Matrix, use
`pattern.colors[].beadCount` as material quantity authority, create a second
active pack/refill formula, or add Commerce fields to
`DerivedMaterialRequirementV1`.

## 8. Export Contract

The only active customer-facing Export is the local PNG. Its frozen data flow
is:

```text
PublicPatternResult.materials
-> deriveMaterialRequirementsV1()
-> patternColorIndex mapping
-> pattern.colors display order
-> PNG Bead Requirements legend
```

- Legend display order remains `pattern.colors` order.
- Quantity authority comes only from derived materials.
- Material and display color identity are joined by `patternColorIndex`, not by
  array position.
- PNG does not independently calculate `totalPacksRequired` or
  `additionalRefillPacks`.
- PNG Generation Color Set metadata comes from the successful-generation
  snapshot, not an ungenerated Settings draft.
- A04 adds no PDF, CSV, SVG, XLSX, or other export contract.

## 9. Preserved Boundaries

- Recommendation Policy v1 is retained.
- Automatic Generation Color Set Recommendation remains **BLOCKED / INACTIVE**.
- `Pattern.boardLayout` remains the Pattern layout authority.
- `recommendBoardSetup()` remains separate, unchanged board-purchase
  recommendation behavior; no Board purchase policy is implemented by A04.
- Required and Recommended remain independent.
- Commerce-only concepts remain unfrozen.

Commerce-only concepts include `commerceQuantity`, Shopify product ID, Shopify
variant ID, SKU, product handle, price, inventory, cart line, cart quantity,
board SKU, purchase strategy, individual color pack strategy, and Required Set
plus refill strategy. They must not enter Pattern or
`DerivedMaterialRequirementV1`.

## 10. Historical Evidence Qualification

The pre-existing formula in
`scripts/evidence/e05-recommendation-policy-evaluation.ts` is an accepted frozen
historical evidence exception. It is not an active production/application
material consumer. A04 does not modify or reopen it, and historical evidence is
not rewritten merely for formal deduplication.

## 11. Verification Evidence

A04-A01 post-commit verification recorded:

- 131 test files passed;
- 1,495 tests passed and 0 failed;
- E05 dirty-production guard passed;
- TypeScript checks passed;
- production build passed;
- lint passed;
- focused Prettier on all six A04 implementation files passed;
- commit diff check passed; and
- worktree clean.

Full formatting reported exactly 10 pre-existing scope-external warnings. None
was an A04 implementation file, the check modified no file, and that unrelated
format debt was not repaired in A04.

## 12. Evidence Applicability Qualifications

A04 evidence is sufficient to freeze the repository code contract,
terminology semantics, material data source, unit/integration behavior,
TypeScript/build/lint correctness, and source-level Export geometry invariance.

It does not replace pixel-level PNG visual inspection, real-browser/device
Export clipping inspection, mobile/device accessibility acceptance, Shopify
acceptance, inventory/Commerce acceptance, production deployment smoke, or a
customer comprehension study.

The longest PNG metadata text considered is `Generation Color Set: 221-Color
Set`. The narrowest supported Export has a 1,024 px canvas width, 32 px text
start, 32 px right margin, 960 px available horizontal space, and `600 24px
system-ui, sans-serif` font. Reliable `measureText` or pixel-level screenshot
evidence was not obtained. No objective clipping was found and Export geometry
did not change, but residual visual risk remains an evidence applicability
qualification; pixel-level Export acceptance is not claimed.

## 13. Closure Decision

- No Material Contract defect was found in A04.
- A04 adopted a minimal terminology implementation.
- The A03 Material Authority remains frozen.
- A04 becomes frozen and closed when its governance commit is created.
- A04 does not automatically authorize any later product, Commerce, or
  Recommendation stage.
- Later work requires a separately and explicitly authorized stage.
