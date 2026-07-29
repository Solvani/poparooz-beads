# Poparooz Internal MARD Palette Contract

Status: **P1-A02.1 internal reference-data authority**

Contract version: **2**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Public presentation authority: [`POPAROOZ_PUBLIC_BRANDING_CONTRACT.md`](POPAROOZ_PUBLIC_BRANDING_CONTRACT.md)

Offline import authority: [`POPAROOZ_PALETTE_IMPORT_CONTRACT.md`](POPAROOZ_PALETTE_IMPORT_CONTRACT.md)

Runtime implementation: [`../src/domain/palette/`](../src/domain/palette/)

## Internal-only purpose

MARD is retained solely as the current internal color reference system for
source traceability, palette mapping, color-value audits, physical verification
records, compatibility checks, and later verified commerce mapping. It is not
the generator's customer-visible brand and must not be rendered, downloaded,
or serialized through the Public Presentation API.

P1-A02.1 defines structures and validation only. It does not establish a
complete MARD 221/291 palette, a Poparooz sellable range, Poparooz production
display codes, or verified physical colors.

## Data truth levels

`PaletteDefinition.sourceType` distinguishes:

- `reference`: software reference values without supplier/physical claims;
- `supplier`: data traceable to an approved supplier source but not thereby
  physically verified or confirmed as Poparooz inventory;
- `verified`: data that passed the documented verification process and
  therefore requires `verifiedAt`.

A file creation date is not verification. `verifiedAt` accepts an ISO 8601 date
or offset/Z datetime.

## PaletteDefinition

| Field             | Contract                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `id`              | Non-empty stable identifier.                                                                 |
| `referenceSystem` | Internal reference system, exactly `MARD`.                                                   |
| `displayBrand`    | Public/customer brand, exactly `Poparooz`. Customer layers read this, not `referenceSystem`. |
| `name`            | Non-empty palette display name without internal reference branding.                          |
| `version`         | Non-empty immutable palette/source version.                                                  |
| `colorCount`      | Non-negative integer equal to `colors.length`.                                               |
| `sourceType`      | `reference`, `supplier`, or `verified`.                                                      |
| `verifiedAt`      | Optional ISO date/datetime; required for `verified`.                                         |
| `colors`          | At least one valid `PaletteColor`; empty palettes are rejected.                              |

Each color's `referenceSystem` must match the palette and each `sourceVersion`
must equal palette `version`.

## PaletteColor field separation

| Field               | Contract                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `referenceSystem`   | Exactly `MARD`; internal only.                                                                                                     |
| `referenceCode`     | Required internal code; trimmed, uppercased, safely formatted, and unique per palette.                                             |
| `referenceName`     | Optional trimmed non-empty source name; internal only.                                                                             |
| `referenceSeries`   | Optional trimmed non-empty source series; internal only.                                                                           |
| `displayCode`       | Required Poparooz-facing code; trimmed, uppercased, safely formatted, free of internal reference branding, and unique per palette. |
| `displayName`       | Required trimmed ordinary English customer name, free of internal reference branding.                                              |
| `hex`               | Canonical uppercase `#RRGGBB` matching `rgb`.                                                                                      |
| `rgb`               | Three integer channels from 0 through 255.                                                                                         |
| `lab`               | Three finite values; L is 0 through 100, while a/b have no invented narrow range.                                                  |
| availability        | Required `isActive`, `isSellable`, and `isAutoMatchEnabled` flags.                                                                 |
| finish              | Required `isSpecialFinish`; `finishType` follows the rules below.                                                                  |
| commerce            | Optional `productHandle`, `variantId`, and positive-integer `packSize`; never fabricated or exposed publicly.                      |
| ordering/provenance | Non-negative `sortOrder`, required `sourceVersion`, optional `verifiedAt`.                                                         |

Removed fields `brand`, `code`, `name`, and `series` are not compatibility
aliases. Strict parsing rejects them. One field must never simultaneously mean
supplier name and customer display name.

## Dual uniqueness and normalization

`referenceCode` and `displayCode` are independently trimmed and uppercased.
Palette validation maintains separate uniqueness maps and reports whether a
conflict is the internal reference code or the Poparooz display code, including
the later field path and first occurrence.

The two values may be identical, but they remain separate fields so Poparooz
display codes may later change without breaking internal source mapping. No
normalizer adds the reference-system name to a public code or name.

## Automatic matching and finishes

Automatic matching requires all three flags:

```text
isAutoMatchEnabled === true
AND isActive === true
AND isSellable === true
```

P1-A06 enforces this eligibility through `preparePaletteCandidates` after reusing the strict `PaletteDefinitionSchema`. Empty palettes and nonempty palettes with no eligible colors are separate errors; matching never falls back to inactive, unsellable, manually excluded, or special-finish colors. A special finish participates only when `isAutoMatchEnabled` is explicitly true on an otherwise eligible schema-valid record. Candidate Lab comes from the validated `PaletteColor.lab` tuple and is never overwritten from HEX or RGB by the matcher.

Finish types are `transparent`, `glow`, `pearl`, `metallic`, `fluorescent`,
`glitter`, and `other`. A special finish requires a type; a plain color rejects
one. P1-A02 fixtures keep special finishes out of automatic matching.

## Public boundary

The internal model must pass through `toPublicPaletteColor` before use in
customer-visible contexts. The mapper fixes brand to Poparooz and copies only
display code/name, HEX, and applicable finish presentation fields. It never
spreads the internal object.

The public model excludes `referenceSystem`, `referenceCode`, `referenceName`,
`referenceSeries`, `sourceVersion`, supplier/audit fields, product handles, and
Shopify variant IDs. See the Public Branding Contract for all required
consumers and leakage tests.

## Fixture rules

P1-A02.1 fixtures use intentionally different `TEST-REF-*` internal codes and
`POP-TEST-*` display codes, plus obvious `TEST`, `FIXTURE`, or
`NOT-PRODUCTION` names. They are not exported from the production barrel and
are not real reference colors, Poparooz production codes, supplier data,
Shopify mappings, physical claims, or UI defaults.

## Production data entry conditions

Production data still requires an approved source and license, immutable
provenance, validated color values and finish classes, separately verified
Poparooz sellable/automatic-match scope, approved public display codes/names,
verified commerce mapping, and review evidence keeping reference, supplier,
physical, and public-brand claims distinct.

Until those conditions pass, neither internal reference values nor the test
display fields are production palette data.

Canonical CSV parsing, metadata envelopes, primitive conversions, file-row
errors, and the validation CLI are owned by the Palette Import Contract. The
Import Tool must call these Domain schemas and may not duplicate their rules.
