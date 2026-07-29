# P1-A02 Domain Schema Review

Review date: **2026-07-29**

Result: **Accepted with follow-up**

Superseded field note: P1-A02.1 replaces the original ambiguous
`brand`/`code`/`name`/`series` PaletteColor fields with explicit internal
reference and Poparooz display fields. See
[`P1_A02_1_PUBLIC_BRANDING_BOUNDARY_REVIEW.md`](P1_A02_1_PUBLIC_BRANDING_BOUNDARY_REVIEW.md).

## Scope

P1-A02 adds framework-independent palette and board contracts, runtime parsing,
inferred TypeScript types, bounded test fixtures, unit tests, and the MARD
palette authority document. It does not add production palette/board data,
imports, color mathematics, image processing, Workers, Canvas, exports, UI,
iframe behavior, Shopify changes, or deployment.

## Runtime validation choice

Zod 4.4.3 is the only new production dependency. The npm registry reports no
Node engine or peer dependencies. Zod is independent of React and the DOM,
supports schema-derived TypeScript types, provides strict and safe parsing, and
works with the accepted Node 24, TypeScript 6, Vite 8, and Vitest 4 baseline.
The final npm audit covers 239 packages and reports zero known vulnerabilities.

The project does not implement a custom validation framework. Public parser
functions keep callers independent from schema internals, while schemas remain
available for later domain composition.

## Domain boundaries

| Path                                           | Responsibility                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `src/domain/palette/palette.schema.ts`         | PaletteColor and PaletteDefinition runtime rules and invariants    |
| `src/domain/palette/palette.types.ts`          | Types inferred from the runtime schemas                            |
| `src/domain/palette/palette.validation.ts`     | Strict and safe public parse functions                             |
| `src/domain/palette/palette.fixture.ts`        | Three unmistakable non-production test colors and one test palette |
| `src/domain/board/board-profile.schema.ts`     | BoardProfile runtime rules                                         |
| `src/domain/board/board-profile.types.ts`      | Schema-inferred BoardProfile type                                  |
| `src/domain/board/board-profile.validation.ts` | Strict and safe public parse functions                             |
| `src/domain/board/board-profile.fixture.ts`    | One unmistakable non-production board fixture                      |

Domain modules do not import React, DOM APIs, environment configuration, CSV,
or network code. Fixture modules are not re-exported from domain barrel files
and are excluded from the production TypeScript project.

## Invariants implemented

- MARD is the only accepted internal `referenceSystem`; Poparooz is the only
  accepted `displayBrand` and public brand.
- Internal `referenceCode` and public `displayCode` are separately trimmed,
  uppercased, safely formatted, and checked for uniqueness.
- HEX is canonical uppercase `#RRGGBB` and must equal the RGB tuple.
- RGB contains three integer channels from 0 through 255.
- Lab contains three finite values; L is 0 through 100 without invented narrow
  limits for a or b.
- Automatic matching requires both active and sellable status.
- Special finishes require an allowed finish type; plain colors reject it.
- Optional pack size is a positive integer; absent commerce values stay absent.
- Palette color count, both normalized code systems, reference-system
  consistency, source version, and verified provenance are checked with
  field/index-specific issues.
- Empty palettes are rejected.
- Board rows/columns are positive integers, bead size is positive and finite,
  and identifiers/names are non-empty.

## Fixture boundary

Palette fixture identifiers contain `FIXTURE` or `NOT-PRODUCTION`, use only
three synthetic colors with intentionally different `TEST-REF-*` and
`POP-TEST-*` codes, and set the special finish to automatic matching off.
The board fixture is named `Non-Production Test Fixture Board`. None represents
a real MARD code, complete 221/291 range, official board, Poparooz sellable
range, physical verification, Shopify mapping, or product default.

## Verification

The final check results are recorded in the task completion report. The domain
suite adds 31 tests; together with the P1-A01 suite, the repository has 5 test
files and 37 tests.

## Follow-up

- The machine PATH still does not expose Node/npm; checks use the bundled Node
  runtime and temporary npm runner.
- `origin/main` remains `[gone]`, and the available Git still lacks its HTTPS
  remote helper. Resolve remote access before the first push.
- Production MARD source, license/provenance, sellable subset, verified physical
  values, finish classifications, Shopify mappings, and board specifications
  remain unavailable and must not be invented.

## P1-A03 entry condition

P1-A03 may begin only after this commit is separately accepted. It must remain
limited to a clearly labeled MARD import fixture and import validation and must
not introduce a production palette or later image/color/Worker/Canvas/UI work.
