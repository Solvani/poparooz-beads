# Poparooz Public Branding Contract

Status: **P1-A02.1 customer-visible branding authority**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Internal palette authority: [`POPAROOZ_MARD_PALETTE_CONTRACT.md`](POPAROOZ_MARD_PALETTE_CONTRACT.md)

## Public brand rule

Poparooz is the only customer-visible brand for the generator. Customer-facing
content may show the Poparooz store name, approved Poparooz trademarks,
Poparooz display color codes, ordinary English color names, and bead/material
information.

MARD and every other third-party reference-system name, logo, or icon are
prohibited from customer-visible content, including:

- web and mobile UI, accessibility labels, empty/loading states, errors,
  dialogs, toasts, and customer-copyable diagnostics;
- Shopify pages, product actions, SEO text, titles, descriptions, and page
  metadata;
- material summaries, Canvas labels, legends, PNG, customer CSV, file names,
  and downloaded content;
- analytics labels visible outside approved internal audit systems and public
  API or Shopify-message responses.

This rule does not rewrite provenance. Internal source records, supplier
mapping, license evidence, technical schemas, audit documents, and development
documentation retain the truthful reference-system name where required.

## Internal and public field boundary

| Internal field    | Meaning                                            | Customer-facing counterpart |
| ----------------- | -------------------------------------------------- | --------------------------- |
| `referenceSystem` | Internal source/reference system, currently `MARD` | Never exposed               |
| `referenceCode`   | Normalized internal source code                    | `displayCode`               |
| `referenceName`   | Optional source-provided color name                | `displayName`               |
| `referenceSeries` | Optional internal source series                    | Never exposed               |
| `sourceVersion`   | Internal provenance/version key                    | Never exposed directly      |
| `displayBrand`    | Palette-level public brand, exactly `Poparooz`     | Public `brand`              |
| `displayCode`     | Poparooz customer-visible code                     | Public `code`               |
| `displayName`     | Customer-visible ordinary English name             | Public `name`               |

`displayCode` may currently have the same value as `referenceCode`, but it is a
separate business field. Future Poparooz display-code changes must not alter
internal source mapping. No mapper automatically prefixes display fields with
a third-party reference-system name.

## Public Palette Model

The public presentation model is deliberately smaller than internal
`PaletteColor`:

```ts
interface PublicPaletteColor {
  brand: "Poparooz";
  code: string;
  name: string;
  hex: string;
  isSpecialFinish: boolean;
  finishType?: PaletteFinishType;
}
```

The runtime Public Schema is strict. It rejects unknown fields and any brand
other than `Poparooz`. Its code and name rules reject the internal reference
system name.

## Whitelist mapper

`toPublicPaletteColor` constructs a new object with an explicit whitelist:

```text
brand = "Poparooz"
code = color.displayCode
name = color.displayName
hex = color.hex
isSpecialFinish = color.isSpecialFinish
finishType = color.finishType when applicable
```

The mapper must never use object spread from an internal color. The public
result must not contain reference fields, source versions, supplier/audit
fields, product handles, Shopify variant IDs, or other internal commerce
mapping.

## API separation

The internal Domain API may be used by palette import, color matching,
provenance audits, version validation, and verified commerce mapping. Those
modules may access the complete internal `PaletteColor`.

The Public Presentation API is mandatory for customer UI, accessibility text,
materials displays, PNG legends, customer CSV, downloadable summaries,
Shopify presentation messages, SEO, metadata, and public/copyable responses.
Those consumers must never serialize or render an internal `PaletteColor`
directly.

The palette barrel exposes two explicit namespaces: `internalPalette` for
import/matching/audit work and `publicPalette` for customer presentation. Future
customer modules import `publicPalette`; fixtures are exported by neither
namespace.

## Leakage tests

The public mapper and schema tests must prove:

- public brand is always Poparooz;
- public code/name come only from `displayCode`/`displayName`;
- internal and display values may differ without leaking internal values;
- reference, provenance, supplier, and Shopify mapping fields are absent;
- serialized public color does not contain `MARD`;
- callers cannot override the public brand; and
- strict public parsing rejects internal or unknown fields.

A whole-bundle ban on the internal name is incorrect because internal matching
and provenance code must retain it. The acceptance boundary is the Public
Presentation Model and every customer-visible consumer.

## Future module requirements

Before acceptance, future UI, Canvas, PNG, CSV, Shopify, SEO, analytics, and
download tasks must demonstrate that they consume the public model and contain
no third-party brand names or icons in customer-visible output. Internal audit
and license records remain truthful and are not constrained by presentation
branding.
