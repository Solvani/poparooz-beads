# P3-A02 Production Generation Runtime Activation Contract

Status: **Contract Frozen**

Date: **2026-08-04**

Accepted contract commit: **`da631da7e58ed43815a27a90b7de386fa2742007`**

Runtime Palette authority: [`POPAROOZ_RUNTIME_PALETTE_CONTRACT.md`](POPAROOZ_RUNTIME_PALETTE_CONTRACT.md)

Image-normalization authority: [`POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md`](POPAROOZ_IMAGE_INPUT_AND_NORMALIZATION_CONTRACT.md)

Quantization authority: [`POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md`](POPAROOZ_COLOR_QUANTIZATION_CONTRACT.md)

## 1. Scope and Activation Boundary

P3-A02 owns the composition boundary that converts the already approved Runtime
Palette and BoardProfile evidence into the immutable dependencies required by
the production `GenerationRuntime`.

Reviewing and later freezing this contract does not activate the production
generator. Activation requires separately authorized implementation,
verification, review, and project-control acceptance. Until then, the
application must continue to inject a safe unavailable `GenerationRuntime`.

P3-A02 may implement only:

- the permanent Runtime-to-Generation Palette adapter;
- the minimal Generation Palette contract;
- matcher eligibility decoupled from commerce state;
- the approved BoardProfile artifact, Provider, and generation adapter;
- the versioned ProcessingPolicy Provider;
- the production Maximum Colors boundary;
- synchronous pre-render Runtime composition;
- lazy Worker creation and deterministic disposal;
- fail-closed activation; and
- the tests and boundary checks required for those changes.

P3-A02 does not own catalog sellability, inventory, Shopify, Download, Get
Beads, Substitute application, shortage replacement, multi-Palette selection,
or a Phase 2 UI redesign.

## 2. Permanent Runtime Palette Adapter

The production boundary is permanently:

```text
RuntimePaletteSnapshot
-> Runtime-to-Generation Palette Adapter
-> GenerationPaletteSnapshot
```

The adapter belongs to production Runtime composition. It is not a Catalog
adapter and is not a temporary compatibility shim. It must consume one approved,
immutable `RuntimePaletteSnapshot` and publish one immutable
`GenerationPaletteSnapshot` without consulting a network, browser storage,
Catalog, inventory, Substitute data, or a legacy test fixture.

The adapter must not convert the Runtime Artifact into the legacy
`PaletteDefinition`, because doing so would require fictional commerce and
finish data.

## 3. Generation Palette Contract

The Generation Palette color contract contains exactly:

```text
code
hex
rgb
lab
sortOrder
active
autoMatchEligible
```

The Generation Palette must not contain:

```text
isSellable
referenceCode
supplier
finish
isSpecialFinish
productHandle
variantId
packSize
inventory
substitutes
```

The adapter may perform only the deterministic shape conversion needed by the
generation domain, including object-to-tuple RGB or Lab conversion. It must not
change values, ordering, active status, or automatic-match eligibility. Runtime
Palette v1 therefore yields `221` records, `221` active colors, and `221`
automatic-match-eligible colors.

## 4. Public Color Boundary

The internal `GenerationPaletteColor` contract and each customer-visible Public
Color record are separate projections. A customer-visible color record must
contain only:

```text
brand: the literal value "Poparooz"
code: the approved Poparooz customer-facing color code
hex: the approved color HEX value
name: optional, and only present when an approved customer-facing name exists
```

When no approved customer-facing name exists, the `name` property must be
omitted. It must not be `null`, empty, synthesized, or replaced with a color
code, `referenceCode`, supplier name, series name, `MARD`, or another
third-party brand name.

A customer-visible color record must not contain or reveal:

```text
referenceCode
supplier
supplier identifiers
finish
finishType
isSpecialFinish
isSellable
productHandle
variantId
inventory
packSize
catalog identifiers
MARD
provenance
substitutes
```

The production mapper must not fabricate legacy finish, sellability, supplier,
Catalog, or reference fields merely to satisfy an older schema. Public Color
publication must remain deterministic, and only Poparooz branding may be
visible to the customer.

This boundary applies to each public color record. It does not prohibit the
wider `PublicPatternResult` from containing its separately approved matrix,
counts, Board Layout, and generation-result fields. No customer-facing color
name is approved or added by this contract.

## 5. Matcher Contract

