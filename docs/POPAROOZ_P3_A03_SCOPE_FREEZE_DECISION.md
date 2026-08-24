# Poparooz P3-A03 Product Scope Freeze Decision

Stage: `P3-A03-SCOPE-A01`

Status: **GOVERNANCE SYNCHRONIZED / SCOPE CLOSURE COMPLETE**

## Audit Decision

```text
PRODUCT COMPLETENESS AUDIT: COMPLETE
NO P0 FOUND IN REPOSITORY-LEVEL AUDIT
SCOPE FREEZE RECOMMENDED WITH GOVERNANCE CORRECTIONS
PRODUCTION IMPLEMENTATION RESUME: CONDITIONAL
```

The no-P0 conclusion is limited to repository code contracts and accepted
evidence. It is not new iPhone or Android real-device acceptance,
keyboard/screen-reader acceptance, representative performance acceptance,
Shopify Cart/variant/inventory acceptance, or complete live-production
acceptance.

## Current Core Product

The browser-local generator can accept a supported image, generate and display
a Pattern, expose Poparooz color and material information, and download a local
PNG. The lightweight React/TypeScript/Vite application, local Worker processing,
static deployment, and Shopify iframe remain appropriate. No general backend,
account system, database, or cloud image/project storage is required for the
current scope.

## Frozen Generation and Recommendation Decisions

The only formal Generation Color Sets are:

```text
24 / 48 / 72 / 120 / 168 / 221
```

Profiles `96`, `144`, and `192` must not be reintroduced. Frozen production
algorithm boundaries, including Background Removal v1 Conservative, production
area-average sampling, Quantizer, Matcher, Runtime Palette, ProcessingPolicy,
BoardProfile, and Pattern semantics, are unchanged.

P3-A03-E05-D04 automatic Generation Color Set Recommendation remains:

```text
BLOCKED
NOT ACTIVATED
NOT PLANNED FOR CURRENT PRODUCTION SCOPE
```

It must not be reopened by more threshold tuning, additional reviewers over the
same evidence, or another deterministic rule over the same validation set.

This does not supersede P3-A03-E05-D02 Recommendation Policy v1:

```text
Recommended Bead Set = Required Bead Set
```

Required and Recommended remain semantically independent. Any customer-facing
removal, merge, or rename requires a separate Results / Materials Decision that
explicitly supersedes the applicable frozen policy.

## Subsequent A02 Qualification

P3-A03-SCOPE-A02 was subsequently completed and frozen with applicability
qualifications. It retained Recommendation Policy v1 and did not supersede its
frozen E05/D02 evidence. It selected a customer-facing presentation that keeps
Required and Recommended semantically independent rather than removing, merging,
or renaming them.

Recommendation Policy v1 now has an explicit post-generation-only application:
it evaluates the already-generated current Pattern as a material policy. It does
not select a Generation Color Set or trigger regeneration. The complete A02
authority is
[`POPAROOZ_P3_A03_SCOPE_A02_RESULTS_MATERIALS_DECISION.md`](POPAROOZ_P3_A03_SCOPE_A02_RESULTS_MATERIALS_DECISION.md).

## Subsequent E05-A00 / A01 Recommendation Closure

P3-A03-E05-A00 completed a read-only audit and concluded:

```text
CURRENT AUTOMATIC RECOMMENDATION DIRECTION BLOCKED
```

The conclusion applies to the current DeltaE00, structural-feature, and
adjacent-transition automatic Generation Color Set recommendation direction.
It is not a claim that all future smart recommendation is impossible.

P3-A03-E05-A01 separately authorizes the customer-presentation change required
by this conclusion. Manual Generation Color Set selection and its exact six
formal profiles remain active. Required Bead Set, Bead Requirements, and
Additional Refill Packs remain active and visible. Auto, Recommended for Your
Image, and Recommended Bead Set are not active customer presentation.

Recommendation Policy v1, its tests, the Recommended Bead Set semantic
contract, and historical evidence remain retained. Required and Recommended
remain semantically independent. This presentation closure does not activate a
Generation Color Set recommendation or reinterpret Required as Recommended.
Reopening requires a new mechanism-level hypothesis, independent evidence, and
separate authorization; D04 threshold rescue against the same validation
evidence is prohibited.

## Material Requirement Governance

The existing Pattern-domain `MaterialRequirement`, `PublicMaterialRequirement`,
and `buildMaterialRequirements()` remain authoritative for final Pattern
per-color bead counts. P3-A03-SCOPE-A03 subsequently froze
`PublicPatternResult.materials` as the input to the active
`DerivedMaterialRequirementV1` production/application projection. Results and
Export must derive from that source rather than recount the Pattern Matrix, use
`pattern.colors[].beadCount` as quantity authority, or create a competing
material truth source.

The frozen nominal quantity and refill calculation are:

```text
NOMINAL_BEADS_PER_COLOR = 1000
additionalRefillPacks = max(0, ceil(beadCount / 1000) - 1)
```

Future commerce work must preserve the distinct calculation:

```text
totalPacksRequired = ceil(beadCount / 1000)
```

