# P3-A02-A04 BoardProfile Provider and Generation Input Contract

## 1. Status and Authority

```text
Stage: P3-A02-A04
Name: BoardProfile Provider and Generation Input Wiring
Status: Contract Frozen / Implementation Pending
```

This contract is subordinate to the frozen
[`POPAROOZ_PRODUCTION_GENERATION_RUNTIME_ACTIVATION_CONTRACT.md`](POPAROOZ_PRODUCTION_GENERATION_RUNTIME_ACTIVATION_CONTRACT.md)
and the frozen BoardProfile v1 evidence in
[`PROJECT_STATE.md`](PROJECT_STATE.md). It only details the implementation
contract for P3-A02-A04. It does not modify any parent frozen decision and does
not authorize implementation or production Runtime activation.

## 2. Frozen BoardProfile v1 Facts

```text
id: poparooz-board-104
version: 1.0.0
status: approved
shape: square
peg grid: 104 × 104
outer dimensions: 280 × 280 mm
thickness: 2 mm
first-to-last peg center span: 278 mm
internal peg interval count: 103
internal pitch authority: 278 / 103
tiling supported: true
shared edge pegs: false
adjacent seam peg-center distance: 2.3 mm
seam type: non-uniform
```

`2.70 mm` is a rounded display approximation only. It is not the authoritative
calculation value stored in the Artifact. The `78 × 78` and `52 × 52` boards are
disabled candidates and must not enter the Artifact, Provider, generation
Snapshot, or production bundle.

## 3. ApprovedBoardProfileArtifact Contract

The sole approved v1 Artifact has exactly this contract:

```ts
type ApprovedBoardProfileArtifact = Readonly<{
  id: 'poparooz-board-104';
  version: '1.0.0';
  status: 'approved';
  shape: 'square';

  pegGrid: Readonly<{
    columns: 104;
    rows: 104;
  }>;

  outerDimensionsMm: Readonly<{
    width: 280;
    height: 280;
    thickness: 2;
  }>;

  firstToLastPegCenterSpanMm: 278;
  internalPegIntervalCount: 103;

  tiling: Readonly<{
    supported: true;
    sharedEdgePegs: false;
    seamAdjacentPegCenterDistanceMm: 2.3;
    seamType: 'non-uniform';
  }>;
}>;
```

The Artifact must not contain:

```text
name
beadSizeMm
isDefault
isActive
rounded pegPitchMm
candidate profile arrays
registry
source paths
evidence paths
internal comments
derived physical finished-size values
```

## 4. Provider Contract

The approved BoardProfile Provider is browser-safe production infrastructure.
It must:

- import only the sole approved Artifact;
- accept no user-supplied profile ID;
- expose no registry or profile-selection behavior;
- validate strictly and fail closed;
- defensively clone approved data;
- return a deeply frozen Snapshot; and
- reject invalid, partial, unknown, unsupported, or candidate data.

No fixture, legacy, cached, remote, empty, or partial fallback is permitted.
The raw imported JSON must not be exposed as a mutable public object. A04 does
not add a compiler, Manifest, Lock, hash gate, or Node publication pipeline.

## 5. GenerationBoardProfileSnapshot Exact Whitelist

The generation-only Snapshot contains exactly:

```ts
type GenerationBoardProfileSnapshot = Readonly<{
  id: 'poparooz-board-104';
  version: '1.0.0';
  shape: 'square';

  pegGrid: Readonly<{
    columns: 104;
    rows: 104;
  }>;

  tiling: Readonly<{
    supported: true;
    sharedEdgePegs: false;
  }>;
}>;
```

No other field is allowed. In particular, the Snapshot excludes:

```text
status
name
beadSizeMm
isDefault
isActive
outerDimensionsMm
firstToLastPegCenterSpanMm
internalPegIntervalCount
seamAdjacentPegCenterDistanceMm
seamType
pegPitchMm
physical finished-size values
candidate profiles
```

