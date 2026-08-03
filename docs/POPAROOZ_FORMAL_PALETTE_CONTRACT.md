# P3-D01 Formal Palette Contract

Status: **Accepted and Frozen**

Date: **2026-08-03**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

## Scope

This decision defines the minimum schema compatibility foundation for a future formal Poparooz Palette. P3-A01.1 extends identity and optional-name contracts only. It does not import formal Palette rows, create a production Palette artifact, or make the production generation runtime available.

## Formal internal identity

`POPAROOZ` is the internal `referenceSystem` identity for the formal Poparooz Palette. A formal Poparooz Palette must not be represented as `MARD`.

`MARD` remains accepted only for the historical internal reference system and the frozen Phase 1 fixtures and tests that rely on it. The strict reference-system allowlist is therefore:

```text
MARD
POPAROOZ
```

No other value, case variant, whitespace-normalized variant, or free-form string is accepted. A `PaletteDefinition.referenceSystem` must exactly match every contained `PaletteColor.referenceSystem`.

## Customer color identity

Customer color codes use letters and numbers, such as `A1`, `B16`, and `M15`, within the existing safe display-code grammar. Public `code` continues to be projected only from internal `displayCode`.

The first formal Palette version may omit an English display name. Internally this is represented by an absent `displayName`, not an empty string. If `displayName` is present, it must pass the existing trimmed, non-empty, customer-safe validation.

The public projection follows these rules:

- when `displayName` exists, output `name` with its validated value;
- when `displayName` is absent, omit the `name` property entirely;
- never synthesize a placeholder, copy an internal reference name, or emit an empty name.

## Public boundary

Public Palette objects remain strict allowlist projections. `referenceSystem`, `referenceCode`, `referenceName`, `referenceSeries`, provenance fields, and other internal-only fields remain excluded. Supporting `POPAROOZ` as an internal reference identity does not expose `referenceSystem` through `PublicPaletteColor` or `PublicPatternResult`.

## Frozen computation boundary

P3-A01.1 does not change HEX, RGB, Lab, `rgb8ToLab`, CIEDE2000, matching eligibility, distance epsilon, tie-break ordering, quantization, Pattern Matrix, or any Phase 2 visual, layout, responsive, or interaction contract. Formal HEX to RGB to Lab compilation remains a later, separately accepted task.

## Availability boundary

No formal 221-color Palette file or runtime artifact is created by P3-A01.1. The production Palette and production generation runtime remain unavailable after this contract foundation.

## P3-A01.2 source-model foundation

P3-A01.2 adds a script-layer model for approved source records before any runtime Palette is compiled. The boundary is:

```text
source manifest -> normalized records -> HEX-derived RGB8 and Lab -> canonical records
```

It deliberately stops before a canonical runtime CSV, `PaletteDefinition`, provider, or generator runtime.

### Source Manifest

The strict Source Manifest stores these fields in `scripts/palette/formal/formal-palette.schema.ts`:

- schema identity: `schemaVersion`, `paletteId`, and `paletteVersion`;
- formal identity: `brand = "Poparooz"` and `referenceSystem = "POPAROOZ"`;
- completeness and order: `recordCount` and explicit `seriesOrder`;
- source evidence: `sourceFileName`, `sourceFileSha256`, and `canonicalRecordsSha256`;
- policy statements: `digitalColorPolicy = "source_declared"`, `physicalColorPolicy = "unverified"`, and `displayNamePolicy = "optional_approved_only"`;
- lifecycle: `status`, `createdAt`, optional approval fields, and optional `supersedes`.

The formal zero-based series ranks are derived from the fixed order `A, B, C, D, E, F, G, H, M`. `approvedAt` and `approvedBy` are required together for an approved manifest and forbidden for all non-approved states.

### Normalized colors

Each normalized record contains `code`, `series`, `seriesNumber`, zero-based `seriesRank`, zero-based `canonicalSourceIndex`, `hex`, optional `displayName`, `displayNameStatus`, digital and physical color status, and the internal `sourceLocation` coordinates.

Codes use an approved uppercase series plus a positive integer without a leading zero. `canonicalSourceIndex` is a unique, contiguous `0..recordCount-1` source-audit position. It is not a runtime tie-break or business sort field. Cross-record validation rejects count mismatches, duplicate codes, duplicate HEX values, duplicate or non-contiguous canonical indexes, and rank/order mismatches without silently repairing or deduplicating data.

`sourceLocation` is internal evidence only. It stores sheet, positive row, and positive column coordinates; it does not store a full source row and is excluded from the compiled color core and all existing public projections.

### Numeric color derivation

Strict uppercase `#RRGGBB` HEX is the sole numeric color source. RGB8 is parsed deterministically from its three byte pairs. Lab is then derived by calling the existing frozen `rgb8ToLab` implementation. RGB and Lab are never accepted as independent normalized inputs.

The script compiler emits only the limited color core needed for a later adapter: code identities, optional approved display name, HEX, derived RGB and Lab tuples, and deterministic `sortOrder`. The order is assigned after sorting by `seriesRank` and `seriesNumber`; it never copies `canonicalSourceIndex`. Runtime policy fields are neither defaulted nor emitted.

### Canonical serialization and hashes

Canonical record serialization first orders records by `canonicalSourceIndex` and then explicitly reconstructs every object in the documented schema field order. It uses JSON encoded as UTF-8 for hashing, two-space indentation, LF line endings, and exactly one final newline. The result is independent of input array order and source-object property insertion order.

Two SHA-256 boundaries remain distinct:

- `sourceFileSha256` hashes the exact original source-file bytes;
- `canonicalRecordsSha256` hashes the canonical normalized-record UTF-8 bytes.

Both use Node's standard `node:crypto` implementation in the scripts layer and produce 64 lowercase hexadecimal characters. Browser and domain runtime code do not import Node crypto.

### Current availability and evidence status

The included four-record fixture is explicitly **TEST ONLY / NON-PRODUCTION**. It is a draft, uses synthetic hashes, declares only digital source data, and keeps physical color status `unverified`. P3-A01.2 does not read the formal XLSX, import the formal 221 colors, generate a runtime Palette, fill runtime policy, or enable Production Runtime.