`totalPacksRequired`, `additionalRefillPacks`, and future `commerceQuantity` are
not interchangeable. `commerceQuantity` is not frozen because the purchase
strategy—individual color packs or a complete Required Bead Set plus refills—has
not been selected.

## Subsequent A03 and A04 Closure

P3-A03-SCOPE-A03 is **COMPLETED / FROZEN / COMMITTED / PUSHED / CLOSED WITH
FROZEN EVIDENCE APPLICABILITY QUALIFICATION**. Its implementation commit is
`4be9ce43477a7ced7764620ea05c61d0ee433186` (`refactor: unify derived material
requirements`). The A03 Material Authority remains frozen.

P3-A03-SCOPE-A04 is **COMPLETED / FROZEN / CLOSED WITH EVIDENCE APPLICABILITY
QUALIFICATIONS**. Its implementation commit is
`2e5d7e2bf7c45bb0e269c6bbf299099a0347fa1f` (`fix: clarify generation color set
terminology`). A04 found no Material Contract defect and made a minimal
terminology implementation:

```text
MINIMAL TERMINOLOGY IMPLEMENTATION
NO MATERIAL CONTRACT DEFECT
```

- **Generation Color Set** is frozen as the canonical active customer-facing
  term;
- **Bead Color Set** is deprecated for active customer-facing use;
- Settings, Results Pattern Summary, and local PNG use the canonical term;
- PNG quantity authority remains derived from `PublicPatternResult.materials`,
  joined by `patternColorIndex`, with `pattern.colors` display ordering; and
- Required Bead Set, Recommended Bead Set, Bead Requirements, and Additional
  Refill Packs remain separate.

A04 does not implement Commerce, Shopify purchase mapping, Board purchase
policy, automatic Generation Color Set Recommendation, Email Gate, deployment,
or image-algorithm changes. It does not claim pixel-level PNG visual or clipping
acceptance. Later work requires a separately authorized stage.

## Shopify Catalog and Privacy Boundary

Formal Generation Color Set identity is independent from Shopify catalog or
product identity. A Generation Profile must not be assumed to equal a Shopify
product. Future purchase work requires authoritative public-code-to-variant
mapping, pack size, sellability/status, and inventory behavior. Catalog data
must not alter the Generation Palette, Pattern color identity, formal profile
membership, or Required calculation.

Current production iframe messages remain limited to:

```text
generator.ready
generator.resize
```

Raw images, Pattern content, and material data do not cross the current
generator-to-Shopify boundary. A future separately reviewed Commerce contract
may authorize, only after explicit customer action, a bounded payload containing
approved public Poparooz color codes and approved commerce quantities. That
exception is a candidate, not current authorization or implementation.

Source images, pixels, filenames, paths, file metadata, Pattern Matrix data,
image or Pattern hashes, internal/reference/supplier identity, and arbitrary
generator state remain prohibited.

## Priority and Exclusions

P1 work is limited to:

- governance synchronization;
- Results / Recommendation decision;
- one derived Material Requirement contract based on Pattern-domain truth;
- current real-device/browser, keyboard/accessibility, and representative
  performance acceptance;
- a separately frozen Shopify Purchase Contract; and
- Add All Beads only after that contract is approved.

Analytics is required before meaningful commercial funnel experimentation or
optimization, but is not a blocker for Results / Materials governance. Build or
result identity and customer-support diagnostic identity remain P2 unless later
support evidence elevates them.

The following remain deferred or outside current production scope:

- automatic Generation Color Set Recommendation;
- Email Download Gate and email verification backend;
- HEIC decoding without real-device evidence;
- accounts, login, general database, and cloud Pattern/project storage;
- generic Feature Flag or Ops/Remediation platforms and remediation logs;
- mandatory PDF; and
- CSV expansion.

## Authorized Sequence

1. Governance Synchronization / Scope Closure.
2. Results / Materials Decision.
3. Unified derived Material Requirement contract.
4. Export terminology and material contract.
5. Current mobile/browser, keyboard/accessibility, and representative
   performance acceptance.
6. Shopify Purchase Contract.
7. Add All Beads implementation only after contract approval.
8. Analytics and support hardening according to evidence.
9. Final Generator UX Polish.
10. Shopify Theme / Store Polish.

Email is not on the critical path. This document authorizes no production
implementation. Production work may resume only through the separately
authorized sequence above, beginning with the Results / Materials Decision.

Sequence progress after this historical A01 decision: step 2 was completed and
frozen by P3-A03-SCOPE-A02; step 3 was completed and frozen by
P3-A03-SCOPE-A03; and step 4 was completed and frozen by P3-A03-SCOPE-A04.
Progress to any later step requires separate explicit authorization.

## Git Baseline

The accepted repository baseline entering this governance stage is:

```text
branch: main
HEAD: 71e601ff3d1e17a779d8d01aa906eb6816af4697
origin/main: 71e601ff3d1e17a779d8d01aa906eb6816af4697
ahead / behind: 0 / 0
worktree: clean
```

Any later governance-only commit may advance repository HEAD without changing
production behavior. This document intentionally does not predict its SHA.
