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
