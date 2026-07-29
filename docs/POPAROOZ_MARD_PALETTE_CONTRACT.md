# Poparooz MARD Palette Contract

Status: **P1-A02 domain contract**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Runtime implementation: [`../src/domain/palette/`](../src/domain/palette/)

## Identity and authority

MARD is the color-reference system. MARD color codes remain canonical and
visible; Poparooz does not create replacement Poparooz color codes. This file
is the authority for MARD palette domain fields and validation rules. The
general data and algorithm contract links here instead of maintaining a second
copy of the complete field definition.

P1-A02 defines structures and validation only. It does not establish a complete
MARD 221 or 291 palette, claim that either range is sold by Poparooz, or verify
any physical color.

## Data truth levels

`PaletteDefinition.sourceType` distinguishes three evidence levels:

- `reference`: documented software reference values that are not supplier or
  physical-verification claims;
- `supplier`: data traceable to an approved supplier source, but not thereby a
  physical verification or Poparooz inventory claim;
- `verified`: data that passed the separately documented verification process
  and therefore requires `verifiedAt`.

A file creation date is not verification evidence. `verifiedAt` accepts an
ISO 8601 date or offset/Z datetime and remains absent when verification has not
occurred.

## PaletteDefinition

A palette contains:

| Field        | Contract                                                              |
| ------------ | --------------------------------------------------------------------- |
| `id`         | Non-empty stable identifier.                                          |
| `brand`      | Exactly `MARD`.                                                       |
| `name`       | Non-empty display name.                                               |
| `version`    | Non-empty immutable palette/source version.                           |
| `colorCount` | Non-negative integer equal to `colors.length`.                        |
| `sourceType` | `reference`, `supplier`, or `verified`.                               |
| `verifiedAt` | Optional ISO date/datetime; required when `sourceType` is `verified`. |
| `colors`     | At least one valid `PaletteColor`; empty palettes are rejected.       |

Every color must have the same `brand` as the palette, and every color's
`sourceVersion` must equal the palette `version`. A correction creates a new
version; a released version is not silently mutated.

## PaletteColor

A color contains:

| Field            | Contract                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`          | Exactly `MARD`.                                                                                                                                                                                           |
| `code`           | Required; trimmed, stored uppercase, and limited to letters, numbers, `.`, `_`, and `-` after a leading letter/number. This is a safe baseline, not a claim about the complete supplier numbering system. |
| `name`, `series` | Required non-whitespace strings; P1-A02 invents no production names.                                                                                                                                      |
| `hex`            | Canonical uppercase `#RRGGBB`; must describe the same channels as `rgb`.                                                                                                                                  |
| `rgb`            | Exactly three integer channels, each from 0 through 255.                                                                                                                                                  |
| `lab`            | Exactly three finite numbers. L is 0 through 100; a and b are finite but intentionally have no undocumented narrow range.                                                                                 |
| availability     | `isActive`, `isSellable`, and `isAutoMatchEnabled` are required booleans.                                                                                                                                 |
| finish           | `isSpecialFinish` is required; `finishType` follows the rules below.                                                                                                                                      |
| commerce         | `productHandle`, `variantId`, and `packSize` are optional and must never be fabricated. A present pack size is a positive integer.                                                                        |
| ordering         | `sortOrder` is a non-negative integer used for deterministic ordering.                                                                                                                                    |
| provenance       | `sourceVersion` is required; `verifiedAt` is optional unless required at palette level.                                                                                                                   |

Unknown object fields are rejected by strict parsing. Missing optional values
are represented by absence, not by invented empty commerce identifiers or zero
pack sizes.

## Uniqueness and normalization

Color codes are trimmed and converted to uppercase before storage and
comparison. A palette therefore treats `fixture-a`, `FIXTURE-A`, and
`Fixture-A` as the same code and reports the later color's exact path plus the
first occurrence. Uniqueness applies within one palette version.

HEX is also normalized to uppercase. Runtime validation checks HEX/RGB
consistency; neither representation may silently disagree with the other. Lab
values are validated, not calculated, in P1-A02.

## Automatic matching eligibility

The frozen invariant is:

```text
isAutoMatchEnabled === true
AND isActive === true
AND isSellable === true
```

A color with automatic matching enabled is rejected if it is inactive or not
sellable. These flags do not prove current Shopify inventory; they describe
validated palette eligibility after the underlying facts are established.

## Special finishes

Supported finish categories are `transparent`, `glow`, `pearl`, `metallic`,
`fluorescent`, `glitter`, and `other`.

A special-finish color requires `finishType`; a plain color must not carry one.
MVP-A test fixtures keep special finishes out of automatic matching. The schema
does not permanently prohibit a later, explicitly approved special-finish
matching policy.

## Shopify fields

`productHandle`, `variantId`, and `packSize` remain optional until verified
commerce mappings exist. P1-A02 includes no production handles, variant IDs,
pack sizes, inventory state, or Cart API behavior. Runtime parsing rejects
blank present identifiers and non-positive/non-integer pack sizes.

## Runtime parsing boundary

Zod schemas are the runtime source of truth, and TypeScript types are inferred
from those schemas. Public strict parsers throw a `ZodError`; public safe
parsers return a discriminated success/failure result. Issues include bounded
field/index paths and validation reasons and do not reproduce unrelated input
objects.

CSV or supplier-file reading is outside P1-A02. Later import code must call the
same public parsers rather than duplicate validation rules.

## Fixture rules

P1-A02 fixtures use names and codes containing `TEST`, `FIXTURE`, and
`NOT-PRODUCTION`. They exist only to exercise contracts and are not exported
from the domain barrel. They are not real MARD colors, a sellable Poparooz
range, supplier evidence, physical-color claims, or a production default.

A complete or near-complete 221/291 table is prohibited until the P1-A03 import
and provenance gate and the external data requirements below are satisfied.

## Production data entry conditions

Production palette data requires all of the following before acceptance:

1. an approved, traceable supplier or reference source and immutable source
   version;
2. documented license/use permission and retained notices;
3. validated codes, names, series, RGB/HEX/Lab values, uniqueness, and finish
   classification;
4. separately verified Poparooz sellable scope before `isSellable` is true;
5. separately approved automatic-match scope;
6. verified Shopify mappings before commerce fields are populated;
7. review evidence showing that reference, supplier, and physically verified
   claims are not conflated.

Until those conditions pass, the product may say **Reference color values** but
not **Exact physical color match** or **Verified Poparooz inventory**.
