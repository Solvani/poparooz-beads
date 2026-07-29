# Poparooz Palette Import Contract

Status: **P1-A03 offline import authority**

Contract version: **1**

Authority: [`00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md`](00_POPAROOZ_GENERATOR_SOURCE_OF_TRUTH.md)

Internal Domain authority: [`POPAROOZ_MARD_PALETTE_CONTRACT.md`](POPAROOZ_MARD_PALETTE_CONTRACT.md)

Public presentation authority: [`POPAROOZ_PUBLIC_BRANDING_CONTRACT.md`](POPAROOZ_PUBLIC_BRANDING_CONTRACT.md)

## Responsibility boundary

The offline Import Tool reads CSV and metadata, converts text primitives,
tracks file rows, aggregates safe errors, and submits complete objects to the
existing strict Domain parsers. It does not implement a second palette Domain.

The Domain owns PaletteColor and PaletteDefinition validation, normalization,
color consistency, eligibility, finish, provenance, and uniqueness invariants.
It remains independent of files, command-line arguments, React, the DOM,
network access, and environment variables. The Public Mapper is unchanged.

## Canonical input files

Palette rows use the canonical header documented in
[`../data-source/schema/palette-columns.md`](../data-source/schema/palette-columns.md).
All 24 exact lowercase headers are required, may appear in any order, and may
not be duplicated. Unknown or differently cased headers are rejected.

Parsing uses `csv-parse` with BOM handling, RFC 4180 quoting, LF/CRLF support,
and completely empty-line skipping. A whitespace-only line is not silently
dropped. Simple comma splitting is prohibited.

Top-level metadata is a separate strict JSON/object envelope:

```json
{
  "id": "test-palette-not-production",
  "referenceSystem": "MARD",
  "displayBrand": "Poparooz",
  "name": "Synthetic Test Palette Not Production",
  "version": "test-v1",
  "sourceType": "reference",
  "verifiedAt": null
}
```

`colorCount` is never supplied; it is calculated from successfully parsed CSV
rows. `verifiedAt: null` becomes absent. A `verified` source still requires a
valid timestamp through the final PaletteDefinition Schema.

## Frozen conversions

- Required strings are trimmed and reject empty/whitespace-only values.
- Empty optional strings become `undefined`.
- Booleans accept only case-insensitive `true` and `false`; `yes/no` and `1/0`
  are rejected.
- RGB, pack size, and sort order use safe base-10 integers.
- Lab uses finite ordinary decimal notation.
- Empty numeric strings, scientific notation, `NaN`, and `Infinity` are
  rejected rather than coerced.
- Domain parsers perform final normalization and business validation.

## Error model

```ts
interface PaletteImportIssue {
  row?: number;
  column?: string;
  code: string;
  message: string;
  value?: unknown;
}
```

Supported codes include `CSV_PARSE_ERROR`, `MISSING_HEADER`,
`UNKNOWN_HEADER`, `DUPLICATE_HEADER`, `EMPTY_REQUIRED_FIELD`,
`INVALID_BOOLEAN`, `INVALID_NUMBER`, `DOMAIN_VALIDATION_ERROR`,
`DUPLICATE_REFERENCE_CODE`, `DUPLICATE_DISPLAY_CODE`, and
`METADATA_VALIDATION_ERROR`.

Header/metadata issues may omit `row`. Data errors report actual CSV file lines,
including the header offset. Zod paths map back to CSV columns. Duplicate code
issues identify the later row and the first conflicting row. All safely
discoverable issues are returned together; errors and CLI logs never reproduce
the complete CSV or unnecessary product/variant values.

## Successful output

A successful import returns the existing `PaletteDefinition`. Every color has
passed `PaletteColorSchema`; the complete object then passes
`PaletteDefinitionSchema`. Internal/reference and Poparooz display codes remain
independently normalized and unique. No runtime JSON artifact is written.

## Fixtures

Files under `data-source/fixtures/` are synthetic and unmistakably test-only.
They use `TEST-REF-*` internal codes and different `POP-TEST-*` display codes,
invented names, no real product handles/variant IDs, `sourceType: reference`,
and no verification timestamp. They are outside `src/` and never imported by
the browser application.

## Visual reference limitation

A 221-color visual chart may exist in project discussion as an unverified
visual reference. Visual reference charts are not valid production palette
sources. OCR, screenshot sampling, automatic code extraction, inferred
HEX/RGB, customer republication, and claims of physical verification are
prohibited.

Production source priority is:

1. official supplier CSV, Excel, or JSON;
2. official supplier structured HEX/RGB table;
3. an internally canonical CSV with manual verification and immutable version
   evidence.

Visual charts are manual comparison aids only. Excel support is not implemented
in P1-A03; a future approved converter must emit this canonical CSV boundary.

## CLI

```sh
npm run palette:validate -- --csv <path> --metadata <path>
```

Success prints the input path, computed color-row count, and pass status and
returns 0. Validation failure prints a bounded issue summary and returns 1.
Argument or file-reading failure returns 2. The command performs no writes,
network requests, arbitrary code execution, or production publication.

## Production entry conditions

Production palette import additionally requires authorized structured source
data, license/use evidence, immutable source/version records, reviewed
Poparooz display codes and ordinary English names, verified sellable and
automatic-match scope, physical verification evidence for `verified`, and
separate verified commerce mappings. Passing this tool proves structural
validity only; it does not prove supplier authority, physical accuracy,
inventory, or customer publication approval.
