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

## P3-A01.3 formal source compilation

P3-A01.3 compiles the approved source workbook through the Node-only ExcelJS tool boundary. The compiler verifies the exact source SHA-256 before parsing, requires the fixed `Sheet1` and `替代色参考` layouts, validates the complete dataset in memory, and only then publishes versioned source artifacts. It does not generate a `PaletteDefinition`, create a Runtime Palette Provider, or activate Production Runtime.

### Versioned source package

The source package is stored under:

```text
data-source/palettes/poparooz-standard/1.0.0/
```

It contains the sole approved source workbook plus the manifest, normalized records, canonical records, internal color-derivation audit, and separate Palette and substitute validation reports. First publication is copy-first: the incoming workbook remains an ignored intake copy before, during, and after publication. The compiler never deletes, moves, renames, overwrites, or otherwise cleans up incoming files. The authoritative formal source is `data-source/palettes/poparooz-standard/1.0.0/source/Poparooz色卡.xlsx`; the temporary intake path is `data-source/incoming/Poparooz色卡.xlsx`. Its byte SHA-256 remains:

```text
5508b4c0e2060c1bd3ce5afcea9591c62cd26f2c924179143b95daa17e04a71e
```

All generated text artifacts use UTF-8, LF line endings, a fixed field order, a fixed record order, and exactly one trailing newline. They contain no execution timestamp, absolute path, user or machine identity, process ID, UUID, or random value. The fixed source lifecycle timestamps are `2026-08-03T00:00:00.000Z`.

### Palette compilation

The fixed worksheet column pairs are `A/B`, `D/E`, `G/H`, `J/K`, `M/N`, `P/Q`, `S/T`, `V/W`, and `Y/Z` for series `A, B, C, D, E, F, G, H, M`. Source-audit order is Excel row first and series column second. Business order is series rank followed by series number; `canonicalSourceIndex` never acts as business `sortOrder`.

The approved series counts are:

```text
A 26
B 32
C 29
D 26
E 24
F 25
G 21
H 23
M 15
Total 221
```

Every record omits `displayName`, declares `displayNameStatus = "not_provided"`, `digitalColorStatus = "source_declared"`, and `physicalColorStatus = "unverified"`. HEX remains the sole numeric source. Audit derivation calls the frozen `rgb8ToLab` path through `HEX -> RGB8 -> Lab`; RGB and Lab are not read from historical CSV data.

The deterministic `color-derivation-audit.json` is internal source-audit evidence. It records all 221 colors in `canonicalSourceIndex` order, with formal business `sortOrder`, RGB8 parsed directly from HEX, and Lab derived only through the frozen `rgb8ToLab`. Lab values are rounded to 12 decimal places for audit serialization only. This audit rounding does not modify the frozen conversion or future Runtime matching inputs, and RGB/Lab are not added to substitute data or any customer-facing Runtime contract.

### Substitute reference compilation

The `替代色参考` worksheet compiles 67 reference-only bidirectional relationships. Endpoints are normalized into formal Palette business order and use deterministic `<codeA>--<codeB>` relation IDs. Reverse duplicates and self-relations are forbidden. Both endpoint codes must exist in the formal Palette, and both worksheet HEX values must exactly match their formal Palette records.

The fixed level mapping and counts are:

```text
高替代      -> high             9
常规替代    -> regular          22
小面积替代  -> small_area_only  36
Total                            67
```

The substitute dataset remains `status = "reference_only"`, `physicalValidationStatus = "unverified"`, and `applicationPolicy = "disabled"`. It is audit evidence only and must not participate in default color matching, tie-break behavior, or Runtime generation.

### Fail-closed boundary

An incorrect source hash, missing or reordered worksheet, changed fixed layout or header, incomplete series, duplicate code or HEX, invalid code or HEX, derivation failure, missing substitute endpoint, endpoint HEX mismatch, reverse duplicate, self-relation, invalid `ΔE00`, invalid level, or count mismatch blocks publication. Failure paths do not produce an approved source package.

The compiled source package deliberately excludes matching eligibility, selling state, finishes, pack sizes, product handles, variant IDs, catalog inventory, and Production Runtime activation.

### Publication, recovery, and exact inventory

First publication reads, hashes, compiles, and validates the incoming workbook entirely in memory before creating staging. It then writes every text artifact, copies the workbook to `staging/source`, verifies the exact staging inventory and every byte, atomically renames staging to the formal version directory, verifies the exact formal inventory and every byte again, and returns with `incomingRetained = true`. The incoming file remains byte-identical throughout this process.

`data-source/incoming/*` is excluded by `.gitignore`, while `data-source/incoming/.gitkeep` keeps the intake directory in the repository. The `.gitkeep` file is not a formal package member. Users may manually delete their local intake copy after independently confirming successful publication; the presence or absence of that copy does not change formal package identity. No cleanup quarantine exists in this lifecycle.

Interrupted states are fail-closed:

- incoming plus staging, without formal, rebuilds staging from the hash-verified incoming source and retains incoming;
- matching incoming plus formal verifies both and returns `incomingRetained = true` and `incomingMatchesFormalSource = true` without mutating either file;
- a different-hash incoming plus formal preserves both, leaves formal unchanged, and fails closed with `SOURCE_INPUT_CONFLICT` because the input may belong to a future version;
- formal without incoming performs normal deterministic recompilation and byte verification;
- formal plus stale staging, without incoming, requires complete formal verification before stale staging is removed;
- staging as the only remaining source is never silently published or deleted and returns a stable recovery-required error.

The approved formal package inventory is exactly:

```text
source/Poparooz色卡.xlsx
manifest.json
normalized-palette.json
canonical-palette-records.txt
color-derivation-audit.json
palette-validation-report.json
normalized-substitutes.json
canonical-substitute-records.txt
substitute-validation-report.json
```

Missing files, extra files, extra directories, source-hash differences, and artifact byte differences fail verification. The sibling `.compile-tmp` staging directory, the ignored incoming intake copy, and `.gitkeep` are not part of the formal package inventory.

### Node-only and error boundaries

ExcelJS and all formal XLSX compiler modules remain Node-only offline tooling. The automated boundary gate explicitly loads the repository's real `vite.config.ts` in production/build mode, overrides only the temporary output directory and module-capture plugin, captures the Rollup module graph, and fails if it loads ExcelJS, `scripts/palette/formal`, or the formal XLSX compiler. A separate static gate rejects those imports from `src/**`.

Compiler and publication failures use centralized typed error codes. The offline CLI exposes stable high-level categories such as `WORKBOOK_LAYOUT_INVALID`, `PALETTE_VALIDATION_FAILED`, `SUBSTITUTE_VALIDATION_FAILED`, and `SOURCE_INPUT_CONFLICT`; finer layout or record errors remain attached as `cause`. Stable default messages exclude absolute paths, user or machine identity, and ExcelJS implementation details. Unknown failures map to `INTERNAL_ERROR` and exit non-zero.

Publication catches save the original failure before any state probe or cleanup. Every recovery operation is independently protected, and simultaneous primary, probe, and cleanup failures are retained together through `AggregateError` rather than replacing the primary failure. These errors are not exposed to customer Runtime.

Substitute relationships remain `reference_only`, physically `unverified`, and `applicationPolicy = "disabled"` after this remediation.