Automatic matching eligibility is exactly:

```text
active && autoMatchEligible
```

Catalog sellability, inventory, product availability, and Shopify state must
not affect candidate eligibility.

The accepted color-distance and deterministic tie-break rules remain:

```text
CIEDE2000 distance ascending
-> sortOrder ascending
-> code ascending
```

P3-A02 must not change CIEDE2000 mathematics or introduce a new distance
algorithm. It may change the matcher input contract and internal field names
only as required to remove legacy commerce and internal-reference coupling.

## 6. Finish Evidence

The approved formal data contains no approved finish evidence. Production
Generation therefore:

- does not infer finish;
- does not set finish to `false`;
- does not use an `unknown` placeholder;
- does not derive finish from a code, HEX value, series, historical brand, or
  compatibility data; and
- omits finish fields from its internal and public generation contracts.

The absence of finish evidence is represented by field absence, not by a
fabricated value. Historical legacy finish schema may remain for compatibility
until a separately authorized migration, but it must not be populated or read
by the production Runtime adapter.

## 7. BoardProfile Layers and Evidence

The production BoardProfile boundary is:

```text
ApprovedBoardProfileArtifact
-> ApprovedBoardProfileProvider
-> BoardProfile-to-Generation Adapter
-> GenerationBoardProfileSnapshot
```

The approved v1 evidence is:

```text
boardProfileId: poparooz-board-104
boardProfileVersion: 1.0.0
status: approved
shape: square
columns: 104
rows: 104
outerWidthMm: 280
outerHeightMm: 280
thicknessMm: 2
firstToLastPegCenterSpanMm: 278
pegIntervalCount: 103
connectable: true
sharedEdgePegs: false
seamPegCenterDistanceMm: 2.3
seamSpacing: non-uniform
defaultForV1: true
```

The authoritative internal peg pitch is the derived value:

```text
278 / 103 mm
```

`2.70 mm` is the rounded display value only. Validation and generation must not
treat `2.70` as an exact replacement for `278 / 103`.

No approved evidence defines `beadSizeMm`; it must not be inferred from peg
pitch, board dimensions, thickness, or seam spacing. The `78 × 78` and `52 × 52`
candidate boards are not enabled in v1. Seam spacing does not change Pattern
Matrix dimensions, and board counts continue to use `104 × 104` cells per board.

## 8. ProcessingPolicy

The minimal versioned production ProcessingPolicy is:

```text
policyId = poparooz-processing-policy
policyVersion = 1.1.0

imageNormalization:
  preserveAspectRatio = true
  fit = contain
  allowUpscale = false
  transparentOccupancyThresholdByte = 32

quantization:
  alphaThresholdByte = 16
  maxColors:
    minimum = 2
    default = 32
    maximum = 64
```

The Alpha comparison remains the accepted 8-bit rule:

```text
alpha <= 16 -> transparent position
alpha > 16  -> quantization participant
```

Background mode and target dimensions are customer settings and are not fixed
ProcessingPolicy fields.

For `background = transparent`, version `1.1.0` freezes a conservative,
deterministic, browser-local cleanup pipeline:

```text
browser source raster
-> strict source edge-connected near-white mask
-> bounded source matte refinement when the source has no alpha
-> deterministic contain resize
-> one-layer post-resize edge-connected light-fringe cleanup
-> transparent occupancy canonicalization
-> existing quantization
```

The strict source mask uses four-connectivity and requires `alpha = 255`, every
RGB channel at least `248`, and channel spread at most `6`. It fails open when
there is no strict edge-connected ownership or when exclusion would remove the
entire quantizable image.

For opaque sources only, the bounded source matte refinement may extend from
the strict mask through four-connected neutral candidates whose channels are
at least `242`, whose channel spread is at most `6`, and whose RGB sum is at
least `3` greater than a retained opaque neighbor. Values below `242`, including
`241`, are not candidates. The refinement is not applied if it would remove
every source pixel beyond the strict mask.

After resize, strict edge-connected cleanup retains the `248` / `6` rule. One
additional four-connected fringe layer may exclude neutral candidates whose
channels are at least `232`, whose channel spread is at most `8`, and whose RGB
sum is at least `48` greater than a retained opaque neighbor. No additional
growth layer is allowed.

Transparent occupancy is then canonicalized independently of quantization:

```text
alpha <= 32 -> RGBA 0 / transparent Pattern position / no bead
alpha >= 33 -> original RGB retained / alpha canonicalized to 255 / occupied
```

`background = white` bypasses this transparent-only cleanup. The quantizer's
existing `alphaThresholdByte = 16` remains unchanged and is not a substitute
for the occupancy policy.

Tinted matte contamination that cannot be distinguished safely from legitimate
subject color is an accepted v1 limitation. Option D tinted-white-matte
reconstruction was investigated and stopped because no safe parameter window
was established. It is not implemented, and this contract does not authorize
reconstruction, decontamination, relaxed thresholds, additional growth layers,
or changes to the Matcher, Palette, Color Set, or Maximum Colors semantics.

The following are Runtime invariants rather than configurable ProcessingPolicy
fields:

```text
Worker automatic retry = disabled
Result publication = atomic
```

The Provider must return an immutable, versioned Policy snapshot. Missing,
unknown, partial, or invalid Policy data must keep the production Runtime
unavailable.

## 9. Maximum Colors Layers

The production product boundary is:

```text
UI / Settings / Production Runtime: 2..64
Default: 32
```

The lower-level engineering boundary remains:

```text
Worker protocol / Quantizer: 1..512
```

The `512` limit is an engineering protection limit, not a customer product
limit. P3-A02 must not reduce or otherwise modify the frozen quantization
algorithm's engineering range.

The Production Runtime must validate `2..64` again before creating a Worker
client. Invalid values fail closed. Values must never be clamped, rounded,
coerced, or replaced by a silent fallback.

## 10. Synchronous Runtime Bootstrap

Production Runtime composition occurs synchronously before React render:

```text
Palette Provider
-> Palette Adapter
-> Board Provider
-> Board Adapter
-> ProcessingPolicy Provider
-> Worker Factory
-> createGenerationRuntime
-> App render
```

Only two public application states are allowed:

```text
complete available Runtime
safe unavailable Runtime
```

No partial Runtime may enter application state. Runtime activation must not be
performed by a React effect, during render, through a StrictMode lifecycle, or
as an asynchronous post-render transition. Any dependency or validation
failure must result in the safe unavailable Runtime before the first render.

The existing Phase 2 availability and controller boundaries should be reused.
P3-A02 does not authorize a state-machine or UI redesign.

## 11. Runtime and Worker Lifetime

Each application startup creates exactly one immutable `GenerationRuntime` and
one `GenerationService` when all dependencies validate successfully. React
render and StrictMode effects do not create either object.

Startup does not create a real Worker. A Worker is created lazily only when an
accepted generation job reaches quantization. The Worker client and Worker are
disposed after generation success, failure, or cancellation. Runtime v1 does
not automatically retry a Worker failure.

Partial results never enter public state. A successful result is published
atomically only for the active job under the existing controller and reducer
rules.

## 12. Commerce Boundary

P3-A02 does not delete or comprehensively migrate the legacy `packSize` schema.
However, the production Generation Runtime must not read, populate, or output
`packSize`, and it must not calculate or output `packsRequired`.

Production generation must not consume or expose:

- sellability;
- inventory;
- Shopify identifiers or state;
- Substitute relationships;
- shortage-replacement behavior; or
- catalog pack calculations.

The complete Commerce migration remains deferred to a later authorized phase.

## 13. Fail-closed and Safe Errors

Palette, adapter, BoardProfile, ProcessingPolicy, Worker factory, or Runtime
composition failure keeps `GenerationRuntime` unavailable. There is no legacy,
fixture, empty, partial, cached, or remote fallback.

Customer-visible UI and errors must not contain:

```text
Hash
Lock
schema internals
Zod details
paths
stack traces
Formal source
provenance
MARD
Substitute records
```

Errors must use existing stable unavailable Runtime and safe customer-message
boundaries. Internal logs must not contain user images, pixel data, file paths,
or source content.

## 14. Deferred Work

This contract does not authorize:

- production code implementation by itself;
- catalog sellability or inventory policy;
- `packSize` migration or pack calculation;
- Shopify integration;
- Download or Get Beads;
- Substitute matching, UI, or automatic replacement;
- multi-Palette or multi-Board selection;
- enabling the `78 × 78` or `52 × 52` candidate boards;
- modification of Phase 1 color, quantization, or image algorithms;
- Phase 2 UI redesign; or
- production activation without the required implementation and final review.