Approved status is guaranteed at the Provider and adapter boundaries. The
Generation Snapshot carries only the approved identity, one-board logical peg
capacity, and tiling semantics required by generation. The adapter must
defensively copy and deeply freeze its output. The Production Generation
Service must not also accept a Legacy BoardProfile.

## 6. Pattern and Board-layout Mapping

```text
Pattern width / height
= target pattern peg dimensions

pegGrid.columns / rows
= one physical board's logical peg capacity

boardColumns
= ceil(patternWidth / pegGrid.columns)

boardRows
= ceil(patternHeight / pegGrid.rows)

boardCount
= boardColumns * boardRows
```

Tiles are row-major logical board partitions. Each tile contains its matrix
origin, covered peg width and height, bead count, transparent covered
positions, and unused capacity outside the Pattern.

Tiles are not millimeter coordinates, download pages, or rendering pages. The
`2.3 mm` seam does not change the Pattern Matrix or board count, and the
non-uniform seam is not calculated in A04. The values `280`, `278`, `278 / 103`,
and `2.3` must not enter the tile-count algorithm.

## 7. Public and Legacy Boundary

- The Production Generation Service accepts only a
  `GenerationBoardProfileSnapshot`.
- Production Pattern code does not import the Provider, Artifact, fixtures,
  evidence, or a Legacy BoardProfile schema.
- UI code does not call the Provider and is not a BoardProfile source of truth.
- Legacy BoardProfile types, schemas, and fixtures may remain temporarily for
  legacy or test consumers, but they must not enter production generation
  composition.
- Compatibility code must not fabricate `name` or `beadSizeMm`.
- If an existing public result contains `boardProfileName`, A04 implementation
  must remove it or replace it with the approved `boardProfileId` and
  `boardProfileVersion`; it must not invent a display name.

## 8. Dependency Direction

```text
Approved BoardProfile Artifact
  -> Approved BoardProfile Provider
    -> BoardProfile-to-Generation Adapter
      -> Application Composition Root
        -> Generation Service dependency
          -> Pattern pure input
```

The following dependencies are forbidden:

- Pattern importing the Provider;
- Pattern importing the Artifact;
- domain code importing infrastructure;
- UI importing the Provider;
- Service accepting both Legacy BoardProfile and the generation Snapshot; and
- fixtures entering the production graph.

## 9. Fail-closed and Bootstrap Behavior

The Provider and adapter run synchronously before React render. Any
BoardProfile failure keeps Production `GenerationRuntime` unavailable and must
not activate a Worker. The Service must validate the Snapshot before invoking
the Worker factory.

The outward safe reason remains the existing `board-profile-unavailable`,
unless an existing frozen error contract requires a more precise value. Errors
must not reveal Zod details, paths, stacks, Artifact content, or internal
evidence. Neither a partial Provider nor a partial Snapshot may be returned.

## 10. Explicitly Deferred

P3-A02-A04 does not authorize:

```text
BoardProfile value changes
physical finished-size calculations
multi-board physical dimensions
peg-center coordinate calculations
ProcessingPolicy
Production Runtime activation
Worker wiring
UI redesign
Download/PDF/PNG
Get Beads
Shopify
inventory
substitutes
fixed Color Set Profiles
automatic image sizing
Runtime Palette
matcher
CIEDE2000
Commerce pack calculations
candidate profile activation
```

## 11. Acceptance Gates

Future A04 implementation acceptance requires all of the following:

- one sole approved v1 Artifact;
- a strict schema;
- deeply frozen Provider and adapter outputs;
- no Legacy BoardProfile in the production generation chain;
- fail-closed validation before Worker creation;
- `104` boundary tests;
- non-square Pattern tests;
- candidate rejection tests;
- import-boundary tests;
- a production bundle boundary check;
- unchanged UI except where removal of an unapproved name requires a narrow
  change;
- Production Runtime remaining unavailable;
- Runtime Palette verification remaining `221 / 221 / 221`;
- unchanged Runtime Artifact and Lock hashes;
- passing tests, build, lint, Prettier, and diff checks; and
- no dependency or lockfile change.
